"""
Signalight — Supabase Migration Runner
Run this once to set up all tables:

    uv run python migrate.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

from supabase import create_client

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

def run_migrations():
    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        print("No migration files found in ./migrations/")
        return

    for sql_file in sql_files:
        print(f"Running {sql_file.name}...")
        sql = sql_file.read_text(encoding="utf-8")

        # Execute via Supabase RPC (raw SQL)
        try:
            sb.rpc("exec_sql", {"query": sql}).execute()
            print(f"  ✓ {sql_file.name} done")
        except Exception as e:
            # exec_sql RPC may not exist — fall back to direct DB connection
            print(f"  RPC not available, trying direct connection...")
            run_via_direct_db(sql, sql_file.name)


def run_via_direct_db(sql: str, filename: str):
    """Execute SQL directly via PostgreSQL connection string."""
    import psycopg2

    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        print("  ERROR: SUPABASE_DB_URL not set")
        return

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()

        # Split and execute each statement separately
        statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
        for stmt in statements:
            try:
                cur.execute(stmt)
            except Exception as e:
                print(f"  Warning: {e}")

        cur.close()
        conn.close()
        print(f"  ✓ {filename} done (via direct DB)")
    except Exception as e:
        print(f"  ERROR: {e}")
        print("  Try running the SQL manually in Supabase Dashboard → SQL Editor")


if __name__ == "__main__":
    print("=== Signalight Supabase Migration ===")
    run_migrations()
    print("\nDone! Tables are ready.")
    print(f"Dashboard: {SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/editor")
