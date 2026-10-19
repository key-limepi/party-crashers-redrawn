"""generated from the old do_POST; module: players"""

import secrets
import time

from .. import state
from ..admins import is_admin
from ..config import DIGIPOGS_ON, FORMBAR_MODE, OVERHEAL_BONUS, OVERHEAL_CD, OVERHEAL_RADIUS, STATE_KEYS
from ..game import note_death


def join(h, data):
    """POST /api/join"""
    sess = h.session()
    if not sess:
        h.send_json({"error": "log in with formbar!!", "login": True}, 401)
        return
    if DIGIPOGS_ON and not sess.get("pin"):
        h.send_json({"error": "enter your digipog pin!!", "pin": True}, 401)
        return
    with state.lock:
        pid = secrets.token_hex(4)
        # fid identity, mods/mutes follow
        fid = sess["fid"]
        tab = str(data.get("tab") or "")[:16]
        name = sess["name"]
        if FORMBAR_MODE:
            # one tab per account
            for pl in state.players.values():
                if pl.get("fid") == fid and pl.get("tab") != tab and time.time() - pl.get("last", 0) <= 10:
                    h.send_json({"error": "already online in another tab!!"}, 403)
                    return
            for _old in [p for p, pl in state.players.items() if pl.get("fid") == fid]:
                if state.killer_id == _old:
                    state.killer_id = pid
                del state.players[_old]
                state.map_votes.pop(_old, None)
        else:
            # local tabs are players
            fid = f"{fid}:{tab}"
            name = str(data.get("name") or "").strip()[:20] or f"guest {tab[:3]}"
            taken = {pl["name"] for pl in state.players.values()}
            base, n = name, 1
            while name in taken:
                n += 1
                name = f"{base} {n}"
        state.players[pid] = {
            "fid": fid,
            "sid": sess["sid"],
            "tab": tab,
            "char": None, # pick spot
            "maxhp": 100, # told maxhp
            "name": name,
            "paid": False,
            "pay_msg": "",
            "x": 60, "y": 100, "facing": 1,
            "hp": 100, "moving": False, "onGround": False,
            "alive": True, "invis": False, "m1": True,
            "stunned": False, "pull": False, "away": False, "cower": False,
            "windup": False, "pose": None, "dashing": False, "stun_until": 0,
            "hp_ack": 100, # last hp it told us
            "shield": 0, # blue bonus hp
            "shield_next": 0.0, # drain tick
            "over_cd": 0.0, # overheal wait
            "last": time.time(),
        }
    print(f"!! {state.players[pid]['name']} joined ({pid})", flush=True)
    h.send_json({"id": pid, "fid": fid, "name": state.players[pid]["name"],
                     "mod": is_admin(state.players[pid]),
                     "muted": max(0, int(state.muted_fids.get(fid, 0) - time.time()))})
    return


def state_post(h, data):
    """POST /api/state"""
    with state.lock:
        pl = state.players.get(data.get("id"))
        if pl:
            for key in STATE_KEYS:
                if key in data:
                    pl[key] = data[key]
            # anim is just a short name, keep it small
            if not isinstance(pl.get("anim"), str):
                pl["anim"] = None
            elif len(pl["anim"]) > 12:
                pl["anim"] = pl["anim"][:12]
            try:
                pl["m1v"] = max(0, min(5, int(pl.get("m1v", 0))))
            except (ValueError, TypeError):
                pl["m1v"] = 0
            try:
                pl["dtmult"] = max(0.1, min(3.0, float(data.get("dtmult", 1.0))))
            except (ValueError, TypeError):
                pl["dtmult"] = 1.0
            try:
                pl["healmult"] = max(0.1, min(3.0, float(data.get("healmult", 1.0))))
            except (ValueError, TypeError):
                pl["healmult"] = 1.0
            # fresh posts
            if data.get("r") == state.current_round:
                try:
                    maxhp = int(data.get("maxhp", 0)) or 100
                    maxhp = max(1, min(1000, maxhp))
                except (ValueError, TypeError):
                    maxhp = 100
                old_max = pl.get("maxhp", 100)
                pl["maxhp"] = maxhp
                if "hp" in data:
                    try:
                        posted = int(data.get("hp"))
                    except (ValueError, TypeError):
                        posted = None
                    if posted is not None:
                        if maxhp > old_max:
                            # fresh hp
                            pl["hp"] = max(0, min(maxhp, posted))
                        else:
                            # stale posts never undo heal
                            acked = pl.get("hp_ack", pl["hp"])
                            if posted < min(pl["hp"], acked):
                                # tab-only hits eat shield first
                                delta = min(pl["hp"], acked) - posted
                                take = min(pl.get("shield", 0), delta)
                                pl["shield"] = pl.get("shield", 0) - take
                                pl["hp"] = max(0, posted + take)
                                pl["st_taken"] = pl.get("st_taken", 0) + delta # no farmer
                                if take > 0:
                                    pl["shield_hit_at"] = time.time() # sting mark
                        # what the tab still believes
                        pl["hp_ack"] = min(posted, pl["hp"])
                if "alive" in data:
                    pl["alive"] = bool(data["alive"])
                    if not pl["alive"]:
                        pl["shield"] = 0 # death clears bonus
                        note_death(pl, time.time())
            pl["last"] = time.time()
    h.send_json({"ok": True})
    return


def afk(h, data):
    """POST /api/afk"""
    with state.lock:
        pl = state.players.get(data.get("id"))
        if pl:
            was_away = bool(pl.get("away", False))
            pl["away"] = bool(data.get("away", False))
            pl["last"] = time.time()
            if was_away != pl["away"]:
                print(f"[AFK] {pl['name']} ({data.get('id')}) {was_away} -> {pl['away']}", flush=True)
    h.send_json({"ok": bool(pl)})
    return


def leave(h, data):
    """POST /api/leave"""
    pid = data.get("id")
    with state.lock:
        gone = state.players.pop(pid, None)
        state.last_hit.pop(pid, None)
        state.map_votes.pop(pid, None)
    if gone:
        print(f"!! {gone['name']} left", flush=True)
    h.send_json({"ok": True})
    return


def heal(h, data):
    """POST /api/heal"""
    # heals rise
    with state.lock:
        pl = state.players.get(data.get("id"))
        if pl and pl.get("alive", True):
            try:
                amount = max(0, int(data.get("amount", 0)))
            except (ValueError, TypeError):
                amount = 0
            try:
                cap = max(1, int(data.get("max", 100)))
            except (ValueError, TypeError):
                cap = 100
            pl["hp"] = max(0, min(cap, pl.get("hp", 100) + int(amount * pl.get("healmult", 1.0))))
            pl["last"] = time.time()
            h.send_json({"ok": True, "hp": pl["hp"]})
        else:
            h.send_json({"ok": False})
    return


def overheal(h, data):
    """POST /api/overheal"""
    # lux grants ally shield
    now = time.time()
    with state.lock:
        me = state.players.get(data.get("id"))
        if not (me and state.phase == "round" and me.get("alive", True)
                and me.get("char") == "lux" and data.get("id") != state.killer_id
                and data.get("id") in state.round_players):
            h.send_json({"ok": False, "reason": "nope!!"})
            return
        if now - me.get("over_cd", 0) < OVERHEAL_CD:
            h.send_json({"ok": False, "reason": "not ready!!"})
            return
        
        # lux self shield bonus
        target_id = data.get("target")
        if state.lms_set and target_id == me["id"]:
            me["shield"] = me.get("shield", 0) + 25
            me["shield_next"] = now + 0.5
            me["over_cd"] = now
            me["st_healed"] = me.get("st_healed", 0) + 25
            print(f"!! {me['name']} LMS self-overhealed +25 shield!!", flush=True)
            h.send_json({"ok": True, "target": me["id"], "name": me["name"], "shield": me["shield"], "lms_self": True})
            return
        
        # neediest ally first, full last
        best, best_need, best_d2 = None, 0, 0
        for pid, pl in state.players.items():
            if pid == data.get("id") or pid not in state.round_players:
                continue
            if not pl.get("alive", True) or pid == state.killer_id:
                continue
            dx = pl.get("x", 0) - me.get("x", 0)
            dy = pl.get("y", 0) - me.get("y", 0)
            d2 = dx * dx + dy * dy
            if d2 > OVERHEAL_RADIUS * OVERHEAL_RADIUS:
                continue
            need = pl.get("maxhp", 100) + OVERHEAL_BONUS - pl.get("hp", 100) - pl.get("shield", 0)
            if need <= 0:
                continue
            if best is None or need > best_need or (need == best_need and d2 < best_d2):
                best, best_need, best_d2 = pid, need, d2
        if best is None:
            h.send_json({"ok": False, "reason": "nobody around!!"})
            return
        me["over_cd"] = now # only wins cost cooldown
        tgt = state.players[best]
        gave = OVERHEAL_BONUS - tgt.get("shield", 0) # applied only
        tgt["shield"] = OVERHEAL_BONUS # topped up blue hp
        tgt["shield_next"] = now + 0.5
        me["st_healed"] = me.get("st_healed", 0) + max(0, gave)
        print(f"!! {me['name']} overhealed {tgt['name']}!!", flush=True)
        h.send_json({"ok": True, "target": best, "name": tgt["name"], "shield": tgt["shield"]})
    return

