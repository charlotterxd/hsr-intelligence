"""In-process TTL cache for expensive, character-agnostic aggregate queries.

Usage-trend "total players per patch" is identical no matter which character
is being queried, so it's wasteful to recompute it on every request. Data
only changes when the ingestion pipeline runs (infrequent), so a short TTL
is enough to keep results fresh without re-scanning millions of rows per call.
"""
import time

_CACHE = {}
_TTL_SECONDS = 900  # 15 minutes


def get_cached(key, compute_fn):
    now = time.monotonic()
    cached = _CACHE.get(key)
    if cached and now - cached[0] < _TTL_SECONDS:
        return cached[1]
    value = compute_fn()
    _CACHE[key] = (now, value)
    return value
