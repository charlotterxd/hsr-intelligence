"""Memory of Chaos CRUD functions - same logic as PF but using player_records_moc table"""
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.db.models import CharacterInfo
from app.db import crud
from typing import List


def get_score_trends_moc(
    db: Session,
    character_names: List[str],
    eidolons: List[int],
    signature_lc_modes: List[str],
    sustain_filter: str = "Both",
    aggregation: str = "mean",
    exclude_characters: List[str] = None
) -> List[dict]:
    """Get score trends for MOC using player_records_moc table - matches PF implementation"""
    if not character_names:
        return []
    if exclude_characters is None:
        exclude_characters = []

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

    # Add exclude filter if any characters are excluded
    exclude_clause = ""
    if exclude_characters:
        exclude_names_list = ','.join([f"'{name}'" for name in exclude_characters])
        exclude_clause = f"""
        AND NOT EXISTS (
            SELECT 1 FROM player_records_moc pr2
            WHERE pr2.uid = player_records_moc.uid
              AND pr2.version = player_records_moc.version
              AND pr2.node = player_records_moc.node
              AND pr2.name IN ({exclude_names_list})
        )
        """

    # Add signature LC filters
    sig_filters = []
    for char_name, sig_filter in char_sig_filters.items():
        if sig_filter and sig_filter.startswith('!'):
            sig_name = sig_filter[1:]
            sig_filters.append(f"""
        NOT EXISTS (
            SELECT 1 FROM player_records_moc pr2
            WHERE pr2.uid = player_records_moc.uid
              AND pr2.version = player_records_moc.version
              AND pr2.node = player_records_moc.node
              AND pr2.name = '{char_name}'
              AND pr2.weapon = {sig_name}
        )
        """)
        elif sig_filter:
            sig_filters.append(f"""
        NOT EXISTS (
            SELECT 1 FROM player_records_moc pr2
            WHERE pr2.uid = player_records_moc.uid
              AND pr2.version = player_records_moc.version
              AND pr2.node = player_records_moc.node
              AND pr2.name = '{char_name}'
              AND pr2.weapon != {sig_filter}
        )
        """)

    sig_clause = " AND ".join(sig_filters) if sig_filters else ""
    if sig_clause:
        sig_clause = " AND " + sig_clause

    # Add sustain filter to SQL
    sustain_clause = ""
    if sustain_filter != "Both":
        if sustain_filter == "Yes":
            sustain_clause = """
              AND EXISTS (
                  SELECT 1 FROM player_records_moc pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = player_records_moc.uid
                    AND pr2.version = player_records_moc.version
                    AND pr2.node = player_records_moc.node
                    AND ci.role = 'sustain'
              )
            """
        else:
            sustain_clause = """
              AND NOT EXISTS (
                  SELECT 1 FROM player_records_moc pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = player_records_moc.uid
                    AND pr2.version = player_records_moc.version
                    AND pr2.node = player_records_moc.node
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
    WITH filtered_records AS (
        SELECT DISTINCT uid, version, node
        FROM player_records_moc
        WHERE name IN ({char_names_list})
          {exclude_clause}{sig_clause}{eidolon_clause}{sustain_clause}
    ),
    grouped_nodes AS (
        SELECT uid, version, node, COUNT(DISTINCT name) as char_count
        FROM player_records_moc
        WHERE (uid, version, node) IN (SELECT uid, version, node FROM filtered_records)
          AND name IN ({char_names_list})
        GROUP BY uid, version, node
        HAVING COUNT(DISTINCT name) = {len(character_names)}
    )
    SELECT team_id, filename, name, uid, version, node, round_num, cons, weapon
    FROM player_records_moc
    WHERE (uid, version, node) IN (SELECT uid, version, node FROM grouped_nodes)
      {exclude_clause}{sig_clause}{eidolon_clause}{sustain_clause}
    """

    from app.db.models import PlayerRecordMOC
    matching_records = db.query(PlayerRecordMOC).from_statement(text(sql)).all()

    if not matching_records:
        return []

    # Extract unique nodes
    all_nodes = {(r.uid, r.version, r.node) for r in matching_records}

    # Aggregate scores by version
    version_scores = {}
    for record in matching_records:
        if (record.uid, record.version, record.node) in all_nodes:
            version_key = str(record.version)
            if version_key not in version_scores:
                version_scores[version_key] = []
            version_scores[version_key].append(record.round_num)

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


def get_all_patches_moc_tierlist(db: Session) -> List[str]:
    """Get all distinct patches from player_records_moc, sorted numerically"""
    sql = text("SELECT DISTINCT version FROM player_records_moc ORDER BY version ASC")
    patches = db.execute(sql).fetchall()
    patch_strs = [str(p[0]) for p in patches]
    patch_strs.sort(key=lambda v: float(v))
    return patch_strs


def get_tierlist_moc(
    db: Session,
    patch: str = None,
    excluded_characters: List[str] = None,
    signature_only: bool = False,
    min_samples: int = 30
) -> List[dict]:
    """Get tier list data for MOC at E0 — median cycles per character (lower is better)"""
    if excluded_characters is None:
        excluded_characters = []

    patch_clause = ""
    if patch:
        patch_clause = f"AND r.version = {float(patch)}"

    exclude_clause = ""
    if excluded_characters:
        names = ','.join([f"'{n.replace(chr(39), chr(39)*2)}'" for n in excluded_characters])
        exclude_clause = f"""AND NOT EXISTS (
              SELECT 1 FROM player_records_moc pr_exc
              WHERE pr_exc.uid = r.uid
                AND pr_exc.version = r.version
                AND pr_exc.node = r.node
                AND pr_exc.name IN ({names})
          )"""

    sig_clause = ""
    if signature_only:
        sig_clause = "AND ci.signature IS NOT NULL AND ci.signature != '' AND r.weapon = ci.signature"

    sql = text(f"""
        WITH filtered_nodes AS (
            SELECT DISTINCT
                r.uid, r.version, r.node, r.round_num,
                r.name
            FROM player_records_moc r
            INNER JOIN character_info ci ON ci.name = r.name
            WHERE r.cons = 0
              AND r.round_num >= 0
              {sig_clause}
              {patch_clause}
              {exclude_clause}
              AND NOT EXISTS (
                  SELECT 1 FROM player_records_moc pr_e
                  INNER JOIN character_info ci_e ON ci_e.name = pr_e.name
                  WHERE pr_e.uid = r.uid
                    AND pr_e.version = r.version
                    AND pr_e.node = r.node
                    AND ci_e.availability = 'Limited 5*'
                    AND pr_e.cons > 0
              )
        )
        SELECT
            fn.name,
            ci.id,
            ci.role,
            ci.element,
            AVG(fn.round_num) AS mean_score,
            COUNT(*) AS sample_count
        FROM filtered_nodes fn
        INNER JOIN character_info ci ON ci.name = fn.name
        GROUP BY fn.name, ci.id, ci.role, ci.element
        HAVING COUNT(*) > :min_samples
        ORDER BY mean_score ASC
    """)

    rows = db.execute(sql, {"min_samples": min_samples}).fetchall()

    results = []
    for row in rows:
        name, char_id, role, element, mean_score, sample_count = row
        results.append({
            "name": name,
            "id": char_id,
            "role": role or "Unknown",
            "element": element or "Unknown",
            "median_score": round(float(mean_score), 2),
            "sample_count": int(sample_count)
        })

    return results


def get_available_patches_moc(db: Session, character_name: str) -> List[str]:
    """Get all patches where a character appears in MOC, sorted"""
    sql = text("""
        SELECT DISTINCT version FROM player_records_moc
        WHERE name = :name
        ORDER BY version ASC
    """)
    patches = db.execute(sql, {"name": character_name}).fetchall()
    return [p[0] for p in patches]


def get_cost_analysis_moc(
    db: Session,
    character_name: str,
    patch_start: str,
    patch_end: str,
    signature_lc_mode: str = "both",
    sustain_filter: str = "Both",
    aggregation: str = "mean",
    include_standard_eidolons: bool = False
) -> List[dict]:
    """Cost analysis for MOC using player_records_moc"""
    # Get character info
    char_info = db.query(CharacterInfo).filter(CharacterInfo.name == character_name).first()
    if not char_info:
        return []

    # Adjust patch_start to max(released_patch, oldest_data_patch)
    from app.db.models import PlayerRecordMOC
    released_patch = float(char_info.released_patch) if char_info.released_patch else 0
    oldest_data = db.query(func.min(PlayerRecordMOC.version)).filter(
        PlayerRecordMOC.name == character_name
    ).scalar()
    oldest_data_patch = float(oldest_data) if oldest_data else 0
    effective_patch_start = max(released_patch, oldest_data_patch, float(patch_start))
    patch_start = str(effective_patch_start)

    # Build sustain filter
    sustain_clause = ""
    if sustain_filter != "Both":
        if sustain_filter == "Yes":
            sustain_clause = """
              AND EXISTS (
                  SELECT 1 FROM player_records_moc pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = scoped.uid
                    AND pr2.version = scoped.version
                    AND pr2.node = scoped.node
                    AND ci.role = 'sustain'
              )
            """
        else:
            sustain_clause = """
              AND NOT EXISTS (
                  SELECT 1 FROM player_records_moc pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = scoped.uid
                    AND pr2.version = scoped.version
                    AND pr2.node = scoped.node
                    AND ci.role = 'sustain'
              )
            """

    sql = text(f"""
        WITH scoped AS (
            SELECT
                pr.uid, pr.version, pr.node, pr.name, pr.round_num, pr.cons, pr.weapon,
                ci.availability,
                ci.is_giveaway,
                ci.giveaway_choose_group,
                ci.free_later,
                ci.signature
            FROM player_records_moc pr
            INNER JOIN character_info ci ON ci.name = pr.name
            WHERE pr.version >= :patch_start
              AND pr.version <= :patch_end
        ),

        qualifying_nodes AS (
            SELECT DISTINCT uid, version, node
            FROM scoped
            WHERE name = :character_name
              {sustain_clause}
        ),

        team_rows AS (
            SELECT s.*
            FROM scoped s
            INNER JOIN qualifying_nodes q
              ON s.uid = q.uid AND s.version = q.version AND s.node = q.node
        ),

        char_cost AS (
            SELECT
                uid, version, node, name, round_num,
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

        node_group_discounts AS (
            SELECT uid, version, node,
                   COUNT(DISTINCT giveaway_choose_group) as discount
            FROM char_cost
            WHERE giveaway_choose_group IS NOT NULL
              AND CAST(version AS NUMERIC) >= CAST(giveaway_choose_group AS NUMERIC)
            GROUP BY uid, version, node
        ),

        node_cost AS (
            SELECT
                cc.uid, cc.version, cc.node,
                MAX(CASE WHEN cc.name = :character_name THEN cc.round_num END) AS round_num,
                SUM(cc.raw_cost) - COALESCE(ngd.discount, 0) AS total_cost
            FROM char_cost cc
            LEFT JOIN node_group_discounts ngd
              ON cc.uid = ngd.uid AND cc.version = ngd.version AND cc.node = ngd.node
            GROUP BY cc.uid, cc.version, cc.node, ngd.discount
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
            FROM node_cost
            WHERE round_num IS NOT NULL
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

    rows = db.execute(sql, {
        "character_name": character_name,
        "patch_start": patch_start,
        "patch_end": patch_end
    }).fetchall()

    results = []
    for row in rows:
        bin_label = row[0]
        count = row[1]
        mean_score = row[2]
        median_score = row[3]

        if aggregation == "mean":
            score = mean_score
        else:
            score = median_score

        results.append({
            "bin": bin_label,
            "score": score,
            "count": count
        })

    return results


def get_survival_analysis_moc(
    db: Session,
    character_name: str,
    eidolon: int = -1,
    signature_lc_mode: str = "both",
    sustain_filter: str = "Both",
    aggregation: str = "mean"
) -> List[dict]:
    """Survival analysis for MOC using player_records_moc - matches PF implementation"""
    char_info = db.query(CharacterInfo).filter(CharacterInfo.name == character_name).first()
    if not char_info or not char_info.released_patch:
        return []

    released_patch = char_info.released_patch

    # Build eidolon clause
    eidolon_clause = ""
    if eidolon >= 0:
        eidolon_clause = f"AND pr.cons = {eidolon}"

    # Build signature LC clause
    sig_clause = ""
    if char_info.signature:
        if signature_lc_mode == "signature":
            sig_clause = f"AND pr.weapon = '{char_info.signature}'"
        elif signature_lc_mode == "no-signature":
            sig_clause = f"AND pr.weapon != '{char_info.signature}'"

    # Build sustain clause
    sustain_clause = ""
    if sustain_filter != "Both":
        if sustain_filter == "Yes":
            sustain_clause = f"""
              AND EXISTS (
                  SELECT 1 FROM player_records_moc pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = pr.uid
                    AND pr2.version = pr.version
                    AND pr2.node = pr.node
                    AND ci.role = 'sustain'
              )
            """
        else:  # "No"
            sustain_clause = f"""
              AND NOT EXISTS (
                  SELECT 1 FROM player_records_moc pr2
                  INNER JOIN character_info ci ON ci.name = pr2.name
                  WHERE pr2.uid = pr.uid
                    AND pr2.version = pr.version
                    AND pr2.node = pr.node
                    AND ci.role = 'sustain'
              )
            """

    # Query all records for this character (filter for score > 2000 in MOC)
    sql = text(f"""
        SELECT pr.version, pr.round_num
        FROM player_records_moc pr
        WHERE pr.name = :character_name
          {eidolon_clause}
          {sig_clause}
          {sustain_clause}
    """)

    records = db.execute(sql, {"character_name": character_name}).fetchall()

    if not records:
        return []

    # Get all distinct patches from MOC data
    moc_patches = db.execute(text("SELECT DISTINCT version FROM player_records_moc ORDER BY version")).fetchall()
    all_patches = [str(p[0]) for p in moc_patches]

    # Sort numerically
    all_patches.sort(key=lambda v: tuple(int(x) for x in v.split('.')))

    # Include released_patch in the patch ordering even if it's not in data
    if released_patch not in all_patches:
        all_patches.append(released_patch)
        all_patches.sort(key=lambda v: tuple(int(x) for x in v.split('.')))

    # Build patch index dict and reverse mapping
    patch_index = {patch: i for i, patch in enumerate(all_patches)}
    index_to_patch = {i: patch for patch, i in patch_index.items()}

    # Group by patches_since_release
    survival_data = {}
    released_index = patch_index[released_patch]

    for record in records:
        version = str(record.version)
        round_num = record.round_num
        patches_since = patch_index[version] - released_index

        # Clamp negative patches to 0
        if patches_since < 0:
            patches_since = 0

        if patches_since not in survival_data:
            survival_data[patches_since] = []
        survival_data[patches_since].append(round_num)

    # Calculate aggregated scores
    results = []
    for patches_since in sorted(survival_data.keys()):
        scores = survival_data[patches_since]

        # Only include with more than 30 teams
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

        # Get actual patch number for this offset
        actual_patch_index = released_index + patches_since
        actual_patch = index_to_patch.get(actual_patch_index, "Unknown")

        results.append({
            "patches_since": patches_since,
            "patch": actual_patch,
            "score": round(score, 2),
            "count": len(scores)
        })

    return results
