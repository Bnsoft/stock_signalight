import json
import logging
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from src.config import DB_PATH, WATCHLIST

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
#  Supabase client (optional — falls back to SQLite if not configured) #
# ------------------------------------------------------------------ #

_supabase = None


def _get_supabase():
    """Return a Supabase client if credentials are present, else None."""
    global _supabase
    if _supabase is not None:
        return _supabase

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None

    try:
        from supabase import create_client
        _supabase = create_client(url, key)
        logger.info("Supabase client initialised")
    except Exception as e:
        logger.warning(f"Supabase init failed — falling back to SQLite: {e}")
        _supabase = None

    return _supabase


# ------------------------------------------------------------------ #
#  SQLite helpers (local fallback)                                     #
# ------------------------------------------------------------------ #

def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    """Create local SQLite tables and seed the default watchlist."""
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS signals (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol             TEXT    NOT NULL,
                signal_type        TEXT    NOT NULL,
                severity           TEXT    NOT NULL,
                message            TEXT,
                indicator_snapshot TEXT,
                price_at_signal    REAL,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS watchlist (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol   TEXT UNIQUE NOT NULL,
                name     TEXT,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                active   INTEGER  DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS scan_log (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                scanned_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                symbols_scanned INTEGER,
                signals_found   INTEGER,
                errors          TEXT
            );
        """)
    _seed_watchlist()
    logger.info("SQLite database initialised")


def _seed_watchlist() -> None:
    """Insert default watchlist entries if the table is empty."""
    with _connect() as conn:
        existing = conn.execute("SELECT COUNT(*) FROM watchlist").fetchone()[0]
        if existing == 0:
            conn.executemany(
                "INSERT OR IGNORE INTO watchlist (symbol, name) VALUES (?, ?)",
                [(entry["symbol"], entry["name"]) for entry in WATCHLIST],
            )
            logger.info(f"Seeded {len(WATCHLIST)} default watchlist symbols")


# ------------------------------------------------------------------ #
#  Signals                                                             #
# ------------------------------------------------------------------ #

def save_signal(
    symbol: str,
    signal_type: str,
    severity: str,
    message: str,
    indicators: dict,
    price: float,
) -> None:
    """Save a signal to Supabase (primary) and SQLite (backup)."""

    # --- Supabase ---
    sb = _get_supabase()
    if sb:
        try:
            sb.table("signals").insert({
                "symbol": symbol,
                "signal_type": signal_type,
                "severity": severity,
                "message": message,
                "indicator_snapshot": indicators,
                "price_at_signal": price,
            }).execute()
        except Exception as e:
            logger.warning(f"Supabase signal write failed: {e}")

    # --- SQLite backup ---
    with _connect() as conn:
        conn.execute(
            """INSERT INTO signals
               (symbol, signal_type, severity, message, indicator_snapshot, price_at_signal)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (symbol, signal_type, severity, message, json.dumps(indicators), price),
        )

    logger.info(f"Saved signal: {symbol} — {signal_type}")


def get_recent_signals(hours: int = 24) -> list[dict]:
    """Return signals from the last N hours (used for cooldown checks)."""

    # --- Supabase ---
    sb = _get_supabase()
    if sb:
        try:
            since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
            res = (
                sb.table("signals")
                .select("*")
                .gte("created_at", since)
                .order("created_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.warning(f"Supabase read failed, using SQLite: {e}")

    # --- SQLite fallback ---
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM signals WHERE created_at >= ? ORDER BY created_at DESC",
            (since.strftime("%Y-%m-%d %H:%M:%S"),),
        ).fetchall()
    return [dict(r) for r in rows]


def get_signal_history(symbol: str | None = None, days: int = 30) -> list[dict]:
    """Return signal history, optionally filtered by symbol."""

    # --- Supabase ---
    sb = _get_supabase()
    if sb:
        try:
            since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            q = sb.table("signals").select("*").gte("created_at", since)
            if symbol:
                q = q.eq("symbol", symbol.upper())
            res = q.order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Supabase read failed, using SQLite: {e}")

    # --- SQLite fallback ---
    since = datetime.now(timezone.utc) - timedelta(days=days)
    with _connect() as conn:
        if symbol:
            rows = conn.execute(
                """SELECT * FROM signals
                   WHERE symbol = ? AND created_at >= ?
                   ORDER BY created_at DESC""",
                (symbol.upper(), since.strftime("%Y-%m-%d %H:%M:%S")),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM signals WHERE created_at >= ? ORDER BY created_at DESC",
                (since.strftime("%Y-%m-%d %H:%M:%S"),),
            ).fetchall()
    return [dict(r) for r in rows]


# ------------------------------------------------------------------ #
#  Scan Log                                                            #
# ------------------------------------------------------------------ #

def log_scan(symbols_scanned: int, signals_found: int, errors: str = "") -> None:

    # --- Supabase ---
    sb = _get_supabase()
    if sb:
        try:
            sb.table("scan_log").insert({
                "symbols_scanned": symbols_scanned,
                "signals_found": signals_found,
                "errors": errors,
            }).execute()
        except Exception as e:
            logger.warning(f"Supabase scan_log write failed: {e}")

    # --- SQLite backup ---
    with _connect() as conn:
        conn.execute(
            """INSERT INTO scan_log (symbols_scanned, signals_found, errors)
               VALUES (?, ?, ?)""",
            (symbols_scanned, signals_found, errors),
        )


def get_last_scan() -> dict | None:

    # --- Supabase ---
    sb = _get_supabase()
    if sb:
        try:
            res = (
                sb.table("scan_log")
                .select("*")
                .order("scanned_at", desc=True)
                .limit(1)
                .execute()
            )
            return res.data[0] if res.data else None
        except Exception as e:
            logger.warning(f"Supabase read failed, using SQLite: {e}")

    # --- SQLite fallback ---
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM scan_log ORDER BY scanned_at DESC LIMIT 1"
        ).fetchone()
    return dict(row) if row else None


# ------------------------------------------------------------------ #
#  Watchlist                                                           #
# ------------------------------------------------------------------ #

def get_watchlist() -> list[dict]:
    """Return all active watchlist entries (Supabase first, SQLite fallback)."""

    # --- Supabase (source of truth when connected) ---
    sb = _get_supabase()
    if sb:
        try:
            res = (
                sb.table("watchlist")
                .select("symbol, name")
                .eq("active", True)
                .order("symbol")
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.warning(f"Supabase read failed, using SQLite: {e}")

    # --- SQLite fallback ---
    with _connect() as conn:
        rows = conn.execute(
            "SELECT symbol, name FROM watchlist WHERE active = 1 ORDER BY symbol"
        ).fetchall()
    return [dict(r) for r in rows]


def add_to_watchlist(symbol: str, name: str = "") -> bool:
    """Add or re-activate a symbol. Returns True if newly added."""
    symbol = symbol.upper()

    # --- Supabase ---
    sb = _get_supabase()
    if sb:
        try:
            # Upsert: insert or reactivate
            sb.table("watchlist").upsert(
                {"symbol": symbol, "name": name or symbol, "active": True},
                on_conflict="symbol",
            ).execute()
            return True
        except Exception as e:
            logger.warning(f"Supabase watchlist add failed: {e}")

    # --- SQLite fallback ---
    with _connect() as conn:
        existing = conn.execute(
            "SELECT id, active FROM watchlist WHERE symbol = ?", (symbol,)
        ).fetchone()
        if existing:
            if existing["active"] == 0:
                conn.execute(
                    "UPDATE watchlist SET active = 1, name = ? WHERE symbol = ?",
                    (name or symbol, symbol),
                )
                return True
            return False
        conn.execute(
            "INSERT INTO watchlist (symbol, name) VALUES (?, ?)",
            (symbol, name or symbol),
        )
    return True


def remove_from_watchlist(symbol: str) -> bool:
    """Soft-delete a symbol. Returns True if found."""
    symbol = symbol.upper()

    # --- Supabase ---
    sb = _get_supabase()
    if sb:
        try:
            sb.table("watchlist").update({"active": False}).eq("symbol", symbol).execute()
            return True
        except Exception as e:
            logger.warning(f"Supabase watchlist remove failed: {e}")

    # --- SQLite fallback ---
    with _connect() as conn:
        result = conn.execute(
            "UPDATE watchlist SET active = 0 WHERE symbol = ? AND active = 1",
            (symbol,),
        )
    return result.rowcount > 0


# ------------------------------------------------------------------ #
#  Config (read settings from Supabase — web dashboard writes these)  #
# ------------------------------------------------------------------ #

def get_config_value(key: str, default=None):
    """Read a config value from Supabase. Falls back to default."""
    sb = _get_supabase()
    if sb:
        try:
            res = (
                sb.table("config")
                .select("value")
                .eq("key", key)
                .single()
                .execute()
            )
            if res.data:
                return res.data["value"]
        except Exception as e:
            logger.warning(f"Config read failed for '{key}': {e}")
    return default
