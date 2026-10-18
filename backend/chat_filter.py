"""Chat word filter: loads the blacklist files at import and exposes is_clean()."""
import json
import os
import re
from fnmatch import fnmatchcase

from .config import DATA_DIR

# word filter
EXTRA_FILTER = [
    {"id": "shit", "match": "shit|shits|shitty|shite",
     "tags": ["general"], "severity": 2, "exceptions": ["shiitake", "shiitakes"]},
    {"id": "bitch", "match": "bitch|bitches|bitchy",
     "tags": ["general"], "severity": 2},
    {"id": "poop", "match": "poop|poopy|pooped|pooping|pooper",
     "tags": ["general"], "severity": 1},
]
SEP = r"[\W_]*" # split letters
# list files
FILTER_WORDS = set()
FILTER_BLOBS = set()
LEET = str.maketrans({"@": "a", "4": "a", "8": "b", "3": "e", "1": "i",
                      "!": "i", "0": "o", "$": "s", "5": "s", "7": "t", "+": "t"})


def _norm_words(text):
    s = str(text).lower().translate(LEET)
    s = re.sub(r"(.)\1{2,}", r"\1", s) # squash repeats
    return [w for w in re.split(r"[^a-z0-9]+", s) if w]


try:
    for _fn in ("slurs.txt", "family-friendly.txt", "l33t-speak.txt"):
        with open(os.path.join(DATA_DIR, "blacklist", _fn), encoding="utf-8", errors="replace") as _f:
            for _line in _f:
                _sq = "".join(_norm_words(_line))
                if not _sq:
                    continue
                (FILTER_BLOBS if len(_sq) >= 5 else FILTER_WORDS).add(_sq)
    print(f"folder lists loaded!! {len(FILTER_WORDS)} words + {len(FILTER_BLOBS)} phrases!!", flush=True)
except OSError as _err:
    print(f"!! folder lists missing ({_err})!!", flush=True)


def _folder_hit(text):
    words = _norm_words(text)
    if any(w in FILTER_WORDS for w in words):
        return True
    blob = "".join(words)
    n = len(blob)
    for L in range(5, min(n, 32) + 1):
        for i in range(n - L + 1):
            if blob[i:i + L] in FILTER_BLOBS:
                return True
    return False
BLACKLIST = []
try:
    with open(os.path.join(DATA_DIR, "blacklist.json"), encoding="utf-8") as _f:
        _entries = list(json.load(_f)) + EXTRA_FILTER
        for _entry in _entries:
            _alts = [a.strip().lower() for a in str(_entry.get("match", "")).split("|") if a.strip()]
            _exc = [e.strip().lower() for e in (_entry.get("exceptions") or []) if str(e).strip()]
            for _alt in _alts:
                _bare = _alt.replace("*", "").replace(" ", "")
                _bounded = (" " not in _alt and len(_bare) < 6
                            and not _alt.startswith("*") and not _alt.endswith("*"))
                _parts = []
                for _ch in _alt:
                    _parts.append(".*" if _ch == "*" else re.escape(_ch))
                _body = SEP.join(_parts)
                if _bounded:
                    # loose match
                    _f, _l = re.escape(_alt[0]), re.escape(_alt[-1])
                    _body = (r"(?:\b(?=" + _f + r")|(?<=" + _f + r"))" + _body +
                             r"(?:(?<=" + _l + r")\b|(?=" + _l + r"))")
                BLACKLIST.append((re.compile(_body), _exc))
    print(f"blacklist loaded!! {len(BLACKLIST)} patterns!!", flush=True)
except FileNotFoundError:
    print("!! no blacklist.json - chat unfiltered!!", flush=True)
except (ValueError, OSError) as _err:
    print(f"!! blacklist broken ({_err}) - chat unfiltered!!", flush=True)


def _excused(text, words, excs):
    for e in excs:
        if " " in e:
            if re.search(re.escape(e).replace(r"\*", ".*"), text):
                return True
        elif any(fnmatchcase(w, e) for w in words if w):
            return True
    return False


def is_clean(text):
    """word check"""
    if _folder_hit(text):
        return False
    low = str(text).lower()
    words = re.split(r"[^a-z0-9]+", low)
    for pat, excs in BLACKLIST:
        if pat.search(low) and not _excused(low, words, excs):
            return False
    return True
