"""generated from the old do_POST; module: players"""

import secrets
import time
import math

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
            "fireball": None,
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
            if "fireball" in data:
                fb = data.get("fireball")
                if isinstance(fb, dict) and pl.get("char") == "mario" and state.phase == "round":
                    try:
                        x, y = float(fb["x"]), float(fb["y"])
                        vx, vy = float(fb["vx"]), float(fb["vy"])
                        if all(math.isfinite(v) and abs(v) <= 10000 for v in (x, y, vx, vy)):
                            pl["fireball"] = {
                                "id": str(fb.get("id", ""))[:32],
                                "x": round(x, 1), "y": round(y, 1),
                                "vx": round(vx, 1), "vy": round(vy, 1),
                            }
                        else:
                            pl["fireball"] = None
                    except (KeyError, TypeError, ValueError):
                        pl["fireball"] = None
                else:
                    pl["fireball"] = None
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
        prayer = data.get("prayer")
        cd_mult = 1.5 if prayer == "haste" else 0.7 if prayer == "burden" else 1.0
        if state.lms_set:
            cd_mult *= 0.6
        requested_cooldown = OVERHEAL_CD * cd_mult
        cooldown = me.get("over_cd_duration", requested_cooldown)
        remaining = cooldown - (now - me.get("over_cd", 0))
        if remaining > 0:
            h.send_json({"ok": False, "reason": "not ready!!", "cooldown": remaining})
            return
        
        # lux self shield bonus
        if state.lms_set:
            me["shield"] = me.get("shield", 0) + 25
            me["shield_next"] = now + 0.5
            me["over_cd"] = now
            me["over_cd_duration"] = requested_cooldown
            me["st_healed"] = me.get("st_healed", 0) + 25
            print(f"!! {me['name']} LMS self-overhealed +25 shield!!", flush=True)
            h.send_json({"ok": True, "target": me["id"], "name": me["name"], "shield": me["shield"], "self_shield": me["shield"], "lms_self": True})
            return
        
        # Lux always gains 25 shield; share the 50 point Patch bonus evenly
        # across nearby survivors who can still receive shield.
        nearby = []
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
            capacity = max(0, OVERHEAL_BONUS - pl.get("shield", 0))
            if capacity <= 0:
                continue
            nearby.append((pid, pl, capacity))

        me["over_cd"] = now # only wins cost cooldown
        me["over_cd_duration"] = requested_cooldown
        me["shield"] = me.get("shield", 0) + 25
        me["shield_next"] = now + 0.5
        targets = {}
        remaining = OVERHEAL_BONUS
        active = nearby[:]
        # Water-fill the bonus so capped survivors' unused share is redistributed.
        while remaining > 0 and active:
            base, extra = divmod(remaining, len(active))
            applied_total = 0
            next_active = []
            for index, (pid, pl, capacity) in enumerate(active):
                share = base + (1 if index < extra else 0)
                applied = min(capacity, share, remaining - applied_total)
                if applied > 0:
                    pl["shield"] = pl.get("shield", 0) + applied
                    pl["shield_next"] = now + 0.5
                    applied_total += applied
                    if pid in targets:
                        targets[pid]["shield"] = pl["shield"]
                        targets[pid]["given"] += applied
                    else:
                        targets[pid] = {"id": pid, "name": pl["name"], "shield": pl["shield"], "given": applied}
                if capacity > applied:
                    next_active.append((pid, pl, capacity - applied))
            if applied_total == 0:
                break
            remaining -= applied_total
            active = next_active

        target_list = list(targets.values())
        gave = sum(target["given"] for target in target_list)
        me["st_healed"] = me.get("st_healed", 0) + 25 + gave
        names = ", ".join(target["name"] for target in target_list)
        print(f"!! {me['name']} patched {names or 'themself'} (+{gave} shared shield)!!", flush=True)
        response = {
            "ok": True,
            "target": target_list[0]["id"] if target_list else me["id"],
            "name": names or me["name"],
            "targets": target_list,
            "shield": target_list[0]["shield"] if target_list else me["shield"],
            "self_shield": me["shield"],
        }
        if not target_list:
            response["self_only"] = True
        h.send_json(response)
    return

