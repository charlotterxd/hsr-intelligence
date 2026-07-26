"""Anomaly Arbitration CRUD functions - simplified aggregation by floor and version"""
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List
from app.db.models import CharacterInfo


def get_all_patches_aa_tierlist(db: Session) -> List[str]:
    """Get all distinct patches from player_records_anomaly, sorted numerically"""
    sql = text("SELECT DISTINCT version FROM player_records_anomaly ORDER BY version ASC")
    patches = db.execute(sql).fetchall()
    patch_strs = [str(p[0]) for p in patches]
    patch_strs.sort(key=lambda v: float(v))
    return patch_strs


def get_tierlist_aa(
    db: Session,
    patch: str = None,
    excluded_characters: List[str] = None,
    signature_only: bool = False,
    min_samples: int = 30
) -> List[dict]:
    """Get tier list data for AA (knights floors 1-3) at E0 — median total cycles per character (lower is better)"""
    if excluded_characters is None:
        excluded_characters = []

    patch_filter = f"AND version = {float(patch)}" if patch else ""
    patch_clause = f"AND r.version = {float(patch)}" if patch else ""

    sig_clause = ""
    if signature_only:
        sig_clause = "AND ci.signature IS NOT NULL AND ci.signature != '' AND r.weapon = ci.signature"

    # Pre-compute excluded teams as CTEs (anti-join is far faster than correlated NOT EXISTS)
    excluded_user_cte = ""
    excluded_user_join = ""
    if excluded_characters:
        names = ','.join([f"'{n.replace(chr(39), chr(39)*2)}'" for n in excluded_characters])
        excluded_user_cte = f"""
        excluded_by_user AS (
            SELECT DISTINCT uid, version, team_id
            FROM player_records_anomaly
            WHERE name IN ({names}) {patch_filter}
        ),"""
        excluded_user_join = "LEFT JOIN excluded_by_user eu ON eu.uid = r.uid AND eu.version = r.version AND eu.team_id = r.team_id"

    excluded_user_filter = "AND eu.uid IS NULL" if excluded_characters else ""

    sql = text(f"""
        WITH
        excluded_by_limited AS (
            SELECT DISTINCT pr_e.uid, pr_e.version, pr_e.team_id
            FROM player_records_anomaly pr_e
            INNER JOIN character_info ci_e ON ci_e.name = pr_e.name
            WHERE ci_e.availability = 'Limited 5*'
              AND pr_e.cons > 0
              {patch_filter}
        ),
        {excluded_user_cte}
        char_appearances AS (
            SELECT DISTINCT
                r.uid, r.version, r.team_id, r.floor, r.name, r.round_num
            FROM player_records_anomaly r
            INNER JOIN character_info ci ON ci.name = r.name
            LEFT JOIN excluded_by_limited el ON el.uid = r.uid AND el.version = r.version AND el.team_id = r.team_id
            {excluded_user_join}
            WHERE r.floor IN (1, 2, 3)
              AND r.cons = 0
              {sig_clause}
              {patch_clause}
              AND el.uid IS NULL
              {excluded_user_filter}
        )
        SELECT
            ca.name,
            ci.id,
            ci.role,
            ci.element,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ca.round_num) AS median_score,
            COUNT(DISTINCT (ca.uid, ca.version, ca.team_id)) AS sample_count
        FROM char_appearances ca
        INNER JOIN character_info ci ON ci.name = ca.name
        GROUP BY ca.name, ci.id, ci.role, ci.element
        HAVING COUNT(DISTINCT (ca.uid, ca.version, ca.team_id)) > :min_samples
        ORDER BY median_score ASC
    """)

    rows = db.execute(sql, {"min_samples": min_samples}).fetchall()

    results = []
    for row in rows:
        name, char_id, role, element, median_score, sample_count = row
        results.append({
            "name": name,
            "id": char_id,
            "role": role or "Unknown",
            "element": element or "Unknown",
            "median_score": round(float(median_score), 2),
            "sample_count": int(sample_count)
        })

    return results


def get_available_patches_aa(db: Session, character_name: str) -> List[str]:
    """Get all patches where a character appears in AA, sorted"""
    sql = text("""
        SELECT DISTINCT version FROM player_records_anomaly
        WHERE name = :name
        ORDER BY version ASC
    """)
    patches = db.execute(sql, {"name": character_name}).fetchall()
    return [p[0] for p in patches]


def get_avg_cycles_aa(
    db: Session,
    floor_type: str,
    character_names: List[str] = None,
    eidolons: List[int] = None,
    signature_lc_modes: List[str] = None,
    sustain_filter: str = "Both"
) -> List[dict]:
    """Get average cycles used per version for given floor type.

    Args:
        floor_type: "knights" (floors 1-3 combined) or "king_normal" (floor 4)
        character_names: optional list of character names to filter by
        eidolons: optional list of eidolon levels
        signature_lc_modes: optional list of signature LC modes
        sustain_filter: "Both", "Yes", or "No"

    Returns:
        List of dicts with version, avg_cycles, count
    """
    if floor_type == "knights":
        floor_condition = "floor IN (1, 2, 3)"
    elif floor_type == "king_normal":
        floor_condition = "floor = 4"
    else:
        return []

    # If no character filters, return whole-table aggregation
    if not character_names:
        sql = text(f"""
            SELECT
                version,
                AVG(round_num)::FLOAT AS avg_cycles,
                COUNT(*) AS count
            FROM player_records_anomaly
            WHERE {floor_condition}
            GROUP BY version
            ORDER BY version
        """)
    else:
        # Build character filter with optimized signature filtering
        char_names_list = ','.join([f"'{name}'" for name in character_names])

        # Build signature filtering with optimized WHERE conditions
        char_sig_filters = {}
        for char_name, eidolon, sig_lc_mode in zip(character_names, eidolons or [], signature_lc_modes or []):
            char_info = db.query(CharacterInfo).filter(CharacterInfo.name == char_name).first()
            if not char_info:
                return []

            if char_info.signature:
                if sig_lc_mode == "signature":
                    char_sig_filters[char_name] = f"'{char_info.signature}'"
                elif sig_lc_mode == "no-signature":
                    char_sig_filters[char_name] = f"!'{char_info.signature}'"
                else:
                    char_sig_filters[char_name] = None
            else:
                char_sig_filters[char_name] = None

        sig_where_clause = ""
        for char_name, sig_filter in char_sig_filters.items():
            if not sig_filter:
                continue

            if sig_filter.startswith('!'):
                sig_name = sig_filter[1:]
                sig_where_clause += f" AND NOT (name = '{char_name}' AND weapon = {sig_name})"
            else:
                sig_where_clause += f" AND NOT (name = '{char_name}' AND weapon != {sig_filter})"

        # Build sustain filter
        sustain_clause = ""
        if sustain_filter != "Both":
            if sustain_filter == "Yes":
                sustain_clause = """
                  AND EXISTS (
                      SELECT 1 FROM player_records_anomaly pr2
                      INNER JOIN character_info ci ON ci.name = pr2.name
                      WHERE pr2.uid = player_records_anomaly.uid
                        AND pr2.version = player_records_anomaly.version
                        AND pr2.floor = player_records_anomaly.floor
                        AND ci.role = 'sustain'
                  )
                """
            else:
                sustain_clause = """
                  AND NOT EXISTS (
                      SELECT 1 FROM player_records_anomaly pr2
                      INNER JOIN character_info ci ON ci.name = pr2.name
                      WHERE pr2.uid = player_records_anomaly.uid
                        AND pr2.version = player_records_anomaly.version
                        AND pr2.floor = player_records_anomaly.floor
                        AND ci.role = 'sustain'
                  )
                """

        # Build eidolon filter
        eidolon_filters = []
        for char_name, eidolon in zip(character_names, eidolons or []):
            if eidolon >= 0:
                eidolon_filters.append(f"(name = '{char_name}' AND cons = {eidolon})")

        eidolon_clause = ""
        if eidolon_filters:
            char_eidolon_filter = " OR ".join(eidolon_filters)
            eidolon_clause = f" AND ({char_eidolon_filter})"

        sql = text(f"""
            WITH filtered_records AS (
                SELECT DISTINCT uid, version, floor
                FROM player_records_anomaly
                WHERE name IN ({char_names_list}){eidolon_clause}{sig_where_clause}{sustain_clause}
            )
            SELECT
                version,
                AVG(round_num)::FLOAT AS avg_cycles,
                COUNT(*) AS count
            FROM player_records_anomaly
            WHERE (uid, version, floor) IN (SELECT uid, version, floor FROM filtered_records)
              AND {floor_condition}
            GROUP BY version
            ORDER BY version
        """)

    rows = db.execute(sql).fetchall()

    results = []
    for row in rows:
        version = str(row[0])
        results.append({
            "version": version,
            "avg_cycles": round(float(row[1]), 2) if row[1] else 0,
            "count": row[2]
        })

    return results


def get_distribution_aa(
    db: Session,
    floor_type: str,
    character_names: List[str] = None,
    eidolons: List[int] = None,
    signature_lc_modes: List[str] = None,
    sustain_filter: str = "Both"
) -> List[dict]:
    """Get cycle usage distribution (binned as 0, 1-2, 3-4, 5-6) per version.

    Bins sum to 100% per version.

    Args:
        floor_type: "knights" (floors 1-3 combined) or "king_normal" (floor 4)
        character_names: optional list of character names to filter by
        eidolons: optional list of eidolon levels
        signature_lc_modes: optional list of signature LC modes
        sustain_filter: "Both", "Yes", or "No"

    Returns:
        List of dicts with version, bin_0, bin_1_2, bin_3_4, bin_5_6 (all as percentages)
    """
    if floor_type == "knights":
        floor_condition = "floor IN (1, 2, 3)"
    elif floor_type == "king_normal":
        floor_condition = "floor = 4"
    else:
        return []

    # Build optional character filter CTE
    filtered_records_cte = ""
    source_table = "player_records_anomaly"

    if character_names:
        char_names_list = ','.join([f"'{name}'" for name in character_names])

        # Build signature filtering with optimized WHERE conditions
        char_sig_filters = {}
        for char_name, eidolon, sig_lc_mode in zip(character_names, eidolons or [], signature_lc_modes or []):
            char_info = db.query(CharacterInfo).filter(CharacterInfo.name == char_name).first()
            if not char_info:
                return []

            if char_info.signature:
                if sig_lc_mode == "signature":
                    char_sig_filters[char_name] = f"'{char_info.signature}'"
                elif sig_lc_mode == "no-signature":
                    char_sig_filters[char_name] = f"!'{char_info.signature}'"
                else:
                    char_sig_filters[char_name] = None
            else:
                char_sig_filters[char_name] = None

        sig_where_clause = ""
        for char_name, sig_filter in char_sig_filters.items():
            if not sig_filter:
                continue

            if sig_filter.startswith('!'):
                sig_name = sig_filter[1:]
                sig_where_clause += f" AND NOT (name = '{char_name}' AND weapon = {sig_name})"
            else:
                sig_where_clause += f" AND NOT (name = '{char_name}' AND weapon != {sig_filter})"

        # Build eidolon filter
        eidolon_filters = []
        for char_name, eidolon in zip(character_names, eidolons or []):
            if eidolon >= 0:
                eidolon_filters.append(f"(name = '{char_name}' AND cons = {eidolon})")

        eidolon_clause = ""
        if eidolon_filters:
            char_eidolon_filter = " OR ".join(eidolon_filters)
            eidolon_clause = f" AND ({char_eidolon_filter})"

        filtered_records_cte = f"""
        filtered_records AS (
            SELECT DISTINCT uid, version, floor
            FROM player_records_anomaly
            WHERE name IN ({char_names_list}){eidolon_clause}{sig_where_clause}
        ),
        """
        source_table = """player_records_anomaly
            WHERE (uid, version, floor) IN (SELECT uid, version, floor FROM filtered_records)"""

    sql = text(f"""
        WITH {filtered_records_cte}binned AS (
            SELECT
                version,
                CASE
                    WHEN round_num = 0 THEN '0'
                    WHEN round_num IN (1, 2) THEN '1-2'
                    WHEN round_num IN (3, 4) THEN '3-4'
                    WHEN round_num IN (5, 6) THEN '5-6'
                    ELSE '5-6'  -- Clamp anything > 6 to 5-6 bin
                END AS bin,
                COUNT(*) AS bin_count
            FROM {source_table}
              AND {floor_condition}
            GROUP BY version, bin
        ),
        version_totals AS (
            SELECT
                version,
                SUM(bin_count) AS total
            FROM binned
            GROUP BY version
        )
        SELECT
            b.version,
            b.bin,
            ROUND(100.0 * b.bin_count / vt.total, 1) AS percentage
        FROM binned b
        INNER JOIN version_totals vt ON b.version = vt.version
        ORDER BY b.version, CASE b.bin WHEN '0' THEN 1 WHEN '1-2' THEN 2 WHEN '3-4' THEN 3 ELSE 4 END
    """)

    rows = db.execute(sql).fetchall()

    # Reshape from rows to version-based structure
    distribution_by_version = {}
    for row in rows:
        version = str(row[0])
        bin_label = row[1]
        percentage = float(row[2])

        if version not in distribution_by_version:
            distribution_by_version[version] = {
                "version": version,
                "bin_0": 0.0,
                "bin_1_2": 0.0,
                "bin_3_4": 0.0,
                "bin_5_6": 0.0
            }

        if bin_label == "0":
            distribution_by_version[version]["bin_0"] = percentage
        elif bin_label == "1-2":
            distribution_by_version[version]["bin_1_2"] = percentage
        elif bin_label == "3-4":
            distribution_by_version[version]["bin_3_4"] = percentage
        elif bin_label == "5-6":
            distribution_by_version[version]["bin_5_6"] = percentage

    # Sort by version numerically
    results = sorted(
        distribution_by_version.values(),
        key=lambda d: tuple(int(x) for x in d["version"].split('.'))
    )

    return results


def get_score_trends_aa(
    db: Session,
    character_names: List[str],
    eidolons: List[int],
    signature_lc_modes: List[str],
    sustain_filter: str = "Both",
    aggregation: str = "mean",
    exclude_characters: List[str] = None,
    floor_type: str = None
) -> List[dict]:
    """Get score trends for AA using player_records_anomaly table - matches PF/MOC implementation"""
    if not character_names:
        return []
    if exclude_characters is None:
        exclude_characters = []

    # Add floor condition if specified
    floor_condition = ""
    if floor_type == "knights":
        floor_condition = "AND floor IN (1, 2, 3)"
    elif floor_type == "king_normal":
        floor_condition = "AND floor = 4"

    # Build character filter conditions with signature LC handling
    char_sig_filters = {}
    for char_name, eidolon, sig_lc_mode in zip(character_names, eidolons, signature_lc_modes):
        char_info = db.query(CharacterInfo).filter(CharacterInfo.name == char_name).first()
        if not char_info:
            return []

        if char_info.signature:
            if sig_lc_mode == "signature":
                char_sig_filters[char_name] = f"'{char_info.signature}'"
            elif sig_lc_mode == "no-signature":
                char_sig_filters[char_name] = f"!'{char_info.signature}'"
            else:
                char_sig_filters[char_name] = None
        else:
            char_sig_filters[char_name] = None

    char_names_list = ','.join([f"'{name}'" for name in character_names])

    # Build excluded teams CTE for efficiency
    excluded_teams_cte = ""
    excluded_teams_filter = ""
    if exclude_characters:
        exclude_names_list = ','.join([f"'{name}'" for name in exclude_characters])
        excluded_teams_cte = f"""
    excluded_teams AS (
        SELECT DISTINCT uid, version, floor
        FROM player_records_anomaly
        WHERE name IN ({exclude_names_list}){floor_condition}
    ),
    """
        # NOT EXISTS (not NOT IN): a multi-column NOT IN subquery can't be planned as a hash
        # anti-join due to NULL semantics, so Postgres re-scans excluded_teams per outer row -
        # this was the actual "minutes" slowdown (quadratic, independent of the sustain filter).
        excluded_teams_filter = """AND NOT EXISTS (
            SELECT 1 FROM excluded_teams et
            WHERE et.uid = player_records_anomaly.uid
              AND et.version = player_records_anomaly.version
              AND et.floor = player_records_anomaly.floor
        )"""

    # Build optimized signature filtering - apply early to raw data
    sig_where_clause = ""
    for char_name, sig_filter in char_sig_filters.items():
        if not sig_filter:
            continue

        if sig_filter.startswith('!'):
            # No signature weapon - exclude this weapon
            sig_name = sig_filter[1:]
            sig_where_clause += f" AND NOT (name = '{char_name}' AND weapon = {sig_name})"
        else:
            # Must have signature weapon
            sig_where_clause += f" AND NOT (name = '{char_name}' AND weapon != {sig_filter})"

    sig_cte_clause = ""
    sig_clause = sig_where_clause

    # Add sustain filter to SQL. Only applied inside node_teams: sustain status is purely a
    # function of (uid, version, floor), so re-checking it again in the final SELECT (as the
    # old code did, doubling the cost) is redundant once node_teams has already filtered on it.
    sustain_clause = ""
    if sustain_filter != "Both":
        if sustain_filter == "Yes":
            sustain_clause = """
              AND EXISTS (
                  SELECT 1 FROM player_records_anomaly pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = player_records_anomaly.uid
                    AND pr2.version = player_records_anomaly.version
                    AND pr2.floor = player_records_anomaly.floor
                    AND ci.role = 'sustain'
              )
            """
        else:
            sustain_clause = """
              AND NOT EXISTS (
                  SELECT 1 FROM player_records_anomaly pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = player_records_anomaly.uid
                    AND pr2.version = player_records_anomaly.version
                    AND pr2.floor = player_records_anomaly.floor
                    AND ci.role = 'sustain'
              )
            """

    # Build eidolon filter clause
    eidolon_filters = []
    for char_name, eidolon in zip(character_names, eidolons):
        if eidolon >= 0:
            eidolon_filters.append(f"(name = '{char_name}' AND cons = {eidolon})")

    eidolon_clause = ""
    if eidolon_filters:
        char_eidolon_filter = " OR ".join(eidolon_filters)
        eidolon_clause = f" AND ({char_eidolon_filter})"

    sql = f"""
    WITH {excluded_teams_cte}{sig_cte_clause}{',' if sig_cte_clause else ''}
    node_teams AS (
        SELECT uid, version, floor, COUNT(DISTINCT name) as char_count
        FROM player_records_anomaly
        WHERE name IN ({char_names_list}){eidolon_clause}{sustain_clause}{floor_condition}{sig_clause}
        GROUP BY uid, version, floor
        HAVING COUNT(DISTINCT name) = {len(character_names)}
        {excluded_teams_filter}
    )
    SELECT version, round_num
    FROM player_records_anomaly
    WHERE (uid, version, floor) IN (SELECT uid, version, floor FROM node_teams){eidolon_clause}{floor_condition}{sig_clause}
    """

    rows = db.execute(text(sql)).fetchall()

    if not rows:
        return []

    # Aggregate scores by version
    version_scores = {}
    for row in rows:
        version_key = str(row[0])
        if version_key not in version_scores:
            version_scores[version_key] = []
        version_scores[version_key].append(row[1])

    # Calculate aggregated scores with counts
    results = []
    for version in sorted(version_scores.keys(), key=lambda v: tuple(int(x) for x in v.split('.'))):
        scores = version_scores[version]

        # Only include versions with more than 30 teams
        if len(scores) <= 30:
            continue

        if aggregation == "median":
            sorted_scores = sorted(scores)
            if len(sorted_scores) % 2 == 0:
                score = (sorted_scores[len(sorted_scores)//2 - 1] + sorted_scores[len(sorted_scores)//2]) / 2
            else:
                score = sorted_scores[len(sorted_scores)//2]
        else:  # mean
            score = sum(scores) / len(scores)

        results.append({
            "version": version,
            "score": round(score, 2),
            "count": len(scores)
        })

    return results


def get_cost_analysis_aa(
    db: Session,
    character_name: str,
    floor_type: str,
    patch_start: str = None,
    patch_end: str = None,
    signature_lc_mode: str = "both",
    sustain_filter: str = "Both",
    aggregation: str = "mean",
    include_standard_eidolons: bool = False
) -> List[dict]:
    """Cost analysis for AA by floor type (knights 1-3 vs king_normal 4).

    Args:
        character_name: DPS character to analyze
        floor_type: "knights" (floors 1-3) or "king_normal" (floor 4)
        patch_start: minimum patch version to include
        patch_end: maximum patch version to include
        signature_lc_mode: "signature", "no-signature", or "both"
        sustain_filter: "Both", "Yes", or "No"
        aggregation: "mean" or "median"
        include_standard_eidolons: whether to count standard eidolons in cost

    Returns:
        List of dicts with bin, score, count
    """
    if floor_type == "knights":
        floor_condition = "floor IN (1, 2, 3)"
    elif floor_type == "king_normal":
        floor_condition = "floor = 4"
    else:
        return []

    # Get character info for signature check
    char_info = db.query(CharacterInfo).filter(CharacterInfo.name == character_name).first()
    if not char_info:
        return []

    # Adjust patch_start to max(released_patch, oldest_data_patch)
    from app.db.models import PlayerRecordAA
    released_patch = float(char_info.released_patch) if char_info.released_patch else 0
    oldest_data = db.query(func.min(PlayerRecordAA.version)).filter(
        PlayerRecordAA.name == character_name
    ).scalar()
    oldest_data_patch = float(oldest_data) if oldest_data else 0
    effective_patch_start = max(released_patch, oldest_data_patch)
    if patch_start:
        effective_patch_start = max(effective_patch_start, float(patch_start))
    patch_start = str(effective_patch_start)

    # Build signature filter clause
    sig_filter_clause = ""
    if char_info.signature:
        if signature_lc_mode == "signature":
            sig_filter_clause = f" AND weapon = '{char_info.signature}'"
        elif signature_lc_mode == "no-signature":
            sig_filter_clause = f" AND weapon != '{char_info.signature}'"

    # Build sustain filter
    sustain_clause = ""
    if sustain_filter != "Both":
        if sustain_filter == "Yes":
            sustain_clause = """
              AND EXISTS (
                  SELECT 1 FROM player_records_anomaly pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = scoped.uid
                    AND pr2.version = scoped.version
                    AND pr2.floor = scoped.floor
                    AND ci.role = 'sustain'
              )
            """
        else:
            sustain_clause = """
              AND NOT EXISTS (
                  SELECT 1 FROM player_records_anomaly pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = scoped.uid
                    AND pr2.version = scoped.version
                    AND pr2.floor = scoped.floor
                    AND ci.role = 'sustain'
              )
            """

    patch_filter = ""
    params = {"character_name": character_name}
    if patch_start:
        patch_filter += " AND pr.version >= :patch_start"
        params["patch_start"] = float(patch_start)
    if patch_end:
        patch_filter += " AND pr.version <= :patch_end"
        params["patch_end"] = float(patch_end)

    sql = text(f"""
        WITH scoped AS (
            SELECT
                pr.uid, pr.version, pr.floor, pr.name, pr.round_num, pr.cons, pr.weapon,
                ci.availability,
                ci.is_giveaway,
                ci.giveaway_choose_group,
                ci.free_later,
                ci.signature
            FROM player_records_anomaly pr
            INNER JOIN character_info ci ON ci.name = pr.name
            WHERE {floor_condition}{patch_filter}
        ),

        qualifying_teams AS (
            SELECT DISTINCT uid, version, floor
            FROM scoped
            WHERE name = :character_name{sig_filter_clause}
              {sustain_clause}
        ),

        team_rows AS (
            SELECT s.*
            FROM scoped s
            INNER JOIN qualifying_teams q
              ON s.uid = q.uid AND s.version = q.version AND s.floor = q.floor
        ),

        char_cost AS (
            SELECT
                uid, version, floor, name, round_num,
                giveaway_choose_group,
                CASE
                    WHEN availability != 'Limited 5*' THEN
                        {'cons' if include_standard_eidolons else '0'}

                    WHEN free_later IS NOT NULL THEN
                        CASE
                            WHEN CAST(version AS NUMERIC) < CAST(free_later AS NUMERIC) THEN cons + 1
                            ELSE {'cons' if include_standard_eidolons else '0'}
                        END

                    WHEN is_giveaway = TRUE THEN cons

                    ELSE cons + 1
                END
                +
                CASE
                    WHEN availability = 'Limited 5*'
                     AND signature IS NOT NULL
                     AND weapon = signature
                    THEN 1
                    ELSE 0
                END
                AS raw_cost
            FROM team_rows
        ),

        team_group_discounts AS (
            SELECT uid, version, floor,
                   COUNT(DISTINCT giveaway_choose_group) as discount
            FROM char_cost
            WHERE giveaway_choose_group IS NOT NULL
              AND CAST(version AS NUMERIC) >= CAST(giveaway_choose_group AS NUMERIC)
            GROUP BY uid, version, floor
        ),

        team_cost AS (
            SELECT
                cc.uid, cc.version, cc.floor,
                MAX(CASE WHEN cc.name = :character_name THEN cc.round_num END) AS round_num,
                SUM(cc.raw_cost) - COALESCE(tgd.discount, 0) AS total_cost
            FROM char_cost cc
            LEFT JOIN team_group_discounts tgd
              ON cc.uid = tgd.uid AND cc.version = tgd.version AND cc.floor = tgd.floor
            GROUP BY cc.uid, cc.version, cc.floor, tgd.discount
        ),

        binned AS (
            SELECT
                round_num,
                CASE
                    WHEN total_cost <= 10  THEN CAST(total_cost AS VARCHAR)
                    WHEN total_cost <= 15  THEN '11-15'
                    ELSE                        '16+'
                END AS bin,
                CASE
                    WHEN total_cost <= 10  THEN total_cost
                    WHEN total_cost <= 15  THEN 11
                    ELSE                        16
                END AS bin_sort_order
            FROM team_cost
            WHERE round_num IS NOT NULL AND round_num > 0
        )

        SELECT bin, COUNT(*) AS cnt,
               AVG(round_num)    AS mean_score,
               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY round_num) AS median_score,
               MIN(bin_sort_order) AS sort_key
        FROM binned
        GROUP BY bin, bin_sort_order
        HAVING COUNT(*) > 30
        ORDER BY sort_key
    """)

    rows = db.execute(sql, params).fetchall()

    results = []
    for row in rows:
        bin_label = row[0]
        count = row[1]
        mean_score = row[2]
        median_score = row[3]

        if aggregation == "median":
            score = median_score
        else:
            score = mean_score

        results.append({
            "bin": bin_label,
            "score": score,
            "count": count
        })

    return results


def get_passing_rate_trend(db: Session) -> List[dict]:
    """Get hard mode passing rate trend across all patches.

    Returns list of dicts with patch and passing_rate (percentage).
    """
    sql = text("""
        SELECT
            version,
            COUNT(DISTINCT CASE WHEN floor = 5 THEN uid ELSE NULL END)::FLOAT /
            COUNT(DISTINCT uid) * 100 AS passing_rate
        FROM player_records_anomaly
        GROUP BY version
        ORDER BY version
    """)

    results = db.execute(sql).fetchall()

    return [
        {
            'version': str(row[0]),
            'passing_rate': round(float(row[1]), 2)
        }
        for row in results
    ]


def get_hard_mode_stats(
    db: Session,
    patch: str
) -> dict:
    """Get hard mode statistics: passing rate and top 5 DPS characters for a specific patch.

    Hard mode = Floor 5 (King in Check Hard)
    Passing rate = Count(Floor=5) / Count(any floor for this patch)
    Top 5 DPS = characters appearing most frequently in clearances with eidolon info

    Returns:
        {
            'passing_rate': float,
            'top_dps': [
                {'character': str, 'eidolon_group': str, 'avg_cost': float, 'percentage': float},
                ...
            ]
        }
    """
    patch_num = float(patch)

    # Get hard mode passing rate
    sql_rate = text("""
        SELECT
            COUNT(DISTINCT CASE WHEN floor = 5 THEN uid ELSE NULL END)::FLOAT /
            COUNT(DISTINCT uid) AS passing_rate
        FROM player_records_anomaly
        WHERE version = :patch
    """)

    rate_result = db.execute(sql_rate, {"patch": patch_num}).first()
    passing_rate = float(rate_result[0]) if rate_result and rate_result[0] else 0

    # Get top 5 DPS characters with eidolons and costs
    sql_dps = text("""
        WITH teams_in_patch AS (
            SELECT DISTINCT uid, version, floor, team_id
            FROM player_records_anomaly
            WHERE version = :patch AND floor = 5
        ),
        team_members AS (
            SELECT
                t.uid, t.version, t.floor, t.team_id,
                pr.name, pr.cons,
                ci.role, ci.availability, ci.is_giveaway, ci.giveaway_choose_group, ci.free_later
            FROM teams_in_patch t
            INNER JOIN player_records_anomaly pr
              ON pr.uid = t.uid AND pr.version = t.version AND pr.floor = t.floor AND pr.team_id = t.team_id
            INNER JOIN character_info ci ON ci.name = pr.name
        ),
        team_sustain_status AS (
            SELECT
                DISTINCT uid, version, floor, team_id,
                MAX(CASE WHEN role = 'sustain' THEN 1 ELSE 0 END) AS has_sustain
            FROM team_members
            GROUP BY uid, version, floor, team_id
        ),
        char_costs AS (
            SELECT
                uid, version, floor, team_id, name, cons, role,
                CASE
                    WHEN availability != 'Limited 5*' THEN 0
                    WHEN free_later IS NOT NULL THEN
                        CASE WHEN CAST(version AS NUMERIC) < CAST(free_later AS NUMERIC) THEN cons + 1 ELSE 0 END
                    WHEN is_giveaway = TRUE THEN cons
                    ELSE cons + 1
                END +
                CASE WHEN availability = 'Limited 5*' THEN 1 ELSE 0 END AS char_cost
            FROM team_members
        ),
        team_total_costs AS (
            SELECT
                uid, version, floor, team_id,
                SUM(char_cost) AS total_team_cost
            FROM char_costs
            GROUP BY uid, version, floor, team_id
        ),
        team_dps_with_cost AS (
            SELECT
                cc.uid, cc.version, cc.floor, cc.team_id, cc.name, cc.cons,
                ttc.total_team_cost,
                tss.has_sustain,
                CASE
                    WHEN cc.cons >= 6 THEN '6'
                    WHEN cc.cons >= 2 THEN '2-5'
                    WHEN cc.cons = 1 THEN '1'
                    ELSE '0-1'
                END AS eidolon_group,
                ROW_NUMBER() OVER (PARTITION BY cc.uid, cc.version, cc.floor, cc.team_id ORDER BY cc.cons DESC) AS rn
            FROM char_costs cc
            INNER JOIN team_total_costs ttc
              ON cc.uid = ttc.uid AND cc.version = ttc.version AND cc.floor = ttc.floor AND cc.team_id = ttc.team_id
            INNER JOIN team_sustain_status tss
              ON cc.uid = tss.uid AND cc.version = tss.version AND cc.floor = tss.floor AND cc.team_id = tss.team_id
            WHERE cc.role = 'dps'
        )
        SELECT name, eidolon_group, COUNT(*) as count, AVG(total_team_cost)::FLOAT as avg_cost,
               COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_team_cost)::FLOAT, AVG(total_team_cost)::FLOAT) as median_cost,
               ROUND(100.0 * SUM(CASE WHEN has_sustain = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) AS sustain_usage_rate
        FROM team_dps_with_cost
        WHERE rn = 1
        GROUP BY name, eidolon_group
        ORDER BY count DESC
    """)

    dps_results = db.execute(sql_dps, {"patch": patch_num}).fetchall()

    # Get total number of unique hard mode teams (floor=5)
    sql_total = text("""
        SELECT COUNT(DISTINCT (uid, version, floor, team_id))
        FROM player_records_anomaly
        WHERE version = :patch AND floor = 5
    """)

    total_result = db.execute(sql_total, {"patch": patch_num}).first()
    total_teams = int(total_result[0]) if total_result and total_result[0] else 1

    # Build top 10 results
    top_dps_list = []
    for char_name, eidolon_group, count, avg_cost, median_cost, sustain_usage_rate in dps_results:
        percentage = (count / total_teams) * 100
        top_dps_list.append({
            'character': char_name,
            'eidolon_group': eidolon_group,
            'avg_cost': round(float(avg_cost), 2),
            'median_cost': round(float(median_cost), 2),
            'sustain_usage_rate': round(float(sustain_usage_rate), 2),
            'percentage': round(percentage, 2)
        })

    # Return top 10
    return {
        'passing_rate': round(passing_rate * 100, 2),
        'top_dps': top_dps_list[:10]
    }


def get_peasant_mode_stats(db: Session) -> dict:
    """Get peasant mode statistics as time series across all patches.

    Combines metric queries efficiently using GROUP BY patches.
    """
    # Metric 1 & 2: Knights and King Normal completion
    sql_completion = text("""
        WITH normal_players AS (
            SELECT DISTINCT version, uid
            FROM player_records_anomaly
            WHERE floor != 5
        ),
        with_knights AS (
            SELECT DISTINCT version, uid
            FROM player_records_anomaly
            WHERE floor IN (1, 2, 3)
            GROUP BY version, uid
            HAVING COUNT(DISTINCT floor) = 3
        ),
        with_king_normal AS (
            SELECT DISTINCT version, uid
            FROM player_records_anomaly
            WHERE floor = 4
        )
        SELECT
            np.version,
            ROUND(100.0 * COUNT(DISTINCT wk.uid) / COUNT(DISTINCT np.uid), 2) as knights_completion,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN wkn.uid IS NOT NULL THEN wk.uid ELSE NULL END) / COUNT(DISTINCT wk.uid), 2) as king_normal_completion
        FROM normal_players np
        LEFT JOIN with_knights wk ON np.version = wk.version AND np.uid = wk.uid
        LEFT JOIN with_king_normal wkn ON wk.version = wkn.version AND wk.uid = wkn.uid
        GROUP BY np.version
        ORDER BY np.version
    """)

    completion_results = db.execute(sql_completion).fetchall()

    # Metric 3: Cycle distribution
    sql_cycles = text("""
        WITH binned AS (
            SELECT
                version,
                CASE
                    WHEN round_num = 0 THEN '0'
                    WHEN round_num IN (1, 2) THEN '1-2'
                    WHEN round_num IN (3, 4) THEN '3-4'
                    ELSE '5-6'
                END AS bin,
                COUNT(*) AS cnt
            FROM player_records_anomaly
            WHERE floor = 4
            GROUP BY version, bin
        ),
        with_totals AS (
            SELECT
                version,
                bin,
                cnt,
                SUM(cnt) OVER (PARTITION BY version) AS total
            FROM binned
        )
        SELECT
            version,
            ROUND(100.0 * MAX(CASE WHEN bin = '0' THEN cnt ELSE 0 END) / MAX(total), 1) as bin_0,
            ROUND(100.0 * MAX(CASE WHEN bin = '1-2' THEN cnt ELSE 0 END) / MAX(total), 1) as bin_1_2,
            ROUND(100.0 * MAX(CASE WHEN bin = '3-4' THEN cnt ELSE 0 END) / MAX(total), 1) as bin_3_4,
            ROUND(100.0 * MAX(CASE WHEN bin = '5-6' THEN cnt ELSE 0 END) / MAX(total), 1) as bin_5_6
        FROM with_totals
        GROUP BY version
        ORDER BY version
    """)

    cycle_results = db.execute(sql_cycles).fetchall()

    # Metric 4: Average cost
    sql_cost = text("""
        WITH team_costs AS (
            SELECT
                version,
                uid,
                team_id,
                SUM(
                    CASE
                        WHEN availability != 'Limited 5*' THEN 0
                        WHEN free_later IS NOT NULL THEN
                            CASE WHEN CAST(version AS NUMERIC) < CAST(free_later AS NUMERIC) THEN cons + 1 ELSE 0 END
                        WHEN is_giveaway = TRUE THEN cons
                        ELSE cons + 1
                    END +
                    CASE WHEN availability = 'Limited 5*' THEN 1 ELSE 0 END
                ) as total_cost
            FROM player_records_anomaly pr
            INNER JOIN character_info ci ON ci.name = pr.name
            WHERE pr.floor = 4
            GROUP BY version, uid, team_id
        )
        SELECT version, ROUND(AVG(total_cost)::numeric, 2) as avg_cost
        FROM team_costs
        GROUP BY version
        ORDER BY version
    """)

    cost_results = db.execute(sql_cost).fetchall()

    # Convert to dicts for easy lookup
    completion_dict = {str(r[0]): (float(r[1]) if r[1] else 0.0, float(r[2]) if r[2] else 0.0) for r in completion_results}
    cycle_dict = {str(r[0]): (float(r[1]) if r[1] else 0.0, float(r[2]) if r[2] else 0.0, float(r[3]) if r[3] else 0.0, float(r[4]) if r[4] else 0.0) for r in cycle_results}
    cost_dict = {str(r[0]): float(r[1]) if r[1] else 0.0 for r in cost_results}

    # All versions
    all_versions = sorted(set(list(completion_dict.keys()) + list(cycle_dict.keys()) + list(cost_dict.keys())))

    result = {
        'knights_completion': [],
        'king_normal_completion': [],
        'cycle_distribution': [],
        'avg_cost': []
    }

    for version in all_versions:
        k_val, kn_val = completion_dict.get(version, (0.0, 0.0))
        b0, b1_2, b3_4, b5_6 = cycle_dict.get(version, (0.0, 0.0, 0.0, 0.0))
        c_val = cost_dict.get(version, 0.0)

        result['knights_completion'].append({'version': version, 'value': k_val})
        result['king_normal_completion'].append({'version': version, 'value': kn_val})
        result['cycle_distribution'].append({
            'version': version,
            '0': b0,
            '1-2': b1_2,
            '3-4': b3_4,
            '5-6': b5_6
        })
        result['avg_cost'].append({'version': version, 'value': c_val})

    return result
