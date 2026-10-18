"""Mod menu ids (admins.txt) and the is_admin check."""
from .config import ADMINS_FILE, FORMBAR_MODE


def load_admins():
    """mod menu ids"""
    try:
        with open(ADMINS_FILE, encoding="utf-8") as f:
            return {l.strip() for l in f if l.strip() and not l.strip().startswith("#")}
    except OSError:
        return set()

def _is_cakes(pl):
    """local testing: name is cakes"""
    name = pl.get("name", "") if isinstance(pl, dict) else ""
    return str(name).strip().lower().split(" ")[0] == "cakes"


def is_admin(pl):
    """mods and dev characters"""
    if not FORMBAR_MODE:
        return _is_cakes(pl) # cakes only locally
    fid = pl.get("fid") if isinstance(pl, dict) else pl
    return fid in load_admins()
