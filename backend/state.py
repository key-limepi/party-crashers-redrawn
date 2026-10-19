"""All shared mutable game state plus the one lock that guards it.

Scalars that get reassigned (phase, killer_id, current_round, the *_seq counters, ...)
and round_players must always be used as state.<name>; never `from .state import phase`.
"""
import threading

players = {} # player list
spikes = {} # trap list
bombs = {} # tails traps
bomb_tosses = {} # airborne tails bomb throws
pending_bomb_refunds = [] # pending bomb refunds
rockets = {} # nyan rockets in the air
blasts = [] # fresh rocket blasts, everyone shakes
last_rocket = {} # launch guard
alerts = [] # ping list
hits = [] # landed hit feed
announces = [] # mod shouts
chat_log = [] # chat list
last_chat = {} # spam guard
last_hit = {} # hit guard
last_stun = {} # stun guard
chat_seq = 0
hit_seq = 0
muted_fids = {} # mute list
sessions = {} # cookie -> session data
malice = {} # fid -> malice totals
spike_seq = 0
bomb_seq = 0
bomb_toss_seq = 0
rocket_seq = 0
blast_seq = 0
lock = threading.Lock()

phase = "lobby" # phase flow
phase_end = 0.0
pending_end = 0.0 # killer gone
last_killer_name = "EVIL"
# death duel
lms_set = False # once only
lms_notice_until = 0.0 # duel banner
round_start = 0.0
intro_len = 120 # round length after intro
intro_start = 0.0 # video window opened
killer_id = None
current_round = 0
round_map = "rough_draft" # round map id
map_votes = {} # player map votes
result = None # last result
round_players = set() # current round players
cutscene_skip = set() # cinema skip votes
