"""generated from the old do_POST; module: traps"""

import time

from .. import state
from ..admins import is_admin
from ..config import ROCKET_DMG, ROCKET_GAP, ROCKET_RADIUS, ROCKET_UP, SPIKE_MAX
from ..game import enemies_of, grace_over, is_rocketing, note_death, scale_stun


def spike(h, data):
    """POST /api/spike"""
    # trap or trip
    with state.lock:
        me = state.players.get(data.get("id"))
        if data.get("action") == "place" and me and data.get("id") == state.killer_id:
            try:
                x, y = float(data.get("x", 0)), float(data.get("y", 0))
            except (ValueError, TypeError):
                h.send_json({"ok": False, "reason": "bad spot"})
                return

            while len(state.spikes) >= SPIKE_MAX:
                oldest = min(state.spikes, key=lambda s: state.spikes[s]["at"])
                del state.spikes[oldest]
            state.spike_seq += 1
            sid = f"s{state.spike_seq}"
            state.spikes[sid] = {"x": x, "y": y, "by": me["name"], "at": time.time()}
            h.send_json({"ok": True, "spike": dict(state.spikes[sid], id=sid)})
            return
        if data.get("action") == "trip" and data.get("spike") in state.spikes:
            sp = state.spikes.pop(data["spike"])
            state.alerts.append({"x": sp["x"], "y": sp["y"], "at": time.time()})
            print(f"!! {me['name'] if me else '???'} tripped a spike!!", flush=True)
            h.send_json({"ok": True})
            return
    h.send_json({"ok": False})
    return


def bomb(h, data):
    """POST /api/bomb"""
    # tails traps, airborne throws
    with state.lock:
        me = state.players.get(data.get("id"))
        if (data.get("action") == "throw" and me and state.phase == "round"
                and me.get("char") == "tails" and not me.get("evil")):
            try:
                x, y = float(data.get("x", 0)), float(data.get("y", 0))
                vx, vy = float(data.get("vx", 0)), float(data.get("vy", 0))
            except (ValueError, TypeError):
                h.send_json({"ok": False, "reason": "bad throw"})
                return
            if not (x == x and y == y and vx == vx and vy == vy):
                h.send_json({"ok": False, "reason": "bad throw"})
                return
            # nerfed toss, short lob only
            vx = max(-600, min(600, vx))
            vy = max(-400, min(200, vy))
            while len(state.bomb_tosses) >= 50:
                oldest = min(state.bomb_tosses, key=lambda s: state.bomb_tosses[s]["at"])
                del state.bomb_tosses[oldest]
            state.bomb_toss_seq += 1
            tid = f"t{state.bomb_toss_seq}"
            toss = {"id": tid, "x": x, "y": y, "vx": vx, "vy": vy,
                    "by": me["name"], "owner": data.get("id"), "at": time.time()}
            state.bomb_tosses[tid] = toss
            h.send_json({"ok": True, "toss": toss})
            return
        if (data.get("action") == "place" and me and state.phase == "round"
                and me.get("char") == "tails" and not me.get("evil")):
            try:
                x, y = float(data.get("x", 0)), float(data.get("y", 0))
            except (ValueError, TypeError):
                h.send_json({"ok": False, "reason": "bad spot"})
                return
            # off the map
            if x < -400 or x > 3300 or y < -2000 or y > 2600:
                h.send_json({"ok": False, "reason": "bad spot"})
                return
            # bombs need elbow room
            for ob in state.bombs.values():
                if (x - ob["x"]) ** 2 + (y - ob["y"]) ** 2 < 100 ** 2:
                    h.send_json({"ok": False, "reason": "too close!!"})
                    return
            # bomb limit, must trigger
            if len(state.bombs) >= 5:
                h.send_json({"ok": False, "reason": "bomb limit reached!!"})
                return
            state.bomb_seq += 1
            bid = f"b{state.bomb_seq}"
            state.bombs[bid] = {"x": x, "y": y, "by": me["name"], "owner": data.get("id"), "at": time.time()}
            h.send_json({"ok": True, "bomb": dict(state.bombs[bid], id=bid)})
            return
        if data.get("action") == "airburst" and me and state.phase == "round" \
                and me.get("char") == "tails" and not me.get("evil"):
            try:
                x, y = float(data.get("x", 0)), float(data.get("y", 0))
            except (ValueError, TypeError):
                h.send_json({"ok": False, "reason": "bad burst"})
                return
            now = time.time()
            k = state.players.get(state.killer_id)
            if k and k.get("alive", True) and k.get("hp", 250) > 0 \
                    and (x - k.get("x", 0)) ** 2 + (y - k.get("y", 0)) ** 2 < 150 ** 2 \
                    and grace_over(now):
                for tid in [t for t, o in state.bomb_tosses.items()
                            if (x - o["x"]) ** 2 + (y - o["y"]) ** 2 < 200 ** 2]:
                    del state.bomb_tosses[tid]
                bomb_damage = 30 if state.lms_set else 10
                k["hp"] = max(0, k.get("hp", 250) - bomb_damage)
                k["stun_until"] = max(k.get("stun_until", 0), now + scale_stun(2.5))
                _dx = k.get("x", 0) - x
                _dy = k.get("y", 0) - y
                _dist = (_dx * _dx + _dy * _dy) ** 0.5 or 1
                k["kb"] = {"x": _dx / _dist, "y": _dy / _dist, "at": now, "s": 2}
                if k["hp"] <= 0:
                    k["alive"] = False
                print(f"!! {k['name']} ate a midair bomb!!", flush=True)
                h.send_json({"ok": True})
                return
            h.send_json({"ok": False, "reason": "no hit"})
            return
        if data.get("action") == "trip" and data.get("bomb") in state.bombs:
            bb = state.bombs.pop(data["bomb"])
            now = time.time()
            if data.get("id") == state.killer_id and me:
                bomb_damage = 30 if state.lms_set else 10
                before = me.get("hp", 250)
                me["hp"] = max(0, before - bomb_damage)
                landed = min(bomb_damage, before) # applied only
                me["st_taken"] = me.get("st_taken", 0) + landed
                owner = state.players.get(bb.get("owner"))
                if owner:
                    owner["st_dealt"] = owner.get("st_dealt", 0) + landed
                if me["hp"] <= 0:
                    me["alive"] = False
                    if owner:
                        owner["st_kills"] = owner.get("st_kills", 0) + 1
                    note_death(me, now)
                print(f"!! {me['name']} ate a ground bomb for {landed} damage and was slowed!!", flush=True)
            owner = bb.get("owner")
            if owner and isinstance(owner, str):
                # defer refund for 5 seconds
                state.pending_bomb_refunds.append({"owner": owner, "until": now + 5})
            h.send_json({"ok": True, "slow": 3})
            return
    h.send_json({"ok": False})
    return


def rocket(h, data):
    """POST /api/rocket"""
    # dev nyan rockets only
    now = time.time()
    with state.lock:
        pid = data.get("id")
        me = state.players.get(pid)
        if not (me and state.phase == "round" and pid in state.round_players
                and me.get("alive", True) and me.get("hp", 100) > 0
                and me.get("char") == "nyan" and is_admin(me)):
            h.send_json({"ok": False})
            return
        action = data.get("action")
        if action == "launch":
            try:
                x, y = float(data.get("x", 0)), float(data.get("y", 0))
            except (ValueError, TypeError):
                h.send_json({"ok": False, "reason": "bad launch"})
                return
            if not (x == x and y == y) or x < -600 or x > 3600 or y < -3000 or y > 3000:
                h.send_json({"ok": False, "reason": "bad launch"})
                return
            if not grace_over(now) or now - state.last_rocket.get(pid, 0) < ROCKET_GAP or len(state.rockets) >= 8:
                h.send_json({"ok": False, "reason": "not yet"})
                return
            state.last_rocket[pid] = now
            state.rocket_seq += 1
            rid = f"r{state.rocket_seq}"
            state.rockets[rid] = {"id": rid, "x": x, "y": y, "by": pid, "name": me["name"],
                            "at": now, "target": None}
            print(f"!! {me['name']} launched a rocket!!", flush=True)
            h.send_json({"ok": True, "rocket": dict(state.rockets[rid], age=0)})
            return
        if action == "detonate":
            rk = state.rockets.get(data.get("rocket"))
            try:
                x, y = float(data.get("x", 0)), float(data.get("y", 0))
            except (ValueError, TypeError):
                rk = None
            if (not rk or rk["by"] != pid or now - rk["at"] < ROCKET_UP * 0.8
                    or not (x == x and y == y) or abs(x) > 6000 or abs(y) > 6000):
                h.send_json({"ok": False})
                return
            del state.rockets[rk["id"]]
            hit = []
            for vid, vic in enemies_of(pid).items():
                if is_rocketing(vid):
                    continue # mid rocket, untouchable
                # hitbox top left offset
                if ((vic.get("x", 0) + 14 - x) ** 2 + (vic.get("y", 0) + 30 - y) ** 2) ** 0.5 > ROCKET_RADIUS:
                    continue
                # shield eats rockets first
                rem = ROCKET_DMG
                take = min(vic.get("shield", 0), rem)
                vic["shield"] = vic.get("shield", 0) - take
                rem -= take
                if take > 0:
                    vic["shield_hit_at"] = now # sting mark
                before = vic.get("hp", 100)
                vic["hp"] = max(0, before - rem) # always the full 50
                landed = take + min(rem, before) # applied only
                me["st_dealt"] = me.get("st_dealt", 0) + landed
                vic["st_taken"] = vic.get("st_taken", 0) + landed
                if vic["hp"] <= 0:
                    vic["alive"] = False
                    vic["shield"] = 0 # death clears bonus
                    me["st_kills"] = me.get("st_kills", 0) + 1
                    note_death(vic, now)
                hit.append(vic["name"])
            state.blast_seq += 1
            state.blasts.append({"id": f"x{state.blast_seq}", "x": x, "y": y, "r": ROCKET_RADIUS,
                           "rid": rk["id"], "by": me["name"], "at": now})
            print(f"!! {me['name']}'s rocket blew up, hit: {', '.join(hit) or 'nobody'}!!", flush=True)
            h.send_json({"ok": True, "hit": len(hit)})
            return
    h.send_json({"ok": False})
    return

