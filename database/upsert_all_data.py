#!/usr/bin/env python3
"""
Fast upsert all data from .data folder using COPY + temp table approach.
Loads: char.csv, pf.csv, moc.csv, apo.csv
10-100x faster than row-by-row inserts.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
import time

# Load .env from root directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Data folder path
DATA_FOLDER = Path(__file__).parent.parent / ".data"

def get_connection():
    """Create database connection"""
    try:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            conn = psycopg2.connect(database_url)
        else:
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
                database=os.getenv("DB_NAME", "hsr_pf"),
                user=os.getenv("DB_USER", "hsr_user"),
                password=os.getenv("DB_PASSWORD", "hsr_password")
            )
        return conn
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        print(f"   Tried DATABASE_URL: {os.getenv('DATABASE_URL')}")
        sys.exit(1)

def upsert_characters(conn):
    """Load character_info from char.csv using COPY + temp table"""
    csv_path = DATA_FOLDER / "char.csv"

    if not csv_path.exists():
        print(f"[SKIP] {csv_path} not found")
        return 0

    print(f"\n[CHAR] Loading characters from {csv_path.name}...")

    cur = conn.cursor()
    start_time = time.time()

    try:
        # Create temp table matching CSV column order and types
        cur.execute("""
            CREATE TEMP TABLE temp_character_info (
                index TEXT,
                id INTEGER,
                rarity INTEGER,
                path VARCHAR(100),
                element VARCHAR(100),
                availability VARCHAR(100),
                slug VARCHAR(255),
                role VARCHAR(100),
                is_giveaway VARCHAR(10),
                giveaway_choose_group VARCHAR(255),
                free_later VARCHAR(255),
                signature VARCHAR(255),
                released_patch FLOAT
            )
        """)

        # Copy CSV data into temp table
        with open(csv_path, 'r', encoding='utf-8') as f:
            cur.copy_expert(
                """COPY temp_character_info
                (index, id, rarity, path, element, availability, slug, role,
                 is_giveaway, giveaway_choose_group, free_later, signature, released_patch)
                FROM STDIN WITH (FORMAT CSV, HEADER TRUE, NULL '')""",
                f
            )

        # First, update existing records to use correct CSV IDs (match by slug)
        cur.execute("""
            UPDATE character_info
            SET id = temp.id
            FROM temp_character_info temp
            WHERE character_info.slug = temp.slug
        """)
        updated_count = cur.rowcount

        # Then upsert remaining records
        cur.execute("""
            INSERT INTO character_info
            (id, name, slug, rarity, path, element, role, signature, availability,
             is_giveaway, giveaway_choose_group, free_later, released_patch)
            SELECT id, index, slug, rarity, path, element, role, signature, availability,
                   (is_giveaway = 'TRUE'), giveaway_choose_group, free_later,
                   CAST(released_patch AS VARCHAR)
            FROM temp_character_info
            WHERE slug NOT IN (SELECT slug FROM character_info)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                slug = EXCLUDED.slug,
                rarity = EXCLUDED.rarity,
                path = EXCLUDED.path,
                element = EXCLUDED.element,
                role = EXCLUDED.role,
                signature = EXCLUDED.signature,
                availability = EXCLUDED.availability,
                is_giveaway = EXCLUDED.is_giveaway,
                giveaway_choose_group = EXCLUDED.giveaway_choose_group,
                free_later = EXCLUDED.free_later,
                released_patch = EXCLUDED.released_patch
        """)
        inserted_count = cur.rowcount

        conn.commit()
        elapsed = time.time() - start_time
        print(f"   [OK] Updated {updated_count}, Inserted {inserted_count} in {elapsed:.2f}s")
        return 0

    except Exception as e:
        conn.rollback()
        print(f"   [ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 0
    finally:
        cur.close()

def upsert_player_records(conn, csv_filename, table_name):
    """Load player records using COPY + temp table"""
    csv_path = DATA_FOLDER / csv_filename

    if not csv_path.exists():
        print(f"[SKIP] {csv_path} not found")
        return 0

    print(f"\n[{table_name.upper()}] Loading from {csv_filename}...")

    cur = conn.cursor()
    start_time = time.time()

    try:
        # Create temp table matching CSV column order
        cur.execute(f"""
            CREATE TEMP TABLE temp_{table_name} (
                team_id TEXT,
                uid TEXT,
                node INTEGER,
                round_num INTEGER,
                filename TEXT,
                version FLOAT,
                name TEXT,
                weapon TEXT,
                cons INTEGER
            )
        """)

        # Copy CSV data into temp table
        with open(csv_path, 'r', encoding='utf-8') as f:
            cur.copy_expert(
                f"""COPY temp_{table_name}
                (team_id, uid, node, round_num, filename, version, name, weapon, cons)
                FROM STDIN WITH (FORMAT CSV, HEADER TRUE, NULL '')""",
                f
            )

        # Upsert from temp table to actual table, skipping rows with NULL in primary key columns
        cur.execute(f"""
            INSERT INTO {table_name}
            (team_id, filename, name, uid, node, round_num, version, weapon, cons)
            SELECT team_id, filename, name, uid, node, CAST(round_num AS FLOAT),
                   version, weapon, cons
            FROM temp_{table_name}
            WHERE team_id IS NOT NULL AND filename IS NOT NULL AND name IS NOT NULL
            ON CONFLICT (team_id, filename, name) DO UPDATE SET
                uid = EXCLUDED.uid,
                node = EXCLUDED.node,
                round_num = EXCLUDED.round_num,
                version = EXCLUDED.version,
                weapon = EXCLUDED.weapon,
                cons = EXCLUDED.cons
        """)
        inserted_count = cur.rowcount

        conn.commit()
        elapsed = time.time() - start_time
        print(f"   [OK] Upserted in {elapsed:.2f}s")
        return 0

    except Exception as e:
        conn.rollback()
        print(f"   [ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 0
    finally:
        cur.close()

def upsert_aa_records(conn):
    """Load Anomaly Arbitration records from aa.csv using COPY + temp table"""
    csv_path = DATA_FOLDER / "aa.csv"

    if not csv_path.exists():
        print(f"[SKIP] {csv_path} not found")
        return 0

    print(f"\n[AA] Loading from aa.csv...")

    cur = conn.cursor()
    start_time = time.time()

    try:
        # Create temp table matching AA CSV column order (team_id, uid, floor, round_num, filename, version, name, weapon, cons)
        cur.execute("""
            CREATE TEMP TABLE temp_player_records_anomaly (
                team_id TEXT,
                uid TEXT,
                floor INTEGER,
                round_num INTEGER,
                filename TEXT,
                version FLOAT,
                name TEXT,
                weapon TEXT,
                cons INTEGER
            )
        """)

        # Copy CSV data into temp table
        with open(csv_path, 'r', encoding='utf-8') as f:
            cur.copy_expert(
                """COPY temp_player_records_anomaly
                (team_id, uid, floor, round_num, filename, version, name, weapon, cons)
                FROM STDIN WITH (FORMAT CSV, HEADER TRUE, NULL '')""",
                f
            )

        # Upsert from temp table to actual table with 5-column primary key
        cur.execute("""
            INSERT INTO player_records_anomaly
            (filename, uid, team_id, floor, name, round_num, version, weapon, cons)
            SELECT filename, uid, team_id, floor, name, CAST(round_num AS INTEGER),
                   version, weapon, cons
            FROM temp_player_records_anomaly
            WHERE filename IS NOT NULL AND uid IS NOT NULL AND team_id IS NOT NULL
              AND floor IS NOT NULL AND name IS NOT NULL
            ON CONFLICT (filename, uid, team_id, floor, name) DO UPDATE SET
                round_num = EXCLUDED.round_num,
                version = EXCLUDED.version,
                weapon = EXCLUDED.weapon,
                cons = EXCLUDED.cons
        """)
        inserted_count = cur.rowcount

        conn.commit()
        elapsed = time.time() - start_time
        print(f"   [OK] Upserted in {elapsed:.2f}s")
        return 0

    except Exception as e:
        conn.rollback()
        print(f"   [ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 0
    finally:
        cur.close()

def main():
    """Main upsert function"""
    print("=" * 60)
    print("HSR PF Database Upsert (COPY + Temp Table)")
    print("=" * 60)

    if not DATA_FOLDER.exists():
        print(f"[ERROR] Data folder not found: {DATA_FOLDER}")
        sys.exit(1)

    print(f"\n[DATA] Folder: {DATA_FOLDER}")

    conn = get_connection()
    print("[OK] Connected to database")

    start_time = time.time()

    # Load each CSV file
    upsert_characters(conn)
    upsert_player_records(conn, "pf.csv", "player_records_pf")
    upsert_player_records(conn, "moc.csv", "player_records_moc")
    upsert_player_records(conn, "apo.csv", "player_records_as")
    upsert_aa_records(conn)

    conn.close()

    total_elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"[OK] Complete in {total_elapsed:.2f}s")
    print("=" * 60)

if __name__ == "__main__":
    main()
