"""Malice totals: load/save malice.json and pick the killer by malice.

(Named malice_store so the package attribute `backend.malice` is not shadowed by a submodule.)
"""
import json
import random

from .config import FORMBAR_MODE, MALICE_FILE
from .state import malice


def load_malice():
    try:
        with open(MALICE_FILE, encoding="utf-8") as f:
            malice.update(json.load(f))
    except (OSError, ValueError):
        pass


def set_malice(fid, amount):
    malice[fid] = max(0, amount)
    if not FORMBAR_MODE:
        return # local testing stays off disk
    try:
        with open(MALICE_FILE, "w", encoding="utf-8") as f:
            json.dump(malice, f)
    except OSError:
        print("!! could not save malice.json", flush=True)


def add_malice(fid, amount):
    set_malice(fid, malice.get(fid, 0) + amount)


def pick_killer(candidates):
    """the player with the most malice becomes the killer, ties are random"""
    best = max(malice.get(pl["fid"], 0) for pl in candidates.values())
    top = [pid for pid, pl in candidates.items() if malice.get(pl["fid"], 0) == best]
    return random.choice(top)
