"""generated from the old do_POST; module: lobby"""

import time

from .. import state
from ..admins import is_admin
from ..chat_filter import is_clean
from ..config import (CHARACTERS, CHAT_COOLDOWN, FORMBAR_MODE, INTER_TIME, MALICE_PER_BUY, MALICE_PRICE, MUTE_TIME, QUICK_CHAT)
from ..formbar import formbar_transfer
from ..game import begin_round, here_players
from ..malice_store import add_malice


def malice_buy(h, data):
    """POST /api/malice/buy"""
    # intermission buys, outside lock
    with state.lock:
        me = state.players.get(data.get("id"))
        if not me:
            h.send_json({"ok": False, "reason": "no player!!"})
            return
        fid = me["fid"]
        if is_admin(me):
            try:
                amount = max(0, int(data.get("amount", MALICE_PER_BUY)))
            except (TypeError, ValueError):
                amount = MALICE_PER_BUY
            add_malice(fid, amount)
            total = state.malice.get(fid, 0)
            print(f"!! dev {me['name']} gave themselves {amount} malice ({total})!!", flush=True)
            h.send_json({"ok": True, "malice": total})
            return
        if state.phase != "intermission":
            h.send_json({"ok": False, "reason": "malice is sold during intermission only!!"})
            return
        if MALICE_PRICE <= 0:
            h.send_json({"ok": False, "reason": "malice is not for sale!!"})
            return
        pin = state.sessions.get(me["sid"], {}).get("pin")
        given = str(data.get("pin", "")).strip()
        if not pin or given != pin:
            h.send_json({"ok": False, "reason": "wrong pin!!"})
            return
    if FORMBAR_MODE:
        if not pin:
            h.send_json({"ok": False, "reason": "enter your digipog pin first!!"})
            return
        ok, msg = formbar_transfer(fid, pin, MALICE_PRICE, "party crashers malice")
        if not ok:
            h.send_json({"ok": False, "reason": msg or "payment failed!!"})
            return
    with state.lock:
        add_malice(fid, MALICE_PER_BUY)
        total = state.malice.get(fid, 0)
    print(f"!! {me['name']} bought malice ({total})", flush=True)
    h.send_json({"ok": True, "malice": total})
    return


def intro(h, data):
    """POST /api/intro"""
    # video over, roll early
    with state.lock:
        if (state.phase == "intro" and data.get("id") in state.round_players
                and time.time() - state.intro_start > 4):
            begin_round()
        elif state.phase == "lms_cutscene" and data.get("id") in state.players:
            # skip vote needs unanimity
            state.cutscene_skip.add(data.get("id"))
            if set(here_players()) <= state.cutscene_skip:
                state.cutscene_skip.clear()
                state.killer_id = None # drop evil
                state.phase = "intermission"
                state.phase_end = time.time() + INTER_TIME
                print("[GAME] State: INTERMISSION (30s)", flush=True)
    h.send_json({"ok": True})
    return


def pick(h, data):
    """POST /api/pick"""
    # free picks
    with state.lock:
        me = state.players.get(data.get("id"))
        want = data.get("char")
        character = next((c for c in CHARACTERS if c["id"] == want), None)
        killer_pick = data.get("role") == "killer"
        is_elected = data.get("id") == state.killer_id
        allowed_role = character and bool(character.get("killer")) == killer_pick
        allowed_dev = bool(character and (not character.get("dev") or (me and is_admin(me))))
        if (me and data.get("id") in here_players() and state.phase == "select"
                and allowed_role and allowed_dev and is_elected == killer_pick):
            if killer_pick:
                me["killer_char"] = want
            else:
                me["char"] = want
            print(f"!! {me['name']} picked {want}!!", flush=True)
            h.send_json({"ok": True, "char": want})
        else:
            h.send_json({"ok": False, "reason": "nope!!"})
    return


def chat(h, data):
    """POST /api/chat"""
    # chat bubbles
    # mute hammer
    ip = h.ip()
    now = time.time()
    me_preview = state.players.get(data.get("id"))
    mkey = (me_preview.get("fid") if me_preview else None) or ip
    if now < state.muted_fids.get(mkey, 0):
        h.send_json({"ok": False, "reason": "muted",
                         "left": int(state.muted_fids[mkey] - now)})
        return
    with state.lock:
        me = state.players.get(data.get("id"))
        text = str(data.get("text", ""))[:60].strip()
        now = time.time()
        dev_chat = bool(me and is_admin(me))
        if me and text and (dev_chat or now - state.last_chat.get(data.get("id"), 0) >= CHAT_COOLDOWN):
            if not dev_chat and text not in QUICK_CHAT:
                h.send_json({"ok": False, "reason": "blocked"})
            elif not dev_chat and not is_clean(text):
                state.muted_fids[me.get("fid") or ip] = now + MUTE_TIME
                print(f"!! {me['name']} muted 10 min!!", flush=True)
                h.send_json({"ok": False, "reason": "muted", "left": MUTE_TIME})
            else:
                state.last_chat[data["id"]] = now
                state.chat_seq += 1
                state.chat_log.append({
                    "mid": state.chat_seq, "pid": data["id"],
                    "name": me["name"], "text": text, "at": now,
                })
                while len(state.chat_log) > 20:
                    state.chat_log.pop(0)
                h.send_json({"ok": True})
        else:
            h.send_json({"ok": False})
    return

