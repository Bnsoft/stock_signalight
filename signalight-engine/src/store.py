import json
import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from src.config import DB_PATH, WATCHLIST

logger = logging.getLogger(__name__)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    """Create all tables and seed the default watchlist on first run."""
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
    logger.info("Database initialised")


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


# --- Signals ---

def save_signal(
    symbol: str,
    signal_type: str,
    severity: str,
    message: str,
    indicators: dict,
    price: float,
) -> None:
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
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM signals WHERE created_at >= ? ORDER BY created_at DESC",
            (since.strftime("%Y-%m-%d %H:%M:%S"),),
        ).fetchall()
    return [dict(r) for r in rows]


def get_signal_history(symbol: str | None = None, days: int = 30) -> list[dict]:
    """Return signal history, optionally filtered by symbol."""
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


# --- Scan Log ---

def log_scan(symbols_scanned: int, signals_found: int, errors: str = "") -> None:
    with _connect() as conn:
        conn.execute(
            """INSERT INTO scan_log (symbols_scanned, signals_found, errors)
               VALUES (?, ?, ?)""",
            (symbols_scanned, signals_found, errors),
        )


def get_last_scan() -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM scan_log ORDER BY scanned_at DESC LIMIT 1"
        ).fetchone()
    return dict(row) if row else None


# --- Watchlist ---

def get_watchlist() -> list[dict]:
    """Return all active watchlist entries."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT symbol, name FROM watchlist WHERE active = 1 ORDER BY symbol"
        ).fetchall()
    return [dict(r) for r in rows]


def add_to_watchlist(symbol: str, name: str = "") -> bool:
    """Add or re-activate a symbol. Returns True if newly added."""
    symbol = symbol.upper()
    with _connect() as conn:
        existing = conn.execute(
            "SELECT id, active FROM watchlist WHERE symbol = ?", (symbol,)
        ).fetchone()
        if existing:
            if existing["active"] == 0:
                conn.execute(
                    "UPDATE watchlist SET active = 1, name = ? WHERE symbol = ?",
                    (name or existing["name"] or symbol, symbol),
                )
                return True
            return False  # already active
        conn.execute(
            "INSERT INTO watchlist (symbol, name) VALUES (?, ?)",
            (symbol, name or symbol),
        )
    return True


def remove_from_watchlist(symbol: str) -> bool:
    """Soft-delete a symbol from the watchlist. Returns True if found."""
    symbol = symbol.upper()
    with _connect() as conn:
        result = conn.execute(
            "UPDATE watchlist SET active = 0 WHERE symbol = ? AND active = 1",
            (symbol,),
        )
    return result.rowcount > 0
