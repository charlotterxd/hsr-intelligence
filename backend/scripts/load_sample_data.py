#!/usr/bin/env python3
"""Load sample data from CSV files into PostgreSQL."""

import os
import sys
import csv
from pathlib import Path
from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

project_root = Path('/app').parent if Path('/app').exists() else Path(__file__).parent.parent.parent

def load_character_info():
    """Load character_info.csv into character_info table"""
    char_path = None
    for possible_path in [Path('/.data/char.csv'), project_root / '.data' / 'char.csv']:
        if possible_path.exists():
            char_path = possible_path
            break

    if not char_path or not char_path.exists():
        print(f"Error: char.csv not found", file=sys.stderr)
        return False

    engine = create_engine(DATABASE_URL)

    try:
        # Clear existing data
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM character_info"))
            conn.commit()

        # Read and insert character data
        count = 0
        with open(char_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                name = row.get('index')
                if not name:
                    continue

                # Parse boolean
                is_giveaway = row.get('is_giveaway', 'FALSE').upper() in ['TRUE', '1', 'YES']

                # Build insert query
                sql = text("""
                    INSERT INTO character_info (name, id, slug, rarity, path, element, role, signature, availability, is_giveaway, giveaway_choose_group, free_later, released_patch)
                    VALUES (:name, :id, :slug, :rarity, :path, :element, :role, :signature, :availability, :is_giveaway, :giveaway_choose_group, :free_later, :released_patch)
                """)

                params = {
                    'name': name,
                    'id': int(row.get('id', 0)) if row.get('id') else None,
                    'slug': row.get('slug'),
                    'rarity': int(row.get('rarity', 0)) if row.get('rarity') else None,
                    'path': row.get('path'),
                    'element': row.get('element'),
                    'role': row.get('role'),
                    'signature': row.get('signature') if row.get('signature') else None,
                    'availability': row.get('availability'),
                    'is_giveaway': is_giveaway,
                    'giveaway_choose_group': row.get('giveaway_choose_group') if row.get('giveaway_choose_group') else None,
                    'free_later': row.get('free_later') if row.get('free_later') else None,
                    'released_patch': row.get('released_patch') if row.get('released_patch') else None,
                }

                with engine.connect() as conn:
                    conn.execute(sql, params)
                    conn.commit()

                count += 1

        print(f"✅ Loaded {count} characters into character_info table")
        return True

    except Exception as e:
        print(f"Error loading character_info: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False
    finally:
        engine.dispose()

def load_player_records():
    """Load pf.csv into player_records table using pandas"""
    import pandas as pd

    pf_path = None
    for possible_path in [Path('/.data/pf.csv'), project_root / '.data' / 'pf.csv']:
        if possible_path.exists():
            pf_path = possible_path
            break

    if not pf_path or not pf_path.exists():
        print(f"Error: pf.csv not found", file=sys.stderr)
        return False

    engine = create_engine(DATABASE_URL)

    try:
        # Read CSV with pandas
        print("Reading pf.csv...")
        df = pd.read_csv(pf_path, low_memory=False)
        print(f"  Read {len(df)} rows from pf.csv")

        # Ensure correct dtypes
        df['team_id'] = df['team_id'].astype(int)
        df['node'] = df['node'].astype(int)
        df['round_num'] = df['round_num'].astype(int)
        df['cons'] = df['cons'].astype(int).fillna(0)
        df['version'] = df['version'].astype(float)

        # Filter out rows with missing key columns
        df = df.dropna(subset=['team_id', 'filename', 'name'])
        print(f"  After filtering: {len(df)} rows")

        # Batch insert with UPSERT using ON CONFLICT
        chunk_size = 5000
        total_chunks = (len(df) + chunk_size - 1) // chunk_size

        for chunk_idx, i in enumerate(range(0, len(df), chunk_size)):
            chunk = df.iloc[i:i+chunk_size]

            # Build UPSERT query
            values_list = []
            for _, row in chunk.iterrows():
                values_list.append(f"({row['team_id']}, '{row['filename'].replace(chr(39), chr(39)*2)}', '{row['name'].replace(chr(39), chr(39)*2)}', '{row['uid'].replace(chr(39), chr(39)*2)}', {row['node']}, {row['round_num']}, {row['version'] if pd.notna(row['version']) else 'NULL'}, '{row['weapon'].replace(chr(39), chr(39)*2) if pd.notna(row['weapon']) else 'NULL'}', {row['cons']})")

            sql = f"""
            INSERT INTO player_records_pf (team_id, filename, name, uid, node, round_num, version, weapon, cons)
            VALUES {','.join(values_list)}
            ON CONFLICT (team_id, filename, name) DO UPDATE SET
                uid = EXCLUDED.uid,
                node = EXCLUDED.node,
                round_num = EXCLUDED.round_num,
                version = EXCLUDED.version,
                weapon = EXCLUDED.weapon,
                cons = EXCLUDED.cons
            """

            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()

            chunk_idx_display = chunk_idx + 1
            print(f"  Loaded chunk {chunk_idx_display}/{total_chunks}: {len(chunk)} records")

        print(f"✅ Loaded {len(df)} player records into player_records table")
        return True

    except Exception as e:
        print(f"Error loading player_records: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False
    finally:
        engine.dispose()

if __name__ == '__main__':
    print("Loading sample data...")
    success = True
    success = load_character_info() and success
    success = load_player_records() and success

    if success:
        print("\n✅ All data loaded successfully!")
        sys.exit(0)
    else:
        print("\n❌ Data loading completed with errors", file=sys.stderr)
        sys.exit(1)
