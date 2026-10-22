"""generated from the old do_POST; module: combat"""

import math
import time

from .. import state
from ..config import EVIL_PULL_RANGE, STUN_IFRAMES, TOUCH_COOLDOWN
from ..game import grace_over, is_rocketing, note_death, scale_stun


def hit(h, data):
    """POST /api/hit"""
    # both ways
    now = time.time()
    with state.lock:
        atk = state.players.get(data.get("id"))
        vic = state.players.get(data.get("victim"))
        atk_evil = data.get("id") == state.killer_id
        vic_evil = data.get("victim") == state.killer_id
        if (atk and vic and data.get("victim") != data.get("id")
            and data.get("id") in state.round_players and data.get("victim") in state.round_players
                and atk_evil != vic_evil and state.phase == "round"
                and atk.get("alive", True) and vic.get("alive", True)
                and grace_over(now)):
            k = atk
            try:
                dmg = max(0, min(100, int(data.get("dmg", 0))))
            except (ValueError, TypeError):
                dmg = 0
            if atk_evil:
                dmg = int(round(dmg * 1.08))
            # 25% damage reduction
            if state.lms_set and not vic_evil:
                dmg = (dmg * 3 + 3) // 4
            # prayer/shelter/frailty legs
            dmg = int(round(dmg * vic.get("dtmult", 1.0)))
            # fat with hp takes more
            if vic.get("hp", 0) > vic.get("maxhp", 100):
                dmg = int(round(dmg * 1.25))
            try:
                stun = max(0, min(5, float(data.get("stun", 0))))
            except (ValueError, TypeError):
                stun = 0
            stun = scale_stun(stun)
            # rocketing blocks damage
            if is_rocketing(data["victim"]):
                h.send_json({"ok": True})
                return
            # wide swings
            # Mario's fireball follows the map geometry and the client reports
            # the confirmed collision; bound range to the playable map scale.
            fireball_hit = bool(data.get("fireball")) and not atk_evil and atk.get("char") == "mario"
            evil_pull_hit = (bool(data.get("pull")) and atk_evil
                             and (atk.get("pull") or atk.get("pullwindup")) # windup flag covers the first tick
                             and atk.get("pulltarget") == data.get("victim"))
            reach = (4500 if fireball_hit else
                     EVIL_PULL_RANGE if evil_pull_hit else
                     180 if stun <= 0 else 130)
            dx = vic.get("x", 0) - k.get("x", 0)
            dy = vic.get("y", 0) - k.get("y", 0)
            # icewall blocks killer attacks
            if atk_evil:
                for iw in state.icewalls.values():
                    if iw.get("destroyed"):
                        continue
                    wcx = iw["x"] + iw["w"] / 2
                    ax = k.get("x", 0) + 14
                    vx = vic.get("x", 0) + 14
                    # the wall is a standing pillar, it only blocks near its own height
                    wy = iw["y"]
                    wh = iw.get("h", 190)
                    ky = k.get("y", 0)
                    vy = vic.get("y", 0)
                    spans = ((ky < wy + wh and wy < ky + 60) or (vy < wy + wh and wy < vy + 60))
                    if not spans:
                        continue
                    # opposite sides of the wall
                    if (ax - wcx) * (vx - wcx) < 0 and abs(ax - wcx) < 140 and abs(vx - wcx) < 140:
                        h.send_json({"ok": False, "reason": "blocked by icewall"})
                        return
            if dx * dx + dy * dy < reach * reach:
                # spared cower
                if atk_evil and vic.get("cower", False):
                    if now - state.last_stun.get(data.get("id"), 0) >= STUN_IFRAMES:
                        atk["stun_until"] = now + scale_stun(2)
                        state.last_stun[data.get("id")] = now
                    # shove back
                    _dx = atk.get("x", 0) - vic.get("x", 0)
                    _dy = atk.get("y", 0) - vic.get("y", 0)
                    _dist = (_dx * _dx + _dy * _dy) ** 0.5 or 1
                    atk["kb"] = {"x": _dx / _dist, "y": _dy / _dist, "at": now, "s": 2}
                    vic["countered"] = True
                    print(f"!! {vic['name']} COUNTERED {k['name']}!!", flush=True)
                    h.send_json({"ok": True})
                    return
                if stun > 0 or data.get("ability") or now - state.last_hit.get(data["victim"], 0) >= TOUCH_COOLDOWN:
                    state.last_hit[data["victim"]] = now
                    # shield eats hits first
                    rem = dmg
                    take = min(vic.get("shield", 0), rem)
                    vic["shield"] = vic.get("shield", 0) - take
                    rem -= take
                    if take > 0:
                        vic["shield_hit_at"] = now # sting mark
                    before = vic.get("hp", 100)
                    vic["hp"] = max(0, before - rem)
                    landed = take + min(rem, before) # applied only
                    atk["st_dealt"] = atk.get("st_dealt", 0) + landed
                    vic["st_taken"] = vic.get("st_taken", 0) + landed
                    stack = bool(data.get("stack", False))
                    try:
                        kbp = max(1, min(3, float(data.get("kb", 1))))
                    except (ValueError, TypeError):
                        kbp = 1
                    # stun gaps
                    if stun > 0 and data.get("victim") == state.killer_id and not stack:
                        if now - state.last_stun.get(data["victim"], 0) < STUN_IFRAMES:
                            stun = 0
                        else:
                            state.last_stun[data["victim"]] = now
                    # stack stuns
                    if stun > 0:
                        if stack:
                            vic["stun_until"] = min(max(vic.get("stun_until", 0), now) + stun,
                                                     now + scale_stun(6))
                        else:
                            vic["stun_until"] = now + stun
                    # launchers punch through iframes
                    kbforce = bool(data.get("kbforce"))
                    # shove back
                    # big shoves
                    if data.get("victim") == state.killer_id and (stun > 0 or kbforce):
                            _dx = vic.get("x", 0) - k.get("x", 0)
                            _dy = vic.get("y", 0) - k.get("y", 0)
                            _dist = (_dx * _dx + _dy * _dy) ** 0.5 or 1
                            try:
                                up = max(0, min(1200, float(data.get("up", 0))))
                            except (ValueError, TypeError):
                                up = 0
                            vert = bool(data.get("vert")) # up only
                            vic["kb"] = {"x": 0.0 if vert else _dx / _dist, "y": _dy / _dist, "at": now, "s": stun, "p": kbp, "up": up, "vert": vert}
                    if vic["hp"] <= 0:
                        vic["alive"] = False
                        vic["shield"] = 0 # death clears bonus
                        atk["st_kills"] = atk.get("st_kills", 0) + 1
                        note_death(vic, now)
                    # banner hit feed
                    if (landed > 0 or stun > 0) and not any(
                            h["a"] == data["id"] and h["v"] == data["victim"] and now - h["at"] < 0.75
                            for h in state.hits[-4:]):
                        state.hit_seq += 1
                        state.hits.append({"seq": state.hit_seq, "a": data["id"], "v": data["victim"],
                                           "dmg": landed, "stun": round(float(stun), 2), "at": now})
                        del state.hits[:-12]
                    print(f"!! {k['name']} hit {vic['name']} for {dmg}!!", flush=True)
                    h.send_json({"ok": True, "landed": landed})
                    return
    h.send_json({"ok": False})
    return

