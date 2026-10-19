"""The HTTP handler: static files from public/, plus dispatch to backend.routes."""
import json
import socket
import urllib.parse
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from .. import state
from ..config import FORMBAR_MODE, LOCAL_SESSION, PUBLIC_DIR
from ..routes import GET_PATH_ROUTES, GET_ROUTES, POST_ROUTES
from ..routes import bundle


class DualStackServer(ThreadingHTTPServer):
    """dual stack"""
    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()


class Handler(SimpleHTTPRequestHandler):
    # keep alive, so every poll does not pay for a new connection (big deal at high ping)
    protocol_version = "HTTP/1.1"
    disable_nagle_algorithm = True # send small replies right away
    timeout = 30 # drop idle connections

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def end_headers(self):
        # fresh files
        if self.path.split("?")[0].endswith((".html", ".js", ".css")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # route helper methods
    def ip(self):
        ip = self.client_address[0]
        if ip.startswith("::ffff:"):
            ip = ip[7:]
        return ip

    def session(self):
        """the logged in formbar user for this browser, or None"""
        if not FORMBAR_MODE:
            return LOCAL_SESSION # no login locally
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        morsel = cookie.get("pch_sid")
        return state.sessions.get(morsel.value) if morsel else None

    def redirect(self, url, cookie=None):
        self.send_response(302)
        self.send_header("Location", url)
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.send_header("Content-Length", "0") # needed for keep alive
        self.end_headers()

    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        try:
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionAbortedError):
            pass # dead tab

    def read_json(self):
        try:
            n = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            n = 0
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except (ValueError, UnicodeDecodeError):
            return {}

    # ---- dispatch ----
    def do_POST(self):
        data = self.read_json() # always read the body first so the connection stays clean
        route = POST_ROUTES.get(self.path)
        if route is None:
            self.send_json({"error": "nope!!"}, 404)
            return
        route(self, data)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == "/js/bundle.js":
            bundle.serve(self) # one file, slow tunnels
            return
        if url.path in GET_PATH_ROUTES:
            if not FORMBAR_MODE:
                self.redirect("/") # nothing to log into
                return
            GET_PATH_ROUTES[url.path](self, url)
            return
        route = GET_ROUTES.get(url.path)
        if route is not None:
            route(self, url)
            return
        return super().do_GET()

    def log_message(self, *args):
        pass # stay quiet
