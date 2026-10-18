"""Start-up: load malice, print the config banner, run the round timer thread and serve forever."""
import os
import threading
from http.server import ThreadingHTTPServer

from .config import FORMBAR_ADDRESS, FORMBAR_MODE, HERE, PORT
from .game import game_tick
from .malice_store import load_malice
from .web.handler import DualStackServer, Handler


def main():
    load_malice()
    print(f"[CONFIG] FORMBAR_MODE is {'ON' if FORMBAR_MODE else 'OFF'} (read {os.environ.get('FORMBAR_MODE', '<unset, default on>')!r})", flush=True)
    if not FORMBAR_MODE:
        print("!! FORMBAR_MODE is off - no formbar, no digipogs, everyone is a mod. local testing only!! (add ?name=bob to the page url to pick a name)", flush=True)
    elif not FORMBAR_ADDRESS:
        print("!! FORMBAR_ADDRESS is not set in .env, nobody can log in!!", flush=True)
    threading.Thread(target=game_tick, daemon=True).start()
    try:
        server = DualStackServer(("::", PORT, 0, 0), Handler)
        print("dual-stack!! ipv4 + ipv6!!", flush=True)
    except Exception:
        server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"party crashers redrawn is LIVE at http://localhost:{PORT} !! ({os.path.join(HERE, 'server.py')})", flush=True)
    print("friends on your wifi: use your computer's IP instead of localhost!!", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye!! :D", flush=True)
