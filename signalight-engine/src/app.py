import argparse
import asyncio
import logging
import logging.handlers
import signal
import sys
from datetime import time, timezone

from telegram.ext import Application

from src.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SIGNAL_CONFIG
from src.store import init_db, get_watchlist, save_signal, log_scan
from src.market import fetch_daily_data
from src.pulse import get_all_indicators
from src.trigger import evaluate_all_signals
from src.alert import send_alert, send_scan_summary, send_daily_report, send_startup_message
from src.command import register_commands

logger = logging.getLogger(__name__)

# Cache of last indicator snapshot per symbol for crossover detection
_prev_indicators: dict[str, dict] = {}

# Set to True by --dry-run flag; suppresses all Telegram sends and DB writes
_dry_run: bool = False


def setup_logging() -> None:
    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)

    file_handler = logging.handlers.RotatingFileHandler(
        "data/signalight.log", maxBytes=5 * 1024 * 1024, backupCount=3
    )
    file_handler.setFormatter(fmt)

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(console)
    root.addHandler(file_handler)


def _is_market_open() -> bool:
    """Return True during NYSE trading hours Mon–Fri 09:30–16:00 ET."""
    from datetime import datetime
    import zoneinfo
    now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
    if now.weekday() >= 5:
        return False
    market_open  = now.replace(hour=9,  minute=30, second=0, microsecond=0)
    market_close = now.replace(hour=16, minute=0,  second=0, microsecond=0)
    return market_open <= now <= market_close


async def run_scan(dry_run: bool = False) -> list[dict]:
    """Core scan cycle — fetch, calculate, detect, alert, persist.

    dry_run=True: prints signals to console but skips DB writes and Telegram.
    """
    effective_dry_run = dry_run or _dry_run
    wl = get_watchlist()
    if not wl:
        logger.warning("Watchlist is empty — skipping scan")
        return []

    all_signals: list[dict] = []
    errors: list[str] = []

    for entry in wl:
        symbol = entry["symbol"]
        try:
            df = fetch_daily_data(symbol, period="6mo")
            if df.empty:
                errors.append(f"{symbol}: no data")
                continue

            indicators = get_all_indicators(df)
            prev = _prev_indicators.get(symbol, {})
            signals = evaluate_all_signals(symbol, indicators, prev)
            _prev_indicators[symbol] = indicators

            for sig in signals:
                if effective_dry_run:
                    logger.info(
                        f"[DRY RUN] Signal: {sig['symbol']} — {sig['signal_type']} "
                        f"[{sig['severity']}] @ ${sig['price']:.2f}"
                    )
                else:
                    save_signal(
                        symbol=sig["symbol"],
                        signal_type=sig["signal_type"],
                        severity=sig["severity"],
                        message=sig["message"],
                        indicators=sig["indicators"],
                        price=sig["price"],
                    )
                    await send_alert(sig)
                all_signals.append(sig)

        except Exception as e:
            msg = f"{symbol}: {e}"
            logger.error(msg, exc_info=True)
            errors.append(msg)

    if not effective_dry_run:
        log_scan(
            symbols_scanned=len(wl),
            signals_found=len(all_signals),
            errors="; ".join(errors),
        )
        interval = SIGNAL_CONFIG["scan_interval_minutes"]
        await send_scan_summary(
            total=len(wl),
            signals_found=len(all_signals),
            signal_list=all_signals,
            next_scan_minutes=interval,
        )
    else:
        logger.info(
            f"[DRY RUN] Scan complete — {len(wl)} symbols, "
            f"{len(all_signals)} signal(s) found, no alerts sent"
        )

    return all_signals


async def _scheduled_scan(context) -> None:
    """JobQueue callback — skips scan outside market hours."""
    if not _is_market_open():
        logger.info("Market closed — scan skipped")
        return
    logger.info("Scheduled scan starting...")
    await run_scan()


async def _scheduled_daily_report(context) -> None:
    """JobQueue callback — sends EOD report for all watchlist symbols."""
    logger.info("Generating daily report...")
    wl = get_watchlist()
    all_indicators = {}
    for entry in wl:
        sym = entry["symbol"]
        df = fetch_daily_data(sym, period="6mo")
        all_indicators[sym] = get_all_indicators(df) if not df.empty else {}
    await send_daily_report(all_indicators)


def build_app() -> Application:
    """Build and configure the Telegram Application."""
    app = (
        Application.builder()
        .token(TELEGRAM_BOT_TOKEN)
        .build()
    )

    app.bot_data["run_scan"] = run_scan
    register_commands(app)

    interval_seconds = SIGNAL_CONFIG["scan_interval_minutes"] * 60

    app.job_queue.run_repeating(
        _scheduled_scan,
        interval=interval_seconds,
        first=10,
        name="scanner",
    )

    app.job_queue.run_daily(
        _scheduled_daily_report,
        time=time(hour=20, minute=5, tzinfo=timezone.utc),
        name="daily_report",
    )

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="signalight",
        description="Signalight stock signal scanner",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single scan then exit (no bot, no scheduler)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Calculate signals but skip DB writes and Telegram alerts",
    )
    return parser.parse_args()


def main() -> None:
    global _dry_run

    args = parse_args()
    _dry_run = args.dry_run

    setup_logging()

    if args.dry_run:
        logger.info("DRY RUN mode — no alerts will be sent, no DB writes")
    if args.once:
        logger.info("--once mode — single scan then exit")

    logger.info("Signalight engine starting...")
    init_db()

    # --once mode: run one scan and exit, no Telegram bot needed
    if args.once:
        async def _once():
            signals = await run_scan(dry_run=args.dry_run)
            logger.info(f"--once complete: {len(signals)} signal(s) found")

        asyncio.run(_once())
        return

    # Normal mode: requires Telegram credentials
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.error(
            "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env — exiting"
        )
        sys.exit(1)

    app = build_app()

    def _handle_shutdown(sig, frame):
        logger.info(f"Received {signal.Signals(sig).name} — shutting down...")
        app.stop_running()

    signal.signal(signal.SIGINT,  _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    wl = get_watchlist()
    logger.info(f"Monitoring {len(wl)} symbols: {[e['symbol'] for e in wl]}")

    async def _post_init(application: Application) -> None:
        await send_startup_message(len(wl))

    app.post_init = _post_init

    logger.info("Bot polling started")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
