"""Signalight main entry point — FastAPI app + background scanner + Telegram bot."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .error_handlers import setup_error_handlers

logger = logging.getLogger(__name__)

_prev_indicators: dict = {}


def _is_market_open() -> bool:
    from datetime import datetime
    import zoneinfo
    now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
    if now.weekday() >= 5:
        return False
    return now.replace(hour=9, minute=30) <= now <= now.replace(hour=16, minute=0)


async def _run_scan() -> int:
    from .store import get_watchlist, save_signal, log_scan
    from .market import fetch_daily_data
    from .pulse import get_all_indicators
    from .trigger import evaluate_all_signals
    from .alert import send_alert
    from .config import SIGNAL_CONFIG

    wl = get_watchlist()
    if not wl:
        return 0

    all_signals, errors = [], []

    for entry in wl:
        symbol = entry["symbol"]
        try:
            df = await asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, symbol, "6mo")
            if df.empty:
                continue
            indicators = get_all_indicators(df)
            prev = _prev_indicators.get(symbol, {})
            signals = evaluate_all_signals(symbol, indicators, prev)
            _prev_indicators[symbol] = indicators

            for sig in signals:
                save_signal(
                    symbol=sig["symbol"], signal_type=sig["signal_type"],
                    severity=sig["severity"], message=sig["message"],
                    indicators=sig["indicators"], price=sig["price"],
                )
                all_signals.append(sig)

            # Check user-defined alerts
            try:
                from .alerts_checker import check_user_alerts
                current_price = indicators.get("current_price", 0)
                current_volume = float(df["Volume"].iloc[-1]) if "Volume" in df.columns else 0
                avg_volume = float(df["Volume"].tail(20).mean()) if "Volume" in df.columns else 0
                user_alerts = check_user_alerts(symbol, df, current_price, current_volume, avg_volume)
                for ua in user_alerts:
                    if "TELEGRAM" in [m.upper() for m in ua["notify_methods"]]:
                        from .alert import send_message
                        await send_message(f"🔔 <b>사용자 알람</b>\n{ua['message']}")
            except Exception as e:
                logger.warning(f"User alert check failed for {symbol}: {e}")

        except Exception as e:
            errors.append(f"{symbol}: {e}")
            logger.warning(f"Scan error for {symbol}: {e}")

    log_scan(symbols_scanned=len(wl), signals_found=len(all_signals), errors="; ".join(errors))
    logger.info(f"Scan complete — {len(wl)} symbols, {len(all_signals)} signals")
    return len(all_signals)


async def _background_scanner():
    from .config import SIGNAL_CONFIG
    interval = SIGNAL_CONFIG.get("scan_interval_minutes", 5) * 60
    await asyncio.sleep(10)
    logger.info("Background scanner started")
    while True:
        try:
            if _is_market_open():
                await _run_scan()
            else:
                logger.info("Market closed — scan skipped")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Scanner error: {e}", exc_info=True)
        await asyncio.sleep(interval)


async def _schedule_checker():
    """Check scheduled alerts every minute and fire when time matches."""
    import zoneinfo
    from datetime import datetime

    await asyncio.sleep(30)
    logger.info("Schedule checker started")
    while True:
        try:
            now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
            current_time = now.strftime("%H:%M")
            weekday = now.strftime("%a").upper()[:3]  # MON, TUE, ...

            from . import store
            with store._connect() as conn:
                scheduled = []
                for table, category in [("price_alerts", "PRICE"), ("indicator_alerts", "INDICATOR"), ("volume_alerts", "VOLUME")]:
                    rows = conn.execute(
                        f"SELECT id, symbol, notify_methods, schedule_days FROM {table} "
                        f"WHERE schedule_enabled = 1 AND schedule_time = ? AND is_active = 1",
                        (current_time,)
                    ).fetchall()
                    for row in rows:
                        scheduled.append({"id": row[0], "symbol": row[1], "notify_methods": row[2], "schedule_days": row[3], "category": category, "table": table})

            for alert in scheduled:
                days = (alert["schedule_days"] or "daily").lower()
                if days == "daily" or days == "weekdays" and weekday in ("MON", "TUE", "WED", "THU", "FRI") or weekday in days.upper():
                    try:
                        from .market import fetch_daily_data
                        from .pulse import get_all_indicators
                        from .alerts_checker import check_user_alerts

                        df = await asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, alert["symbol"], "1y")
                        if df.empty:
                            continue
                        indicators = get_all_indicators(df)
                        price = indicators.get("current_price", 0)
                        vol = float(df["Volume"].iloc[-1]) if "Volume" in df.columns else 0
                        avg_vol = float(df["Volume"].tail(20).mean()) if "Volume" in df.columns else 0
                        triggered = check_user_alerts(alert["symbol"], df, price, vol, avg_vol)

                        from .alert import send_message
                        if triggered:
                            for ua in triggered:
                                if "TELEGRAM" in [m.upper() for m in (ua.get("notify_methods") or [])]:
                                    await send_message(f"⏰ <b>예약 알람</b>\n{ua['message']}")
                        else:
                            # Always send scheduled report even if condition not met
                            methods = (alert["notify_methods"] or "").upper()
                            if "TELEGRAM" in methods:
                                await send_message(f"⏰ <b>예약 리포트</b> — {alert['symbol']}\n현재가: ${price:.2f}\n조건 미충족")
                        logger.info(f"Scheduled alert fired: {alert['symbol']} [{alert['category']}]")
                    except Exception as e:
                        logger.warning(f"Scheduled alert error: {e}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Schedule checker error: {e}")
        await asyncio.sleep(60)  # Check every minute


async def _start_telegram_bot():
    """Run the Telegram bot inside the FastAPI process."""
    try:
        from .config import TELEGRAM_BOT_TOKEN
        if not TELEGRAM_BOT_TOKEN:
            logger.warning("TELEGRAM_BOT_TOKEN not set — bot disabled")
            return
        from .app import build_app
        bot_app = build_app(with_scheduler=False)
        await bot_app.initialize()
        await bot_app.start()
        await bot_app.updater.start_polling(drop_pending_updates=True)
        logger.info("Telegram bot started")
        # Keep reference so we can stop it on shutdown
        return bot_app
    except Exception as e:
        logger.error(f"Telegram bot failed to start: {e}", exc_info=True)
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    from . import store as db_store
    db_store.init_db()
    logger.info("DB initialized")

    scanner_task = asyncio.create_task(_background_scanner())
    schedule_task = asyncio.create_task(_schedule_checker())
    bot_app = await _start_telegram_bot()

    yield

    logger.info("Shutting down...")
    scanner_task.cancel()
    schedule_task.cancel()
    await asyncio.gather(scanner_task, schedule_task, return_exceptions=True)

    if bot_app:
        await bot_app.updater.stop()
        await bot_app.stop()
        await bot_app.shutdown()


app = FastAPI(title="Signalight API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_error_handlers(app)

# Mount all routes from api.py
from .api import app as _api_app
for route in _api_app.routes:
    app.routes.append(route)
