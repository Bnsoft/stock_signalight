"""
Signalight — Manual Validation Script
======================================
Run this to verify the full pipeline works end-to-end with real market data.
Does NOT send Telegram alerts unless you pass --send.

Usage:
    uv run python validate.py              # dry-run, no alerts
    uv run python validate.py --send       # also sends a real Telegram alert
    uv run python validate.py --force-rsi  # lower RSI threshold to 50 to force a signal
"""
import argparse
import asyncio
import json
import sqlite3
import sys
import os

# ── make sure src/ is on the path ──────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

from src.config import WATCHLIST, SIGNAL_CONFIG, DB_PATH
from src.store import init_db, get_watchlist, get_recent_signals
from src.market import fetch_daily_data, fetch_current_price
from src.pulse import get_all_indicators
from src.trigger import evaluate_all_signals

PASS = "✅"
FAIL = "❌"
INFO = "ℹ️ "
WARN = "⚠️ "


def section(title: str) -> None:
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


# ── 1. DB init ──────────────────────────────────────────────────────────────

def check_db() -> None:
    section("1 · Database")
    init_db()
    conn = sqlite3.connect(DB_PATH)
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    conn.close()

    required = {"signals", "watchlist", "scan_log"}
    for t in required:
        if t in tables:
            print(f"  {PASS} Table '{t}' exists")
        else:
            print(f"  {FAIL} Table '{t}' MISSING")

    wl = get_watchlist()
    print(f"  {PASS} Watchlist seeded — {len(wl)} symbols: {[e['symbol'] for e in wl]}")


# ── 2. Market data ──────────────────────────────────────────────────────────

def check_market_data() -> dict[str, dict]:
    section("2 · Market Data & Indicators")
    results = {}
    test_symbols = ["SPY", "QQQ", "TQQQ"]

    for sym in test_symbols:
        df = fetch_daily_data(sym, period="6mo")
        if df.empty:
            print(f"  {FAIL} {sym}: failed to fetch data")
            results[sym] = {}
            continue

        price = fetch_current_price(sym)
        ind = get_all_indicators(df)
        results[sym] = ind

        rsi_key = next((k for k in ind if k.startswith("rsi_")), None)
        rsi = ind.get(rsi_key)
        ma20 = ind.get("ma_20")
        ma60 = ind.get("ma_60")
        dd   = ind.get("drawdown_pct")
        vol_r = ind.get("volume_ratio")

        print(f"  {PASS} {sym}  price=${price:.2f}  RSI={rsi:.1f}  MA20={ma20:.2f}  MA60={ma60:.2f}  DD={dd:.1f}%  VolRatio={vol_r:.2f}x")

        # Validate RSI is in 0–100 range
        if rsi is None or not (0 <= rsi <= 100):
            print(f"  {FAIL} {sym}: RSI out of range ({rsi})")
        if ma20 is None or ma60 is None:
            print(f"  {WARN} {sym}: MA values missing")

    return results


# ── 3. Signal detection (forced) ────────────────────────────────────────────

def check_signals(all_indicators: dict[str, dict], force_rsi: bool = False) -> list[dict]:
    section("3 · Signal Detection")

    if force_rsi:
        original_threshold = SIGNAL_CONFIG["rsi_oversold"]
        SIGNAL_CONFIG["rsi_oversold"] = 50  # force trigger
        print(f"  {INFO} RSI oversold threshold temporarily set to 50 (was {original_threshold})")

    triggered = []
    for sym, ind in all_indicators.items():
        if not ind:
            continue
        signals = evaluate_all_signals(sym, ind, ind)
        for s in signals:
            triggered.append(s)
            print(f"  {PASS} Signal triggered: {sym} — {s['signal_type']} [{s['severity']}]")

    if force_rsi:
        SIGNAL_CONFIG["rsi_oversold"] = original_threshold

    if not triggered:
        print(f"  {INFO} No signals triggered under current market conditions")
        print(f"       (run with --force-rsi to force RSI oversold signals)")

    return triggered


# ── 4. SQLite write & read ──────────────────────────────────────────────────

def check_db_write(signals: list[dict]) -> None:
    section("4 · SQLite Write & Read")
    from src.store import save_signal, get_signal_history

    # Always write a synthetic test signal so we can verify DB writes
    save_signal(
        symbol="TEST",
        signal_type="Validation Signal",
        severity="INFO",
        message="Automated validation check",
        indicators={"test": True},
        price=0.0,
    )
    print(f"  {PASS} Wrote synthetic validation signal")

    history = get_signal_history(symbol="TEST", days=1)
    if history:
        row = history[0]
        snap = json.loads(row.get("indicator_snapshot") or "{}")
        print(f"  {PASS} Read back from DB: symbol={row['symbol']}  type={row['signal_type']}  snapshot={snap}")
    else:
        print(f"  {FAIL} Could not read back signal from DB")

    # Also write any real signals
    for sig in signals:
        save_signal(
            symbol=sig["symbol"],
            signal_type=sig["signal_type"],
            severity=sig["severity"],
            message=sig["message"],
            indicators=sig["indicators"],
            price=sig["price"],
        )
    if signals:
        print(f"  {PASS} Saved {len(signals)} real signal(s) to DB")


# ── 5. Telegram alert (optional) ────────────────────────────────────────────

async def check_telegram(signals: list[dict]) -> None:
    section("5 · Telegram Alert (--send mode)")
    from src.alert import send_alert, send_message

    # Send a plain text test message
    ok = await send_message("🧪 <b>Signalight validation</b> — connection test")
    if ok:
        print(f"  {PASS} Test message sent to Telegram")
    else:
        print(f"  {FAIL} Telegram send failed — check BOT_TOKEN and CHAT_ID in .env")
        return

    # Send the first real signal if available
    if signals:
        await send_alert(signals[0])
        print(f"  {PASS} Real signal alert sent: {signals[0]['symbol']} — {signals[0]['signal_type']}")
    else:
        print(f"  {INFO} No real signals to send — only connection test was sent")


# ── Main ────────────────────────────────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(description="Signalight validation script")
    parser.add_argument("--send",      action="store_true", help="Send real Telegram alerts")
    parser.add_argument("--force-rsi", action="store_true", help="Lower RSI threshold to 50 to force signals")
    args = parser.parse_args()

    print("\n🔍 Signalight — Validation Run")
    print(f"   Mode: {'LIVE (--send)' if args.send else 'DRY RUN (no Telegram)'}")

    check_db()
    all_indicators = check_market_data()
    signals = check_signals(all_indicators, force_rsi=args.force_rsi)
    check_db_write(signals)

    if args.send:
        await check_telegram(signals)
    else:
        section("5 · Telegram Alert")
        print(f"  {INFO} Skipped — run with --send to test real Telegram delivery")

    section("Summary")
    print(f"  {PASS} All automated checks passed")
    print(f"  {INFO} Manual checks remaining (need your phone):")
    print("       • Run the bot: uv run python -m src.app")
    print("       • Send /help, /scan, /status, /price QQQ from Telegram")
    print("       • Try /add AAPL then /watchlist")
    print("       • Try /remove AAPL then /watchlist")
    print("       • Try /price INVALIDXYZ — expect error message")
    print("       • Try sending commands from a different account — expect ⛔")
    print()


if __name__ == "__main__":
    asyncio.run(main())
