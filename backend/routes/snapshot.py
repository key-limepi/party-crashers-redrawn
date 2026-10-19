"""GET /api/players: the one big snapshot every client polls (phase, timers, players, traps, chat...)."""
import time
import urllib.parse

from .. import state
from ..config import CHARACTERS, GRACE_TIME, MAPS, STATE_KEYS, TIMEOUT
from ..game import update_rockets


def players_snapshot(h, url):
    """GET /api/players"""
    now = time.time()
    with state.lock:
        stale = [pid for pid, pl in state.players.items() if now - pl["last"] > TIMEOUT]
        for pid in stale:
            print(f"!! {state.players[pid]['name']} timed out", flush=True)
            del state.players[pid]
            state.last_hit.pop(pid, None)
        update_rockets(now)
        snapshot = {}
        for pid, pl in state.players.items():
            # safe keys
            d = {k: pl.get(k) for k in ("name", "hp", "alive", "away") + STATE_KEYS}
            d["in_round"] = state.phase == "round" and pid in state.round_players
            d["stun"] = round(max(0, pl.get("stun_until", 0) - now), 2)
            d["maxhp"] = pl.get("maxhp", 100) # true bars
            d["aura"] = pl.get("aura_tier", 0) # shard drain
            d["aura_hot"] = pl.get("aura_hot_until", 0) > now # healing others
            d["countered"] = bool(pl.pop("countered", False)) # once flag
            # fresh shoves
            _kb = pl.get("kb")
            if _kb and now - _kb.get("at", 0) < 0.5:
                d["kb"] = _kb
            else:
                if _kb:
                    pl.pop("kb", None)
                d["kb"] = None
            d["idle"] = round(now - pl.get("last", now), 1)
            d["shield"] = max(0, int(pl.get("shield", 0))) # blue bonus hp
            d["shield_hit"] = pl.get("shield_hit_at", 0) # last absorb sting
            d["char"] = pl.get("char")
            d["killer_char"] = pl.get("killer_char")
            d["malice"] = state.malice.get(pl["fid"], 0)
            d["paid"] = pl.get("paid")
            d["pay_msg"] = pl.get("pay_msg", "")
            snapshot[pid] = d
        taken = {pl.get("char") for pl in state.players.values() if pl.get("char")}
        active_ids = {pid for pid, pl in state.players.items()
                      if not pl.get("away", False) and now - pl.get("last", 0) < TIMEOUT}
        vote_counts = {m["id"]: 0 for m in MAPS}
        for pid, map_id in list(state.map_votes.items()):
            if pid not in active_ids or map_id not in vote_counts:
                state.map_votes.pop(pid, None)
            else:
                vote_counts[map_id] += 1
        sess = h.session()
        my_id = urllib.parse.parse_qs(url.query).get("id", [None])[0]
        my_player = state.players.get(my_id)
        my_vote = state.map_votes.get(my_id) if my_player and sess and my_player.get("sid") == sess.get("sid") else None
        h.send_json({
            "round": state.current_round,
            "map": state.round_map,
            "vote_options": list(vote_counts),
            "vote_counts": vote_counts,
            "my_vote": my_vote,
            "phase": state.phase,
            "time_left": max(0, int(state.phase_end - now)) if state.phase != "lobby" else 0,
            "grace": state.phase == "round" and now < state.round_start + GRACE_TIME,
            "killer_id": state.killer_id,
            "killer_name": state.players[state.killer_id]["name"] if state.killer_id in state.players else None,
            "notice": (f"EVIL {state.last_killer_name} left... round ending!!" if state.pending_end and state.phase == "round"
                       else ("LAST MAN STANDING!!" if state.lms_notice_until > now and state.phase == "round" else None)),
            "notice_left": (max(0, int(state.pending_end - now)) if state.pending_end and state.phase == "round"
                            else (max(0, int(state.lms_notice_until - now)) if state.lms_notice_until > now and state.phase == "round" else 0)),
            "result": state.result,
            "spikes": [dict(s, id=sid) for sid, s in state.spikes.items()],
            "bombs": [dict(s, id=bid) for bid, s in state.bombs.items()],
            "tosses": [dict(s) for s in state.bomb_tosses.values()],
            "rockets": [dict(r, age=round(now - r["at"], 2)) for r in state.rockets.values()],
            "blasts": [dict(b, age=round(now - b["at"], 2)) for b in state.blasts],
            "alerts": list(state.alerts),
            "hits": [{"seq": h["seq"], "a": h["a"], "v": h["v"], "dmg": h["dmg"], "stun": h["stun"],
                      "age": round(now - h["at"], 2)} for h in state.hits],
            "announces": [{"text": a["text"], "by": a.get("by", "?"), "age": round(now - a["at"], 2)} for a in state.announces],
            "chat": [dict(m) for m in state.chat_log],
            "chars": [dict(c, taken=c["id"] in taken) for c in CHARACTERS],
            "players": snapshot,
        })
    return
