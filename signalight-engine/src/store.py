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

            CREATE TABLE IF NOT EXISTS signal_performance (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                signal_id       INTEGER NOT NULL,
                signal_type     TEXT    NOT NULL,
                symbol          TEXT    NOT NULL,
                entry_price     REAL,
                exit_price      REAL,
                entry_time      DATETIME,
                exit_time       DATETIME,
                pnl             REAL,
                roi_percent     REAL,
                status          TEXT DEFAULT 'PENDING',
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (signal_id) REFERENCES signals(id)
            );

            CREATE TABLE IF NOT EXISTS indicator_accuracy (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                indicator_name      TEXT    NOT NULL,
                symbol              TEXT,
                total_signals       INTEGER DEFAULT 0,
                winning_signals     INTEGER DEFAULT 0,
                losing_signals      INTEGER DEFAULT 0,
                win_rate_percent    REAL,
                avg_roi_percent     REAL,
                max_gain_percent    REAL,
                max_loss_percent    REAL,
                last_updated        DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS backtest_results (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol              TEXT    NOT NULL,
                start_date          DATE,
                end_date            DATE,
                initial_capital     REAL,
                final_capital       REAL,
                total_trades        INTEGER,
                winning_trades      INTEGER,
                losing_trades       INTEGER,
                win_rate_percent    REAL,
                total_roi_percent   REAL,
                max_drawdown_percent REAL,
                sharpe_ratio        REAL,
                results_json        TEXT,
                created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS users (
                id                 TEXT PRIMARY KEY,
                email              TEXT UNIQUE,
                display_name       TEXT,
                auth_method        TEXT DEFAULT 'guest',
                password_hash      TEXT,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_preferences (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id            TEXT    NOT NULL,
                theme              TEXT DEFAULT 'system',
                notification_email BOOLEAN DEFAULT 1,
                api_calls_limit    INTEGER DEFAULT 1000,
                subscription_plan  TEXT DEFAULT 'guest',
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS calculations (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id            TEXT    NOT NULL,
                principal          REAL    NOT NULL,
                period_months      INTEGER NOT NULL,
                target_roi         REAL    NOT NULL,
                is_compound        BOOLEAN DEFAULT 1,
                tax_rate           REAL    DEFAULT 0,
                final_value        REAL,
                net_profit         REAL,
                tax_amount         REAL,
                after_tax_roi      REAL,
                calculation_json   TEXT,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS positions (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id            TEXT    NOT NULL,
                symbol             TEXT    NOT NULL,
                quantity           REAL    NOT NULL,
                entry_price        REAL    NOT NULL,
                current_price      REAL    NOT NULL,
                entry_date         DATETIME,
                notes              TEXT,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS portfolio_history (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id            TEXT    NOT NULL,
                total_value        REAL    NOT NULL,
                cash_balance       REAL    DEFAULT 0,
                daily_pnl          REAL,
                daily_return       REAL,
                recorded_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS portfolio_targets (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id            TEXT    NOT NULL,
                symbol             TEXT    NOT NULL,
                target_percentage  REAL,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS investment_goals (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id            TEXT    NOT NULL,
                goal_name          TEXT,
                target_amount      REAL,
                current_amount     REAL DEFAULT 0,
                target_date        DATE,
                progress_percent   REAL DEFAULT 0,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS rebalance_history (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id            TEXT    NOT NULL,
                rebalance_date     DATETIME,
                before_allocation  TEXT,
                after_allocation   TEXT,
                trades_executed    INTEGER,
                total_cost         REAL,
                created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_signals_symbol_type ON signals(symbol, signal_type);
            CREATE INDEX IF NOT EXISTS idx_signal_perf_status ON signal_performance(status);
            CREATE INDEX IF NOT EXISTS idx_indicator_acc_name ON indicator_accuracy(indicator_name);
            CREATE INDEX IF NOT EXISTS idx_backtest_symbol ON backtest_results(symbol);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id);
            CREATE INDEX IF NOT EXISTS idx_calcs_user_id ON calculations(user_id);
            CREATE INDEX IF NOT EXISTS idx_positions_user_symbol ON positions(user_id, symbol);
            CREATE INDEX IF NOT EXISTS idx_portfolio_history_user ON portfolio_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_portfolio_targets_user ON portfolio_targets(user_id);
            CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON investment_goals(user_id);
            CREATE INDEX IF NOT EXISTS idx_rebalance_history_user ON rebalance_history(user_id);
        """)
    _seed_watchlist()
    logger.info("SQLite database initialised with analytics tables")


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


# ------------------------------------------------------------------ #
#  Signal Performance & Analytics                                    #
# ------------------------------------------------------------------ #

def save_signal_performance(
    signal_id: int,
    signal_type: str,
    symbol: str,
    entry_price: float,
    exit_price: float | None = None,
    status: str = "PENDING",
) -> None:
    """Save signal performance record."""
    entry_time = datetime.utcnow()
    roi = None
    if exit_price and entry_price > 0:
        roi = ((exit_price - entry_price) / entry_price) * 100

    with _connect() as conn:
        conn.execute(
            """INSERT INTO signal_performance
               (signal_id, signal_type, symbol, entry_price, exit_price, entry_time, roi_percent, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (signal_id, signal_type, symbol, entry_price, exit_price, entry_time, roi, status),
        )
    logger.info(f"Saved signal performance for {symbol} {signal_type}")


def get_signal_performance_stats(symbol: str | None = None) -> dict:
    """Get performance stats for signals (all or by symbol)."""
    with _connect() as conn:
        query = "SELECT signal_type, COUNT(*) as total, SUM(CASE WHEN roi_percent > 0 THEN 1 ELSE 0 END) as wins FROM signal_performance WHERE status != 'PENDING'"
        params = []

        if symbol:
            query += " AND symbol = ?"
            params.append(symbol)

        query += " GROUP BY signal_type"
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()

        stats = {}
        for row in rows:
            sig_type = row[0]
            total = row[1]
            wins = row[2] or 0
            win_rate = (wins / total * 100) if total > 0 else 0

            stats[sig_type] = {
                "total": total,
                "wins": wins,
                "losses": total - wins,
                "win_rate": round(win_rate, 2),
            }

        return stats


def save_indicator_accuracy(
    indicator_name: str,
    symbol: str | None = None,
    total_signals: int = 0,
    winning_signals: int = 0,
    losing_signals: int = 0,
) -> None:
    """Update indicator accuracy metrics."""
    win_rate = (winning_signals / total_signals * 100) if total_signals > 0 else 0

    with _connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO indicator_accuracy
               (indicator_name, symbol, total_signals, winning_signals, losing_signals, win_rate_percent)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (indicator_name, symbol, total_signals, winning_signals, losing_signals, win_rate),
        )


def get_indicator_accuracy(indicator_name: str | None = None) -> list[dict]:
    """Get indicator accuracy stats."""
    with _connect() as conn:
        query = "SELECT indicator_name, symbol, total_signals, winning_signals, win_rate_percent FROM indicator_accuracy WHERE 1=1"
        params = []

        if indicator_name:
            query += " AND indicator_name = ?"
            params.append(indicator_name)

        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def save_backtest_result(
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float,
    final_capital: float,
    total_trades: int,
    winning_trades: int,
    total_roi_percent: float,
    max_drawdown_percent: float,
    sharpe_ratio: float = 0,
    results_json: str = "{}",
) -> None:
    """Save backtest result."""
    losing_trades = total_trades - winning_trades
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

    with _connect() as conn:
        conn.execute(
            """INSERT INTO backtest_results
               (symbol, start_date, end_date, initial_capital, final_capital, total_trades,
                winning_trades, losing_trades, win_rate_percent, total_roi_percent, max_drawdown_percent, sharpe_ratio, results_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                symbol, start_date, end_date, initial_capital, final_capital, total_trades,
                winning_trades, losing_trades, win_rate, total_roi_percent, max_drawdown_percent, sharpe_ratio, results_json,
            ),
        )
    logger.info(f"Saved backtest result for {symbol} {start_date}~{end_date}")


def get_backtest_results(symbol: str | None = None, limit: int = 10) -> list[dict]:
    """Get recent backtest results."""
    with _connect() as conn:
        query = "SELECT * FROM backtest_results WHERE 1=1"
        params = []

        if symbol:
            query += " AND symbol = ?"
            params.append(symbol)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


# ------------------------------------------------------------------ #
#  User Management (Phase 9)                                        #
# ------------------------------------------------------------------ #

def create_user(
    user_id: str,
    email: str | None = None,
    display_name: str | None = None,
    auth_method: str = "guest",
    password_hash: str | None = None,
) -> dict:
    """Create a new user."""
    with _connect() as conn:
        conn.execute(
            """INSERT INTO users (id, email, display_name, auth_method, password_hash)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, email, display_name or "User", auth_method, password_hash),
        )
        # Create default preferences
        conn.execute(
            """INSERT INTO user_preferences (user_id, subscription_plan)
               VALUES (?, ?)""",
            (user_id, "guest" if auth_method == "guest" else "free"),
        )
    logger.info(f"Created user: {user_id} ({auth_method})")
    return get_user(user_id)


def get_user(user_id: str) -> dict | None:
    """Get user by ID."""
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row:
            return dict(row)
    return None


def get_user_by_email(email: str) -> dict | None:
    """Get user by email."""
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row:
            return dict(row)
    return None


def update_user(user_id: str, **kwargs) -> dict | None:
    """Update user fields (email, display_name, auth_method, password_hash)."""
    allowed_fields = {"email", "display_name", "auth_method", "password_hash"}
    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

    if not updates:
        return get_user(user_id)

    updates["updated_at"] = datetime.utcnow().isoformat()

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [user_id]

    with _connect() as conn:
        conn.execute(
            f"UPDATE users SET {set_clause} WHERE id = ?",
            values,
        )

    return get_user(user_id)


def get_user_preferences(user_id: str) -> dict | None:
    """Get user preferences."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM user_preferences WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if row:
            return dict(row)
    return None


def update_user_preferences(user_id: str, **kwargs) -> dict | None:
    """Update user preferences."""
    allowed_fields = {
        "theme", "notification_email", "api_calls_limit", "subscription_plan"
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

    if not updates:
        return get_user_preferences(user_id)

    updates["updated_at"] = datetime.utcnow().isoformat()

    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [user_id]

    with _connect() as conn:
        conn.execute(
            f"UPDATE user_preferences SET {set_clause} WHERE user_id = ?",
            values,
        )

    return get_user_preferences(user_id)


def save_calculation(
    user_id: str,
    principal: float,
    period_months: int,
    target_roi: float,
    final_value: float,
    net_profit: float,
    tax_amount: float,
    after_tax_roi: float,
    is_compound: bool = True,
    tax_rate: float = 0,
    calculation_json: str = "{}",
) -> dict:
    """Save a profit calculation."""
    with _connect() as conn:
        cursor = conn.execute(
            """INSERT INTO calculations
               (user_id, principal, period_months, target_roi, is_compound, tax_rate,
                final_value, net_profit, tax_amount, after_tax_roi, calculation_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id, principal, period_months, target_roi, is_compound, tax_rate,
                final_value, net_profit, tax_amount, after_tax_roi, calculation_json,
            ),
        )
        calc_id = cursor.lastrowid

    return get_calculation(calc_id)


def get_calculation(calc_id: int) -> dict | None:
    """Get calculation by ID."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM calculations WHERE id = ?",
            (calc_id,),
        ).fetchone()
        if row:
            return dict(row)
    return None


def get_user_calculations(user_id: str, limit: int = 50) -> list[dict]:
    """Get user's calculation history."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM calculations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def delete_user(user_id: str) -> bool:
    """Soft-delete a user (keep data for compliance)."""
    with _connect() as conn:
        # Archive user data by setting deleted flag
        conn.execute(
            "UPDATE users SET auth_method = 'deleted', email = NULL WHERE id = ?",
            (user_id,),
        )
    logger.info(f"Deleted user: {user_id}")
    return True
