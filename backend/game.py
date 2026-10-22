"""Round flow: phase transitions, rocket helpers and the game_tick thread loop."""
import random
import threading
import time

from . import state
from .admins import is_admin
from .config import (AURA_RADIUS, AURA_T1, AURA_T2, AURA_TICKS, BLAST_LIFE, CHARACTERS, CHAT_LIFE, GRACE_TIME, INTER_TIME, INTRO_TIME,
                     GRADE_CUTS, LMS_DURATIONS, MALICE_PER_ROUND, MAPS, OVERHEAL_BONUS, OVERHEAL_DRAIN, WIN_CUTSCENES,
                     ROCKET_LIFE, ROCKET_UP, ROUND_BASE, ROUND_COST, ROUND_MAX, ROUND_PER_PLAYER, SCORE_DMG, SCORE_HEAL,
                     SCORE_KILL, SCORE_SURV, SCORE_TAKEN, SELECT_TIME, TIMEOUT)
from .formbar import charge_player
from .malice_store import add_malice, pick_killer, set_malice


def alive_players():
    return {pid: pl for pid, pl in state.players.items()
            if pid in state.round_players and pl.get("alive", True) and pl.get("hp", 100) > 0}


def here_players():
    """Players who are not explicitly away and have not timed out."""
    now = time.time()
    return {pid: pl for pid, pl in state.players.items()
            if not pl.get("away", False) and now - pl.get("last", 0) < TIMEOUT}


def player_activity():
    """Compact AFK/timeout snapshot for round-transition logs."""
    now = time.time()
    return ", ".join(
        f"{pid}:{pl.get('name', '?')} away={bool(pl.get('away', False))} "
        f"idle={max(0, now - pl.get('last', now)):.1f}s"
        for pid, pl in state.players.items()
    ) or "none"


def enemies_of(pid):
    """alive round players on the other side, killer vs survivors"""
    evil = pid == state.killer_id
    return {p: pl for p, pl in alive_players().items() if (p == state.killer_id) != evil}


def scale_stun(duration):
    """Reduce stun duration as the round roster grows, with a 45% floor."""
    active_count = len(state.round_players.intersection(state.players))
    if active_count < 3:
        return duration
    return duration * max(0.45, 2 / active_count)


def is_rocketing(pid):
    """a nyan riding its own rocket can't be hurt"""
    return any(rk["by"] == pid for rk in state.rockets.values())


def update_rockets(now):
    """pick or swap who each rocket chases, drop stale ones"""
    rockets, blasts = state.rockets, state.blasts
    for rid in list(rockets):
        rk = rockets[rid]
        if rk["by"] not in state.players or state.phase != "round" or now - rk["at"] > ROCKET_LIFE:
            del rockets[rid]
            continue
        if now - rk["at"] >= ROCKET_UP:
            foes = enemies_of(rk["by"])
            if rk.get("target") not in foes:
                # nearest launch spot
                rk["target"] = min(foes, key=lambda p: (foes[p].get("x", 0) - rk["x"]) ** 2
                                   + (foes[p].get("y", 0) - rk["y"]) ** 2) if foes else None
    while blasts and now - blasts[0]["at"] > BLAST_LIFE:
        blasts.pop(0)


def flag_verify():
    # per-round join check
    from .config import DIGIPOGS_ON, ROUND_COST
    if not DIGIPOGS_ON or ROUND_COST <= 0:
        return
    for pl in here_players().values():
        sess = state.sessions.get(pl.get("sid"), {})
        if not sess.get("remember_pin") and not pl.pop("confirmed", False):
            pl["paid"] = False # verify pin first
            pl["pay_msg"] = "verify pin to join (15 digipogs)!!"


def start_intermission():
    # break once
    state.phase = "intermission"
    state.phase_end = time.time() + INTER_TIME
    state.map_votes.clear()
    flag_verify()
    print("[GAME] State: INTERMISSION (30s)", flush=True)


def start_select(free=False):
    # pick phase
    players = state.players
    here = here_players()
    if len(here) < 2:
        state.phase = "lobby"
        state.killer_id = None
        print("!! not enough active players - character select cancelled!!", flush=True)
        return
    for pl in players.values():
        pl["char"] = None # fresh picks
        pl["killer_char"] = None
        pl["paid"] = False
    for pid, pl in here.items():
        # awaiting formbar payment
        if ROUND_COST > 0 and not free:
            sess = state.sessions.get(pl.get("sid"), {})
            if sess.get("remember_pin") or pl.pop("confirmed", False):
                pl["paid"] = None # charging now
                pl["pay_msg"] = ""
                threading.Thread(target=charge_player, args=(pid,), daemon=True).start()
            else:
                pl["paid"] = False # verify pin first
                pl["pay_msg"] = "verify pin to join (15 digipogs)!!"
        else:
            pl["paid"] = True
            pl["pay_msg"] = ""
    state.killer_id = pick_killer(here)
    print(f"[GAME] preselected evil: {players[state.killer_id]['name']} "
          f"(malice {state.malice.get(players[state.killer_id]['fid'], 0)})", flush=True)
    state.phase = "select"
    state.phase_end = time.time() + SELECT_TIME
    print("[GAME] State: CHARACTER_SELECT (30s)", flush=True)


def note_death(pl, now):
    # first death stamp only
    if not pl.get("alive", True) and not pl.get("st_died"):
        pl["st_died"] = now


def start_round():
    players = state.players
    state.pending_end = 0
    state.lms_set = False
    state.lms_notice_until = 0.0
    # paid players only
    eligible = {pid: pl for pid, pl in here_players().items() if pl.get("paid")}
    if len(eligible) < 2:
        state.round_players.clear()
        state.killer_id = None
        state.phase = "lobby"
        print(f"!! not enough active players - round cancelled!! [{player_activity()}]", flush=True)
        return
    state.round_players = set(eligible)
    roster = ", ".join(f"{pid}:{pl.get('name', '?')}" for pid, pl in eligible.items())
    print(f"[ROUND] roster: {roster} | all players: {player_activity()}", flush=True)
    # random picks
    for pid, pl in eligible.items():
        survivor_ids = [c["id"] for c in CHARACTERS if not c.get("killer")]
        if pl.get("char") not in survivor_ids:
            pool = [c for c in CHARACTERS if not c.get("killer") and c["id"] != "nyan"
                    and (not c.get("dev") or is_admin(pl))]
            pl["char"] = random.choice(pool or CHARACTERS)["id"]
    for pl in eligible.values():
        pl["alive"] = True
        pl["hp"] = pl.get("maxhp", 100)
        pl["hp_ack"] = pl["hp"] # tab agrees at full
        pl["shield"] = 0 # no bonus carried in
        pl["shield_next"] = 0
        pl["over_cd"] = 0
        pl["st_dealt"] = 0 # fresh scores
        pl["st_taken"] = 0
        pl["st_healed"] = 0
        pl["st_kills"] = 0
        pl["st_died"] = 0
        pl["stun_until"] = 0
        pl["aura_tier"] = 0
        pl["aura_next"] = 0
        pl["aura_hot_until"] = 0
    state.spikes.clear()
    state.bombs.clear()
    state.icewalls.clear()
    state.noelle_slows.clear()
    del state.noelle_mists[:]
    state.pending_bomb_refunds.clear()
    state.rockets.clear()
    del state.blasts[:]
    del state.alerts[:]
    del state.hits[:]
    state.last_hit.clear()
    # find killer
    if state.killer_id not in state.round_players:
        state.killer_id = pick_killer({pid: players[pid] for pid in state.round_players})
        print(f"!! fallback - {players[state.killer_id]['name']} is EVIL LUX!!", flush=True)
    if not players[state.killer_id].get("killer_char"):
        players[state.killer_id]["killer_char"] = "evil"
    set_malice(players[state.killer_id]["fid"], 0) # killer starts over
    state.current_round += 1
    state.intro_len = min(ROUND_MAX, ROUND_BASE + ROUND_PER_PLAYER * len(state.round_players))
    state.phase = "intro"
    state.phase_end = time.time() + INTRO_TIME
    state.intro_start = time.time()
    state.result = None
    print(f"!! round {state.current_round} intro - {players[state.killer_id]['name']} is EVIL LUX!!", flush=True)


def begin_round():
    # intro over, fight
    state.round_start = time.time()
    state.phase_end = state.round_start + state.intro_len
    state.phase = "round"
    print(f"!! round {state.current_round} starts!!", flush=True)


def end_round(winner):
    players = state.players
    if state.phase != "round":
        return
    now = time.time()
    rnd = state.current_round
    kid = state.killer_id
    name = players.get(kid, {}).get("name", "???") if kid else "???"
    # save scores for malice
    for pid in list(state.round_players):
        pl = players.get(pid)
        if not pl:
            continue
    # killer win -> winscreen cinema
    kchar = players.get(kid, {}).get("killer_char") or "evil"
    if winner == "killer":
        state.result = {"winner": winner, "killer_name": name, "round": rnd,
                        "lms": bool(state.lms_set), "cutscene": WIN_CUTSCENES.get(kchar)}
        state.phase = "lms_cutscene"
        state.phase_end = time.time() + 30 # video length buffer
    else:
        # normal round end -> intermission
        state.result = {"winner": winner, "killer_name": name, "round": rnd, "lms": False}
        state.phase = "intermission"
        state.phase_end = time.time() + INTER_TIME
        flag_verify()
    state.current_round += 1 # fresh rounds
    for pl in players.values():
        pl["alive"] = True
        pl["hp"] = pl.get("maxhp", 100)
        pl["hp_ack"] = pl["hp"]
        pl["shield"] = 0
        pl["shield_next"] = 0
        pl["over_cd"] = 0
        pl["stun_until"] = 0
        pl["char"] = None
        pl["aura_tier"] = 0
        pl["aura_next"] = 0
        pl["aura_hot_until"] = 0
    state.spikes.clear()
    state.bombs.clear()
    state.icewalls.clear()
    state.noelle_slows.clear()
    del state.noelle_mists[:]
    state.pending_bomb_refunds.clear()
    state.rockets.clear()
    del state.blasts[:]
    del state.alerts[:]
    del state.hits[:]
    state.last_hit.clear()
    for pid in state.round_players:
        if pid in players and pid != kid:
            add_malice(players[pid]["fid"], MALICE_PER_ROUND)
    state.round_players.clear()
    state.cutscene_skip.clear() # fresh votes
    print(f"!! round {rnd} over - {winner} win!!", flush=True)


def grace_over(now):
    return now >= state.round_start + GRACE_TIME


# ---- tick pieces, locked

def _drop_timed_out(now):
    players = state.players
    for pid in [p for p in players if now - players[p]["last"] > TIMEOUT]:
        print(f"!! {players[pid]['name']} timed out", flush=True)
        del players[pid]
        state.last_hit.pop(pid, None)
        state.map_votes.pop(pid, None)


def _expire_lists(now):
    # spikes never rot now
    alerts, announces, chat_log = state.alerts, state.announces, state.chat_log
    while alerts and now - alerts[0]["at"] > 5:
        alerts.pop(0)
    while state.hits and now - state.hits[0]["at"] > 2.5:
        state.hits.pop(0)
    while announces and now - announces[0]["at"] > 8:
        announces.pop(0)
    while chat_log and now - chat_log[0]["at"] > CHAT_LIFE:
        chat_log.pop(0)
    if state.killer_id not in state.players:
        state.killer_id = None


def _expire_bombs(now):
    players, bombs, refunds = state.players, state.bombs, state.pending_bomb_refunds
    # expire bombs, refund fast
    for bid in list(bombs):
        bb = bombs[bid]
        if now - bb.get("at", now) > 24:
            del bombs[bid]
            owner = bb.get("owner")
            if owner and isinstance(owner, str):
                owner_player = players.get(owner)
                if owner_player and owner_player.get("char") == "tails" and not owner_player.get("evil"):
                    owner_player["bombs_left"] = min(5, owner_player.get("bombs_left", 5) + 1)
    # process pending bomb refunds
    for refund in list(refunds):
        if now >= refund["until"]:
            owner_player = players.get(refund["owner"])
            if owner_player and owner_player.get("char") == "tails" and not owner_player.get("evil"):
                owner_player["bombs_left"] = min(5, owner_player.get("bombs_left", 5) + 1)
            refunds.remove(refund)


def _expire_icewalls(now):
    # melt icewalls after 20s
    for iid in list(state.icewalls):
        iw = state.icewalls[iid]
        if iw.get("destroyed"):
            if now - iw.get("destroyed_at", now) > 5:
                del state.icewalls[iid]
            continue
        age = now - iw["at"]
        if age > 20:
            iw["destroyed"] = True
            iw["destroyed_by"] = "melt"
            iw["destroyed_at"] = now
        else:
            # hp drains toward melt
            iw["hp"] = min(iw["hp"], 60 * (1 - age / 20))


def _expire_noelle_slows(now):
    # fade killer slows
    for kid in list(state.noelle_slows):
        sl = state.noelle_slows[kid]
        if now > sl["fade_until"]:
            del state.noelle_slows[kid]
        elif now > sl["until"] and sl.get("active", True):
            sl["active"] = False  # slow effect ends, fade begins


def _tick_noelle_mists(now):
    # mist follows, slows killer
    kid = state.killer_id
    killer = state.players.get(kid)
    for m in list(state.noelle_mists):
        owner = state.players.get(m.get("owner"))
        if not owner or not owner.get("alive", True) or now - m["at"] > 10.0:
            state.noelle_mists.remove(m)
            continue
        if not killer or not killer.get("alive", True) or killer.get("hp", 100) <= 0:
            continue
        ox = owner.get("x", 0) + 14
        oy = owner.get("y", 0) + 30
        kx = killer.get("x", 0) + 14
        ky = killer.get("y", 0) + 30
        dx, dy = kx - ox, ky - oy
        if dx * dx + dy * dy < 200 * 200:
            state.noelle_slows[kid] = {
                "until": now + 3.0,
                "fade_until": now + 4.0,
                "active": True,
            }


def _tick_lux_aura(now):
    # conversion tick, round only
    if state.phase != "round":
        return
    t = now - state.round_start
    for pid, pl in state.players.items():
        if (pid not in state.round_players or not pl.get("alive", True)
                or pl.get("char") != "lux" or pid == state.killer_id):
            continue
        tier = 0 if t < AURA_T1 else (1 if t < AURA_T2 else 2)
        pl["aura_tier"] = tier
        amt, iv = AURA_TICKS[tier]
        if now >= pl.get("aura_next", 0):
            # only convert when hungry
            needy = False
            for qid, q in state.players.items():
                if qid == pid:
                    continue # never self
                if qid not in state.round_players or not q.get("alive", True):
                    continue
                if qid == state.killer_id:
                    continue
                dx = q.get("x", 0) - pl.get("x", 0)
                dy = q.get("y", 0) - pl.get("y", 0)
                if dx * dx + dy * dy > AURA_RADIUS * AURA_RADIUS:
                    continue
                if q.get("hp", 100) < q.get("maxhp", 100):
                    needy = True
                    break
            if not needy:
                continue
            pl["aura_next"] = now + iv
            for qid, q in state.players.items():
                if qid == pid:
                    continue # never self
                if qid not in state.round_players or not q.get("alive", True):
                    continue
                if qid == state.killer_id:
                    continue
                dx = q.get("x", 0) - pl.get("x", 0)
                dy = q.get("y", 0) - pl.get("y", 0)
                if dx * dx + dy * dy > AURA_RADIUS * AURA_RADIUS:
                    continue
                if q.get("hp", 100) < q.get("maxhp", 100):
                    before = q.get("hp", 100)
                    q["hp"] = min(q.get("maxhp", 100), before + int(amt * q.get("healmult", 1.0)))
                    pl["st_healed"] = pl.get("st_healed", 0) + (q["hp"] - before) # applied only
                    if qid != pid:
                        pl["aura_hot_until"] = now + iv # healing others


def _tick_shields(now):
    # shield drains, dead keep none
    for pid, pl in state.players.items():
        if not pl.get("alive", True) or pid not in state.round_players:
            if pl.get("shield", 0):
                pl["shield"] = 0
            continue
        if pl.get("shield", 0) > 0 and now >= pl.get("shield_next", 0):
            pl["shield"] = max(0, pl["shield"] - max(1, int(round(OVERHEAL_DRAIN * 0.5))))
            pl["shield_next"] = now + 0.5


def _tick_lobby(now):
    # need players
    if len(here_players()) >= 2:
        start_intermission()


def _tick_intermission(now):
    # long break
    if len(here_players()) < 2:
        state.phase = "lobby"
        state.killer_id = None
        print("!! not enough players - back to lobby!!", flush=True)
    elif now >= state.phase_end:
        if len(here_players()) >= 2:
            choose_round_map()
            start_select()
        else:
            state.phase = "lobby"
            state.killer_id = None


def choose_round_map():
    pool = [m["id"] for m in MAPS]
    counts = {map_id: 0 for map_id in pool}
    active = here_players()
    for pid, map_id in list(state.map_votes.items()):
        if pid not in active or map_id not in counts:
            state.map_votes.pop(pid, None)
        else:
            counts[map_id] += 1
    high = max(counts.values(), default=0)
    winners = [map_id for map_id, count in counts.items() if count == high]
    state.round_map = random.choice(winners) if high else random.choice(pool)
    state.map_votes.clear()
    print(f"[ROUND] map vote: {state.round_map} {counts}", flush=True)


def _tick_select(now):
    # pick phase
    here = here_players()
    if len(here) < 2:
        state.phase = "lobby"
        state.killer_id = None
        print("!! not enough players - back to lobby!!", flush=True)
    elif (all(pl.get("char") for pid, pl in here.items()
              if pid != state.killer_id and pl.get("paid") is not False)
          and state.players.get(state.killer_id, {}).get("killer_char")
          and not any(pl.get("paid") is None for pl in here.values())):
        # quick start
        print("[GAME] everyone picked - starting early!!", flush=True)
        start_round()
    elif now >= state.phase_end:
        typists = [pid for pid, pl in here.items()
                   if not pl.get("paid") and pl.get("typing_pin_until", 0) > now]
        if typists and len(here_players()) >= 2:
            state.phase_end = now + 5 # hold for typists
            print(f"!! holding select, pin typing: {len(typists)}!!", flush=True)
        elif len(here_players()) >= 2:
            start_round()
        else:
            state.phase = "lobby"
            state.killer_id = None


def _tick_lms_cutscene(now):
    # evil cinema, then break
    if len(here_players()) < 2:
        state.phase = "lobby"
        state.killer_id = None
        state.cutscene_skip.clear()
        print("!! not enough players - back to lobby!!", flush=True)
    elif now >= state.phase_end:
        state.killer_id = None # drop evil
        state.cutscene_skip.clear()
        state.phase = "intermission"
        state.phase_end = now + INTER_TIME
        state.map_votes.clear()
        flag_verify()
        print("[GAME] State: INTERMISSION (30s)", flush=True)


def _tick_intro(now):
    # killer intro video
    if len(state.round_players.intersection(state.players)) < 2:
        for pl in state.players.values():
            pl["alive"] = True
            pl["hp"] = pl.get("maxhp", 100)
            pl["hp_ack"] = pl["hp"] # tab agrees at full
            pl["shield"] = 0
            pl["shield_next"] = 0
            pl["over_cd"] = 0
        state.killer_id = None
        state.round_players.clear()
        state.phase = "lobby"
        print("!! not enough players - back to lobby!!", flush=True)
    elif now >= state.phase_end:
        begin_round()


def _tick_round(now):
    players = state.players
    if len(state.round_players.intersection(players)) < 2:
        for pl in players.values():
            pl["alive"] = True
            pl["hp"] = pl.get("maxhp", 100)
            pl["hp_ack"] = pl["hp"] # tab agrees at full
            pl["shield"] = 0
            pl["shield_next"] = 0
            pl["over_cd"] = 0
        state.killer_id = None
        state.round_players.clear()
        state.phase = "lobby"
        print("!! not enough players - back to lobby!!", flush=True)
    else:
        k = players.get(state.killer_id)
        # gone killer
        if k is not None and now - k.get("last", 0) > 10:
            print(f"!! {k.get('name', 'EVIL')} went stale... round ending!!", flush=True)
            k = None
        if k is not None:
            state.pending_end = 0
            state.last_killer_name = k.get("name", "EVIL")
        if k is None:
            # warn first
            if not state.pending_end:
                state.pending_end = now + 5
                print(f"!! {state.last_killer_name} left... round ending!!", flush=True)
            if now >= state.pending_end:
                state.pending_end = 0
                end_round("survivors")
        elif not k.get("alive", True) or k.get("hp", 100) <= 0:
            end_round("survivors") # killer died
        elif now >= state.phase_end:
            end_round("survivors") # slow survivors
        else:
            alive = alive_players()
            survs = [pid for pid in alive if pid != state.killer_id]
            if not survs:
                end_round("killer") # all dead
            else:
                if len(survs) == 1 and not state.lms_set:
                    # death duel
                    state.lms_set = True
                    if survs[0] in players:
                        players[survs[0]]["over_cd"] = 0.0 # patch cooldown resets with the LMS buffs
                    _lc = players.get(survs[0], {}).get("char")
                    state.phase_end = now + LMS_DURATIONS.get(_lc, 105.117)
                    state.lms_notice_until = now + 5
                    print(f"!! LMS ({_lc} vs evil) - fight!!", flush=True)
            # manual swings


PHASE_TICKS = {
    "lobby": _tick_lobby,
    "intermission": _tick_intermission,
    "select": _tick_select,
    "intro": _tick_intro,
    "round": _tick_round,
    "lms_cutscene": _tick_lms_cutscene,
}


def game_tick():
    """round timers"""
    while True:
        time.sleep(0.5)
        try:
            with state.lock:
                now = time.time()
                _drop_timed_out(now)
                _expire_lists(now)
                _expire_bombs(now)
                _expire_icewalls(now)
                _expire_noelle_slows(now)
                _tick_noelle_mists(now)
                _tick_shields(now)
                _tick_lux_aura(now)
                handler = PHASE_TICKS.get(state.phase)
                if handler:
                    handler(now)
        except Exception as err: # catch all
            print(f"!! tick oops: {err}", flush=True)
