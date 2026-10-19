"""POST /api/mod: the admin / mod-menu actions.

Each action is one small function `action(me, data)` that runs with the game lock held.
It returns None on success, or a reason string if the request was refused.
"""
import random
import time

from .. import state
from ..admins import is_admin
from ..config import CHARACTERS
from ..game import choose_round_map, end_round, here_players, note_death, start_intermission, start_round, start_select
from ..malice_store import pick_killer, set_malice


def _int_or(value, default):
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


# ---- round control -------------------------------------------------------------------------

def _kill_all(me, data):
    for pid, pl in state.players.items():
        if pid in state.round_players and pid != state.killer_id and pl.get("alive", True):
            pl["hp"] = 0
            pl["shield"] = 0
            pl["alive"] = False
            note_death(pl, time.time())
    print(f"!! mod {me['name']} killed everyone!!", flush=True)


def _kill_me(me, data):
    me["hp"] = 0
    me["shield"] = 0
    me["alive"] = False
    note_death(me, time.time())


def _heal_all(me, data):
    for pl in state.players.values():
        pl["hp"] = pl.get("maxhp", 100)


def _end_round(me, data):
    end_round(data.get("winner") or "survivors")


def _skip_wait(me, data):
    if state.phase == "lobby" and len(here_players()) >= 2:
        start_intermission()
    elif state.phase == "intermission" and len(here_players()) >= 2:
        choose_round_map()
        start_select()
    elif state.phase == "select" and len(here_players()) >= 2:
        if state.players.get(state.killer_id, {}).get("killer_char"):
            start_round()
        else:
            print("!! skip wait is waiting for the killer pick!!", flush=True)
    print("!! mod skipped the wait!!", flush=True)


def _force_start(me, data):
    if len(here_players()) < 2:
        return "need two active players!!"
    start_select(free=True)
    print("!! mod forced character select!!", flush=True)


def _make_killer(me, data):
    target = data.get("target")
    here = here_players()
    if target == "random":
        candidates = [pid for pid, pl in here.items() if pl.get("alive", True)]
        target = random.choice(candidates) if candidates else None
    if target not in here:
        return "bad target"
    set_malice(here[target]["fid"], 9999)
    if state.phase == "select" and len(here) >= 2:
        state.killer_id = pick_killer(here)
        for pl in here.values():
            pl["killer_char"] = None
    print(f"!! mod gave {here[target]['name']} 9999 malice!!", flush=True)


def _clear_traps(me, data):
    state.spikes.clear()
    state.bombs.clear()
    state.pending_bomb_refunds.clear()


# ---- messages ------------------------------------------------------------------------------

def _announce(me, data):
    text = str(data.get("text", ""))[:120].strip()
    if text:
        state.announces.append({"text": text, "by": me["name"], "at": time.time()})
        del state.announces[:-5]
        print(f"!! mod {me['name']} announced: {text}!!", flush=True)


# ---- malice --------------------------------------------------------------------------------

def _malice_target(me, target):
    """the player record a malice action points at ('me' or a player id), or None"""
    if target == "me":
        return me
    return state.players.get(target)


def _give_malice(me, data):
    amount = max(0, _int_or(data.get("amount", 0), 0))
    target = data.get("target")
    who = _malice_target(me, target)
    if who is None:
        return "bad target"
    set_malice(who["fid"], state.malice.get(who["fid"], 0) + amount)
    print(f"!! mod {me['name']} granted {amount} malice to {target}!!", flush=True)


def _set_malice(me, data):
    amount = max(0, _int_or(data.get("amount", 0), 0))
    target = data.get("target")
    who = _malice_target(me, target)
    if who is None:
        return "bad target"
    set_malice(who["fid"], amount)
    print(f"!! mod {me['name']} set malice for {target} to {amount}!!", flush=True)


# ---- health and characters -----------------------------------------------------------------

def _set_health(me, data):
    hp = max(0, min(1000, _int_or(data.get("hp", 100), 100)))
    targets = list(state.players.values()) if data.get("target") == "all" else [me]
    for pl in targets:
        if hp > pl.get("maxhp", 100):
            pl["maxhp"] = hp
        pl["hp"] = hp
        if hp > 0:
            pl["alive"] = True
    print(f"!! mod set hp to {hp}!!", flush=True)


def _set_time(me, data):
    secs = max(0, min(3600, _int_or(data.get("seconds", 0), 0)))
    with state.lock:
        if state.phase == "round":
            state.phase_end = time.time() + secs
            print(f"!! mod {me['name']} set round time to {secs}s!!", flush=True)
            h.send_json({"ok": True, "seconds": secs})
            return
    h.send_json({"ok": False, "reason": "not in a round!!"})


def _make_dev(me, data):
    for c in CHARACTERS:
        if c["id"] == data.get("char"):
            c["dev"] = True
            print(f"!! {c['id']} is dev now!!", flush=True)


def _make_public(me, data):
    for c in CHARACTERS:
        if c["id"] == data.get("char"):
            c["dev"] = False
            print(f"!! {c['id']} is public now!!", flush=True)


ACTIONS = {
    "killall": _kill_all,
    "killme": _kill_me,
    "healall": _heal_all,
    "endround": _end_round,
    "skipwait": _skip_wait,
    "forcestart": _force_start,
    "makekiller": _make_killer,
    "clearspikes": _clear_traps,
    "announce": _announce,
    "givemalice": _give_malice,
    "setmalice": _set_malice,
    "sethealth": _set_health,
    "settime": _set_time,
    "makedev": _make_dev,
    "unmakedev": _make_public,
}


def mod_action(h, data):
    """POST /api/mod"""
    with state.lock:
        me = state.players.get(data.get("id"))
        if not me or not is_admin(me):
            h.send_json({"ok": False, "reason": "mods only!!"})
            return
        action = ACTIONS.get(data.get("action"))
        if action is None:
            h.send_json({"ok": False, "reason": "huh?"})
            return
        refused = action(me, data)
        if refused:
            h.send_json({"ok": False, "reason": refused})
            return
        h.send_json({"ok": True})
