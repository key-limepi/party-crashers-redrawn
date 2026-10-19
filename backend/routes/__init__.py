"""URL -> function tables for the HTTP handler.

Every route is a plain function taking the request handler `h` (see web/handler.py: h.send_json,
h.session, h.ip, h.redirect, h.headers) plus either the decoded JSON body (POST) or the parsed url (GET).
"""
from . import auth, combat, lobby, mod, players, snapshot, traps

# post path table
POST_ROUTES = {
    "/api/pin": auth.pin,
    "/api/pin/verify": auth.verify,
    "/api/pin/typing": auth.typing,
    "/api/join": players.join,
    "/api/malice/buy": lobby.malice_buy,
    "/api/state": players.state_post,
    "/api/afk": players.afk,
    "/api/leave": players.leave,
    "/api/intro": lobby.intro,
    "/api/spike": traps.spike,
    "/api/bomb": traps.bomb,
    "/api/rocket": traps.rocket,
    "/api/hit": combat.hit,
    "/api/pick": lobby.pick,
    "/api/map-vote": lobby.map_vote,
    "/api/chat": lobby.chat,
    "/api/mod": mod.mod_action,
    "/api/heal": players.heal,
    "/api/overheal": players.overheal,
}

# get paths, ignore query
GET_PATH_ROUTES = {
    "/login": auth.login,
    "/logout": auth.logout,
}

# get full-path routes
GET_ROUTES = {
    "/api/me": auth.me,
    "/api/players": snapshot.players_snapshot,
}
