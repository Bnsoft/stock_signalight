import os
from dotenv import load_dotenv

load_dotenv()

# --- Telegram ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# --- Watchlist ---
WATCHLIST = [
    {"symbol": "QQQ",  "name": "Invesco QQQ"},
    {"symbol": "SPY",  "name": "SPDR S&P 500"},
    {"symbol": "TQQQ", "name": "ProShares UltraPro QQQ"},
    {"symbol": "QLD",  "name": "ProShares Ultra QQQ"},
    {"symbol": "SPYI", "name": "NEOS S&P 500 High Income"},
    {"symbol": "QQQI", "name": "NEOS Nasdaq-100 High Income"},
    {"symbol": "JEPQ", "name": "JPMorgan Nasdaq Equity Premium Income"},
]

# --- Signal Thresholds ---
SIGNAL_CONFIG = {
    "ma_short": 20,
    "ma_long": 60,
    "rsi_period": 14,
    "rsi_oversold": 30,
    "rsi_overbought": 70,
    "scan_interval_minutes": 5,
    "signal_cooldown_hours": 24,
}

# --- QQQ Drawdown-Based Entry Levels ---
DRAWDOWN_LEVELS = [
    {"drawdown_pct": -10, "action": "Start buying QLD"},
    {"drawdown_pct": -15, "action": "Add TQQQ small position"},
    {"drawdown_pct": -20, "action": "Increase TQQQ allocation"},
    {"drawdown_pct": -25, "action": "Aggressive TQQQ entry"},
    {"drawdown_pct": -30, "action": "Max TQQQ allocation"},
]

# --- Database ---
DB_PATH = "data/signalight.db"
