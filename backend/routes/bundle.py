"""GET /js/bundle.js: all game scripts concatenated in index.html order.

Slow tunnels drop most of 27 parallel script fetches, which leaves the game
half-loaded (blue screen, no title). One file means one request and the order
stays exactly as the page needs. Individual files stay on disk for dev.
"""
import os

from ..config import PUBLIC_DIR

FILES = [
    "js/engine/constants.js",
    "js/engine/physics-primitives.js",
    "js/engine/input.js",
    "js/engine/engine.js",
    "js/engine/tosses.js",
    "js/engine/fx.js",
    "js/engine/rockets.js",
    "js/engine/sprites.js",
    "js/engine/render.js",
    "js/levels/level_rough_draft.js",
    "js/levels/level_intermission.js",
    "js/levels/level_greenhill_hitboxes.js",
    "js/levels/level_pool.js",
    "js/client/01-core.js",
    "js/client/02-sprites.js",
    "js/client/03-world.js",
    "js/client/04-debug-ui.js",
    "js/client/05-net-state.js",
    "js/client/06-char-select.js",
    "js/client/07-chat.js",
    "js/client/08-audio.js",
    "js/client/09-hud.js",
    "js/client/10-kit-helpers.js",
    "js/client/11-rockets.js",
    "js/client/12-game-hooks.js",
    "js/client/13-join.js",
    "js/client/14-ability-casts.js",
    "js/client/15-tick-sync.js",
    "js/client/16-tick-kits.js",
    "js/client/17-net-tick.js",
]


def serve(h):
    """GET /js/bundle.js (query ignored)"""
    parts = []
    for f in FILES:
        with open(os.path.join(PUBLIC_DIR, f), encoding="utf-8") as fh:
            parts.append(fh.read())
    body = "\n;\n".join(parts).encode("utf-8")
    try:
        h.send_response(200)
        h.send_header("Content-Type", "application/javascript")
        h.send_header("Content-Length", str(len(body)))
        h.end_headers()
        h.wfile.write(body)
    except (BrokenPipeError, ConnectionAbortedError):
        pass # dead tab
