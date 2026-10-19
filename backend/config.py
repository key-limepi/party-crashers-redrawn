"""Paths, .env loading, environment config, tuning constants and static game tables."""
import os
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # repo root
PUBLIC_DIR = os.path.join(HERE, "public") # browser-facing folder only
DATA_DIR = os.path.join(HERE, "backend", "data")
MALICE_FILE = os.path.join(HERE, "malice.json")
ADMINS_FILE = os.path.join(HERE, "admins.txt")


def load_env():
    """read .env into os.environ (real env vars win)"""
    try:
        with open(os.path.join(HERE, ".env"), encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip().strip('"\''))
    except OSError:
        pass


load_env()
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8000))

# formbar/digipog config via .env
FORMBAR_ADDRESS = os.environ.get("FORMBAR_ADDRESS", "").rstrip("/")
FORMBAR_CLIENT_URL = os.environ.get("FORMBAR_CLIENT_URL", FORMBAR_ADDRESS).rstrip("/")
APP_URL = os.environ.get("URL", "").rstrip("/")

_fm = (os.environ.get("FORMBAR_MODE", "true").split("#")[0].split() or ["true"])[0].strip("\"'").lower() # tolerates a trailing comment
FORMBAR_MODE = _fm not in ("0", "false", "off", "no", "n", "disabled", "disable") # off = local testing
POOL_ID = int(os.environ.get("POOL_ID", 0) or 0) # digipog destination pool
ROUND_COST = int(os.environ.get("ROUND_COST", 25)) # round cost, 0=free
if not FORMBAR_MODE:
    ROUND_COST = 0 # local testing is free
MALICE_PER_ROUND = int(os.environ.get("MALICE_PER_ROUND", 1)) # malice per round played
MALICE_PRICE = int(os.environ.get("MALICE_PRICE", 10)) # digipogs per malice purchase
MALICE_PER_BUY = int(os.environ.get("MALICE_PER_BUY", 1)) # malice gained per purchase
DIGIPOGS_ON = FORMBAR_MODE and (ROUND_COST > 0 or MALICE_PRICE > 0) # pin needed if paid

TIMEOUT = 25 # patient timeouts
ROUND_BASE = 120 # base time
ROUND_PER_PLAYER = 30 # per player
ROUND_MAX = 600
ROUND_TIME = 300 # backup time
INTER_TIME = 30 # break time
SELECT_TIME = 30 # pick time
INTRO_TIME = 12 # killer intro video
GRACE_TIME = 5 # safe start
LMS_DURATIONS = {"lux": 209.736, "sonic": 266.928, "supersonic": 266.928, "tails": 166.872, "nyan": 181.656, "mario": 178.128} # anthem lengths; default 105s
TOUCH_DIST = 55 # touch range
TOUCH_DMG = 25 # hit damage
TOUCH_COOLDOWN = 1.0
SPIKE_MAX = 5 # trap cap
SPIKE_LIFE = 45 # trap rot
SPIKE_DMG = 30
ROCKET_DMG = 50 # rocket hit
ROCKET_RADIUS = 170 # blast reach
ROCKET_UP = 1.1 # climb time, mirrored
ROCKET_LIFE = 12 # stale rockets drop
ROCKET_GAP = 3.0 # launch spam guard
BLAST_LIFE = 4 # blasts linger visibly
STUN_IFRAMES = 3.0 # stun gap
CHAT_LIFE = 12 # chat life
CHAT_COOLDOWN = 1.5
MUTE_TIME = 600 # mute time

# pick pair
CHARACTERS = [
    {"id": "evil", "name": "EVIL LUX", "killer": True},
    {"id": "lux", "name": "LUX"},
    {"id": "toko", "name": "TOKO"},
    {"id": "sonic", "name": "SONIC"},
    {"id": "tails", "name": "TAILS"},
    {"id": "supersonic", "name": "SUPER SONIC", "dev": True},
    {"id": "nyan", "name": "NYAN CYAT", "dev": True},
    {"id": "mario", "name": "MARIO"},
    {"id": "bear5", "name": "BEAR5", "dev": True, "killer": True},
]

# map loot pool, weighted
MAPS = [
    {"id": "rough_draft", "weight": 1},
    {"id": "greenhill", "weight": 1},
]

QUICK_CHAT = (
    "OK!", "what a save!", "run away!!!", "help me!!",
    "thanks!!", "sorry!!", "nice!!", "wow!!",
    "good luck!!", "killer here!!", "split up!!", "gg!!",
) # only these may post

# fresh stamps
STATE_KEYS = ("x", "y", "facing", "moving", "onGround",
              "invis", "m1", "stunned", "pull", "cower", "windup", "pose", "dashing",
              "peeling", "spinning", "spinwindup", "pullwindup", "pulltarget", "lift", "super", "forming", "holding", "whipuntil",
              "dtmult", "healmult", "praying", "rushing", "panting",
              "anim", "m1v", "trail", "fireball")

# lux overheal tuning
AURA_RADIUS = 260 # conversion reach
AURA_T1 = 60 # fresh until here
AURA_T2 = 120 # drained after here
AURA_TICKS = ((2, 4.0), (2, 6.0), (1, 8.0)) # hp, seconds per tier
OVERHEAL_RADIUS = 300 # pick reach
OVERHEAL_BONUS = 50 # blue hp granted
OVERHEAL_CD = 13.5 # cast wait
OVERHEAL_DRAIN = 2.0 # blue hp per second

# mvp scoring, applied hp only
SCORE_KILL = 100 # per kill
SCORE_DMG = 1.0 # per hp dealt
SCORE_HEAL = 1.0 # per hp restored
SCORE_SURV = 0.5 # per second alive
SCORE_TAKEN = -0.2 # per hp eaten

# rank grades, score floors
GRADE_CUTS = ((400, "S"), (250, "A"), (120, "B"), (40, "C")) # else d

# killer winning cutscenes, more later
WIN_CUTSCENES = {
    "evil": "./Assets/Videos/eluxwinscreen.mp4", # evil lux win
    "bear5": "./Assets/Videos/bear5_killerintro.mp4", # bear5 win
}

LOCAL_SESSION = {"sid": "local", "fid": "local", "name": "guest", "pin": None} # local login stand-in
