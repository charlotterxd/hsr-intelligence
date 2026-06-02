#!/usr/bin/env python3
"""
Complete database setup script.
Ensures database exists, creates all tables, and loads data from CSVs.
"""

import os
import sys
import psycopg2
from psycopg2 import sql
from pathlib import Path

def load_env_file():
    """Load environment variables from .env file (root or local)"""
    # Try root .env first, then local .env
    env_paths = [
        Path(__file__).parent.parent / '.env',  # Root .env
        Path(__file__).parent / '.env'           # Local .env (fallback)
    ]

    for env_path in env_paths:
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            os.environ.setdefault(key.strip(), value.strip())
            print(f"✓ Loaded environment from {env_path}")
            return

    print("⚠ No .env file found. Using environment variables or defaults.")

# Load .env file if it exists
load_env_file()

def get_admin_connection():
    """Create connection as admin (to create database)"""
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        # Extract connection params from DATABASE_URL
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        return psycopg2.connect(
            host=parsed.hostname or 'localhost',
            port=parsed.port or 5432,
            database='postgres',  # Connect to default postgres DB
            user=parsed.username or 'postgres',
            password=parsed.password or 'postgres'
        )
    else:
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '5432')),
            database='postgres',
            user=os.getenv('DB_ADMIN_USER', 'postgres'),
            password=os.getenv('DB_ADMIN_PASSWORD', 'postgres')
        )

def get_connection():
    """Create connection to HSR database"""
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return psycopg2.connect(db_url)
    else:
        return psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '5432')),
            database=os.getenv('DB_NAME', 'hsr_pf'),
            user=os.getenv('DB_USER', 'hsr_user'),
            password=os.getenv('DB_PASSWORD', 'hsr_password')
        )

def create_database():
    """Create database if it doesn't exist"""
    db_name = os.getenv('DB_NAME', 'hsr_pf')

    try:
        admin_conn = get_admin_connection()
        admin_conn.autocommit = True

        with admin_conn.cursor() as cur:
            # Check if database exists
            cur.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (db_name,)
            )

            if not cur.fetchone():
                print(f"Creating database '{db_name}'...")
                cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
                print(f"  ✓ Database '{db_name}' created")
            else:
                print(f"✓ Database '{db_name}' already exists")

        admin_conn.close()
    except Exception as e:
        print(f"✗ Error creating database: {e}")
        raise

def create_tables(conn):
    """Create all tables from init.sql"""
    print("\nCreating tables...")

    try:
        # Read and execute init.sql
        init_sql_path = Path(__file__).parent / 'init.sql'
        if init_sql_path.exists():
            with open(init_sql_path, 'r') as f:
                sql_content = f.read()

            with conn.cursor() as cur:
                # Execute each statement separately
                for statement in sql_content.split(';'):
                    statement = statement.strip()
                    if statement and not statement.startswith('--'):
                        cur.execute(statement)
                        print(f"  ✓ {statement[:60]}...")

                conn.commit()
        else:
            print(f"✗ init.sql not found at {init_sql_path}")
            raise FileNotFoundError(f"init.sql not found")
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        raise

def verify_csv_files():
    """Check if required CSV files exist"""
    print("\nVerifying CSV files...")

    data_dir = Path(__file__).parent.parent / '.data'
    required_files = ['char.csv', 'pf.csv', 'moc.csv', 'apo.csv']

    for csv_file in required_files:
        csv_path = data_dir / csv_file
        if csv_path.exists():
            size_mb = csv_path.stat().st_size / (1024 * 1024)
            print(f"  ✓ {csv_file} ({size_mb:.1f} MB)")
        else:
            print(f"  ✗ {csv_file} not found at {csv_path}")
            raise FileNotFoundError(f"{csv_file} not found in .data folder")

def load_all_data(conn):
    """Load all data using COPY + temp table approach"""
    print("\nLoading data...")

    # Import the load_all_data logic here
    import csv
    import tempfile

    tables_to_load = [
        ('character_info', '.data/char.csv', False),
        ('player_records_pf', '.data/pf.csv', True),
        ('player_records_moc', '.data/moc.csv', True),
        ('player_records_as', '.data/apo.csv', True),
    ]

    # Change to database directory for relative paths
    os.chdir(Path(__file__).parent)

    for table_name, csv_path, is_player_records in tables_to_load:
        print(f"\n  Loading {table_name}...")

        if not Path(csv_path).exists():
            print(f"    ✗ {csv_path} not found")
            continue

        try:
            with conn.cursor() as cur:
                if is_player_records:
                    load_player_records_table(conn, cur, csv_path, table_name)
                else:
                    load_character_table(conn, cur, csv_path, table_name)
        except Exception as e:
            print(f"    ✗ Error loading {table_name}: {e}")
            raise

def load_player_records_table(conn, cur, csv_path, table_name):
    """Load player_records table using COPY + temp table"""
    import csv
    import tempfile

    # Create temp table
    cur.execute(f"""
        CREATE TEMP TABLE temp_{table_name} (
            team_id TEXT,
            filename TEXT,
            name TEXT,
            uid TEXT,
            node INTEGER,
            round_num FLOAT,
            version FLOAT,
            weapon TEXT,
            cons INTEGER
        )
    """)

    # Prepare temp CSV file for COPY
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        columns = list(reader.fieldnames)

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv') as tmp:
            writer = csv.writer(tmp)
            writer.writerow(columns)

            f.seek(0)
            reader = csv.DictReader(f)
            row_count = 0
            for row in reader:
                try:
                    values = [
                        row.get('team_id'),
                        row.get('filename'),
                        row.get('name'),
                        row.get('uid'),
                        row.get('node'),
                        row.get('round_num'),
                        row.get('version'),
                        row.get('weapon'),
                        row.get('cons')
                    ]
                    writer.writerow(values)
                    row_count += 1
                except:
                    continue

            tmp_path = tmp.name

    # COPY to temp table
    try:
        with open(tmp_path, 'r') as f:
            cur.copy_expert(
                f"COPY temp_{table_name} FROM STDIN WITH (FORMAT CSV, HEADER, NULL '')",
                f
            )
        os.unlink(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        raise e

    # Upsert from temp table
    cur.execute(f"""
        INSERT INTO {table_name}
        (team_id, filename, name, uid, node, round_num, version, weapon, cons)
        SELECT team_id, filename, name, uid, node, round_num, version, weapon, cons
        FROM temp_{table_name}
        ON CONFLICT (team_id, filename, name) DO UPDATE SET
            uid = EXCLUDED.uid,
            node = EXCLUDED.node,
            round_num = EXCLUDED.round_num,
            version = EXCLUDED.version,
            weapon = EXCLUDED.weapon,
            cons = EXCLUDED.cons
    """)

    conn.commit()
    print(f"    ✓ Loaded {row_count} rows into {table_name}")

def load_character_table(conn, cur, csv_path, table_name):
    """Load character_info table using COPY + temp table"""
    import csv
    import tempfile

    # Create temp table
    cur.execute(f"""
        CREATE TEMP TABLE temp_{table_name} (
            name VARCHAR(255),
            slug VARCHAR(255),
            rarity INTEGER,
            path VARCHAR(100),
            element VARCHAR(100),
            role VARCHAR(100),
            signature VARCHAR(255),
            availability VARCHAR(100),
            is_giveaway VARCHAR(10),
            giveaway_choose_group VARCHAR(255),
            free_later VARCHAR(255),
            released_patch VARCHAR(50)
        )
    """)

    # Prepare temp CSV file for COPY
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv') as tmp:
            writer = csv.writer(tmp)
            columns = ['name', 'slug', 'rarity', 'path', 'element', 'role', 'signature',
                      'availability', 'is_giveaway', 'giveaway_choose_group', 'free_later', 'released_patch']
            writer.writerow(columns)

            f.seek(0)
            reader = csv.DictReader(f)
            row_count = 0
            for row in reader:
                try:
                    is_giveaway = row.get('is_giveaway', 'FALSE').upper()
                    if is_giveaway not in ['TRUE', 'FALSE']:
                        is_giveaway = 'FALSE'

                    values = [
                        row.get('index') or row.get('name'),
                        row.get('slug'),
                        row.get('rarity'),
                        row.get('path'),
                        row.get('element'),
                        row.get('role'),
                        row.get('signature'),
                        row.get('availability'),
                        is_giveaway,
                        row.get('giveaway_choose_group'),
                        row.get('free_later'),
                        row.get('released_patch')
                    ]
                    writer.writerow(values)
                    row_count += 1
                except:
                    continue

            tmp_path = tmp.name

    # COPY to temp table
    try:
        with open(tmp_path, 'r') as f:
            cur.copy_expert(
                f"COPY temp_{table_name} FROM STDIN WITH (FORMAT CSV, HEADER, NULL '')",
                f
            )
        os.unlink(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        raise e

    # Upsert from temp table
    cur.execute(f"""
        INSERT INTO {table_name}
        (name, slug, rarity, path, element, role, signature, availability,
         is_giveaway, giveaway_choose_group, free_later, released_patch)
        SELECT name, slug, rarity, path, element, role, signature, availability,
               (is_giveaway = 'TRUE'), giveaway_choose_group, free_later, released_patch
        FROM temp_{table_name}
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
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

    conn.commit()
    print(f"    ✓ Loaded {row_count} rows into {table_name}")

def main():
    print("=" * 80)
    print("HSR Pure Fiction Database Setup")
    print("=" * 80)

    try:
        # Step 1: Verify CSVs exist
        verify_csv_files()

        # Step 2: Create database
        create_database()

        # Step 3: Connect and create tables
        conn = get_connection()
        conn.autocommit = False
        create_tables(conn)

        # Step 4: Load data
        load_all_data(conn)

        conn.close()

        print("\n" + "=" * 80)
        print("✓ Database setup complete!")
        print("=" * 80)

    except Exception as e:
        print(f"\n✗ Setup failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
