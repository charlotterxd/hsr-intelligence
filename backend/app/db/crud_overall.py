"""Overall Tier List — combines AA (50%), AS (30%), PF (20%) by reusing existing per-mode queries"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

MIN_PATCH = 3.6


def _map_as_tier(score) -> int:
    if score is None:
        return 0
    if score >= 3551: return 6
    if score >= 3401: return 5
    if score >= 3251: return 4
    if score >= 3100: return 3
    if score > 0:    return 1
    return 0


def _map_pf_tier(score) -> int:
    if score is None:
        return 0
    if score >= 40000: return 6
    if score >= 35001: return 5
    if score >= 32001: return 4
    if score >= 28001: return 3
    if score >= 25001: return 2
    if score > 0:     return 1
    return 0


def _map_aa_tier(score) -> int:
    if score is None:
        return 0
    if score <= 1: return 6
    if score <= 2: return 5
    if score <= 3: return 4
    if score <= 4: return 3
    if score <= 5: return 2
    return 1


def get_overall_patches(db: Session) -> List[str]:
    """Distinct patches >= 3.6 appearing in any of the three modes, sorted"""
    sql = text("""
        SELECT DISTINCT version FROM (
            SELECT version FROM player_records_as       WHERE version >= :min_patch
            UNION
            SELECT version FROM player_records_pf       WHERE version >= :min_patch
            UNION
            SELECT version FROM player_records_anomaly  WHERE version >= :min_patch
        ) sub
        ORDER BY version
    """)
    rows = db.execute(sql, {"min_patch": MIN_PATCH}).fetchall()
    return [str(row[0]) for row in rows]


def get_tierlist_overall(
    db: Session,
    patch: str = None,
    excluded_characters: List[str] = None,
    signature_only: bool = False,
    min_samples: int = 30
) -> List[dict]:
    """Weight per-mode tier scores: AA 50%, AS 30%, PF 20%. Missing mode = T4 (0 pts)."""
    if excluded_characters is None:
        excluded_characters = []

    from app.db import crud_as, crud, crud_aa

    kwargs = dict(patch=patch, excluded_characters=excluded_characters,
                  signature_only=signature_only, min_samples=min_samples)

    as_data = crud_as.get_tierlist_as(db, **kwargs)
    pf_data = crud.get_tierlist_pf(db, **kwargs)
    aa_data = crud_aa.get_tierlist_aa(db, **kwargs)

    as_by  = {r["name"]: r for r in as_data}
    pf_by  = {r["name"]: r for r in pf_data}
    aa_by  = {r["name"]: r for r in aa_data}

    # Char metadata: prefer AA > AS > PF
    char_info = {}
    for src in [pf_by, as_by, aa_by]:
        for name, r in src.items():
            char_info[name] = {"id": r["id"], "role": r["role"], "element": r["element"]}

    results = []
    for name in char_info:
        as_ts = _map_as_tier(as_by.get(name, {}).get("median_score"))
        pf_ts = _map_pf_tier(pf_by.get(name, {}).get("median_score"))
        aa_ts = _map_aa_tier(aa_by.get(name, {}).get("median_score"))
        weighted = round(aa_ts * 0.5 + as_ts * 0.3 + pf_ts * 0.2, 2)
        info = char_info[name]
        results.append({
            "name": name,
            "id": info["id"],
            "role": info["role"] or "Unknown",
            "element": info["element"] or "Unknown",
            "median_score": weighted,
            "sample_count": 1,
        })

    results.sort(key=lambda x: x["median_score"], reverse=True)
    return results
