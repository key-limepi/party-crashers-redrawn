"""Login, logout, who-am-i and digipog pin routes."""
import secrets
import urllib.parse

from .. import state
from ..config import (APP_URL, DIGIPOGS_ON, FORMBAR_CLIENT_URL, FORMBAR_MODE,
                      MALICE_PER_BUY, MALICE_PRICE, ROUND_COST)
from ..formbar import formbar_user


def app_url(headers):
    """Return the public application URL for a request, or its Host header."""
    if APP_URL:
        return APP_URL
    protocol = headers.get("X-Forwarded-Proto", "http")
    if "," in protocol:
        protocol = protocol.split(",", 1)[0].strip()
    host = headers.get("Host", "localhost")
    return f"{protocol}://{host}"


def login(h, url):
    """GET /login: formbar sends the browser back here with a signed token"""
    # formbar return with token
    token = urllib.parse.parse_qs(url.query).get("token", [""])[0]
    if not token:
        current_url = app_url(h.headers)
        back = urllib.parse.quote(f"{current_url}/login", safe="")
        h.redirect(f"{FORMBAR_CLIENT_URL}/oauth?redirectURL={back}")
        return
    fid, name = formbar_user(token)
    if not fid:
        h.send_json({"error": "formbar login failed!!"}, 401)
        return
    sid = secrets.token_hex(16)
    state.sessions[sid] = {"sid": sid, "fid": fid, "name": name, "pin": None}
    secure = "; Secure" if app_url(h.headers).startswith("https") else ""
    h.redirect("/", f"pch_sid={sid}; Path=/; HttpOnly; SameSite=Lax{secure}")


def logout(h, url):
    """GET /logout"""
    sess = h.session()
    if sess:
        state.sessions.pop(sess["sid"], None)
    h.redirect("/", "pch_sid=; Path=/; Max-Age=0")


def me(h, url):
    """GET /api/me"""
    sess = h.session()
    h.send_json({
        "logged_in": bool(sess),
        "formbar_mode": FORMBAR_MODE,
        "name": sess["name"] if sess else None,
        "has_pin": bool(sess and sess.get("pin")),
        "needs_pin": DIGIPOGS_ON,
        "round_cost": ROUND_COST,
        "malice_price": MALICE_PRICE,
        "malice_per_buy": MALICE_PER_BUY,
    })

def pin(h, data):
    """POST /api/pin"""
    # pin stays server-side only
    sess = h.session()
    pin = str(data.get("pin", "")).strip()
    if not sess:
        h.send_json({"ok": False, "reason": "log in first!!"}, 401)
    elif not (pin.isdigit() and 4 <= len(pin) <= 8):
        h.send_json({"ok": False, "reason": "pin should be 4 to 8 digits!!"})
    else:
        sess["pin"] = pin
        sess["remember_pin"] = bool(data.get("remember"))
        h.send_json({"ok": True})
    return


def verify(h, data):
    """POST /api/pin/verify"""
    # per-round join check
    sess = h.session()
    if not sess:
        h.send_json({"ok": False, "reason": "log in first!!"}, 401)
        return
    if not DIGIPOGS_ON:
        h.send_json({"ok": True}) # free rounds
        return
    pin = str(data.get("pin", "")).strip()
    if not sess.get("pin") or pin != sess.get("pin"):
        h.send_json({"ok": False, "reason": "wrong pin!!"})
        return
    with state.lock:
        pl = state.players.get(data.get("id"))
        if not pl:
            h.send_json({"ok": False, "reason": "join first!!"})
            return
        if ROUND_COST > 0:
            from ..formbar import charge_player
            import threading
            pl["paid"] = None # charging now
            pl["pay_msg"] = ""
            threading.Thread(target=charge_player, args=(data.get("id"),), daemon=True).start()
        else:
            pl["paid"] = True
        pl["confirmed"] = True
    h.send_json({"ok": True})
    return


def typing(h, data):
    """POST /api/pin/typing"""
    # pin entry heartbeat
    import time
    with state.lock:
        pl = state.players.get(data.get("id"))
        if pl:
            pl["typing_pin_until"] = time.time() + 4
    h.send_json({"ok": True})
    return

