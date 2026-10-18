"""Formbar login (RS256 token check), digipog transfers and the per-round fee charge."""
import base64
import hashlib
import hmac
import json
import urllib.error
import urllib.request

from . import state
from .config import FORMBAR_ADDRESS, POOL_ID, ROUND_COST

formbar_cache = {} # formbar's public key


def b64url(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def der_item(data, pos=0):
    """read one der item, returns (content, position after it)"""
    length = data[pos + 1]
    pos += 2
    if length & 0x80:
        size = length & 0x7F
        length = int.from_bytes(data[pos:pos + size], "big")
        pos += size
    return data[pos:pos + length], pos + length


def rsa_numbers(pem):
    """pull the modulus and exponent out of a public key pem"""
    lines = [l for l in pem.splitlines() if not l.startswith("-----")]
    der = base64.b64decode("".join(lines))
    outer, _ = der_item(der)
    if "RSA PUBLIC KEY" in pem:
        key = outer # plain rsa key
    else:
        _, pos = der_item(outer) # skip the algorithm
        bits, _ = der_item(outer, pos)
        key, _ = der_item(bits[1:]) # skip unused bits
    n, pos = der_item(key)
    e, _ = der_item(key, pos)
    return int.from_bytes(n, "big"), int.from_bytes(e, "big")


def formbar_public_key():
    """fetch formbar's signing key once and remember it"""
    if "key" not in formbar_cache:
        for path in ("/api/v1/certs", "/api/certs", "/certs"):
            try:
                with urllib.request.urlopen(f"{FORMBAR_ADDRESS}{path}", timeout=10) as r:
                    body = json.load(r)
                pem = (body.get("data") or body).get("publicKey")
                if pem:
                    formbar_cache["key"] = rsa_numbers(pem)
                    break
            except (OSError, ValueError, IndexError) as err:
                print(f"!! could not get formbar key at {path}: {err}", flush=True)
    return formbar_cache.get("key")


def token_is_real(token):
    """check the rs256 signature against formbar's public key"""
    key = formbar_public_key()
    if not key:
        return False
    n, e = key
    head, body, sig = token.split(".")
    if json.loads(b64url(head)).get("alg") != "RS256":
        return False
    size = (n.bit_length() + 7) // 8
    got = pow(int.from_bytes(b64url(sig), "big"), e, n).to_bytes(size, "big")
    # sha256 pkcs1 padding
    info = bytes.fromhex("3031300d060960864801650304020105000420")
    info += hashlib.sha256(f"{head}.{body}".encode()).digest()
    want = b"\x00\x01" + b"\xff" * (size - len(info) - 3) + b"\x00" + info
    return hmac.compare_digest(got, want)


def formbar_user(token):
    """check a formbar token and return (id, display name), or (None, None)"""
    try:
        if not token_is_real(token):
            print("!! login token was not signed by formbar", flush=True)
            return None, None
        claims = json.loads(b64url(token.split(".")[1]))
    except (ValueError, IndexError) as err:
        print(f"!! login token is broken: {err}", flush=True)
        return None, None
    fid, name = claims.get("id"), claims.get("displayName")
    if not (fid and name):
        print(f"!! login token had no id or name, keys: {list(claims)}", flush=True)
        return None, None
    return str(fid), str(name)[:24]


def formbar_transfer(fid, pin, amount, reason):
    """send digipogs from a player to the pool, returns (ok, message)"""
    payload = {"from": int(fid), "to": POOL_ID, "amount": amount,
               "pin": int(pin), "reason": reason, "pool": True}
    req = urllib.request.Request(f"{FORMBAR_ADDRESS}/api/v1/digipogs/transfer",
                                 data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.load(r)
    except urllib.error.HTTPError as err:
        try:
            body = json.load(err)
        except ValueError:
            body = {}
    except (OSError, ValueError):
        return False, "could not reach formbar"
    inner = body.get("data") if isinstance(body.get("data"), dict) else body
    ok = bool(body.get("success")) and inner.get("success", True) is not False
    msg = inner.get("message") or body.get("message") or body.get("error") or ""
    return ok, str(msg)[:80]


def charge_player(pid):
    """take the round fee from one player, runs in its own thread so the game never waits"""
    with state.lock:
        pl = state.players.get(pid)
        if not pl:
            return
        fid = pl["fid"]
        pin = state.sessions.get(pl["sid"], {}).get("pin")
        round_no = state.current_round + 1
    if pin:
        ok, msg = formbar_transfer(fid, pin, ROUND_COST, f"party crashers round {round_no}")
    else:
        ok, msg = False, "no pin set"
    with state.lock:
        pl = state.players.get(pid)
        if pl:
            pl["paid"] = ok
            pl["pay_msg"] = "" if ok else (msg or "payment failed")
    print(f"[PAY] {fid} round fee {'paid' if ok else 'failed: ' + msg}", flush=True)
