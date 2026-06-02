#!/usr/bin/env python3
"""
Reinitialize database schema by running init.sql
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2

# Load .env from root directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

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
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

def main():
    """Run init.sql to create schema (preserves existing data)"""
    print("=" * 60)
    print("Initialize Database Schema")
    print("=" * 60)
    print("\n[NOTE] This creates tables if they don't exist.")
    print("[NOTE] Existing data is PRESERVED.")
    print("[NOTE] To reset, manually run DROP TABLE commands.")

    init_sql_path = Path(__file__).parent / "init.sql"

    if not init_sql_path.exists():
        print(f"\n[ERROR] {init_sql_path} not found")
        sys.exit(1)

    conn = get_connection()
    print("\n[OK] Connected to database")

    cur = conn.cursor()

    try:
        with open(init_sql_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()

        # Execute the SQL script
        cur.execute(sql_script)
        conn.commit()

        print("[OK] Schema initialized successfully")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        cur.close()
        conn.close()

    print("=" * 60)
    print("[OK] Ready for upsert!")
    print("=" * 60)

if __name__ == "__main__":
    main()
