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
    """Check scheduled alerts every minute and fire when time/interval matches."""
    import zoneinfo
    from datetime import datetime

    await asyncio.sleep(30)
    logger.info("Schedule checker started")

    while True:
        try:
            now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
            current_time = now.strftime("%H:%M")
            current_minute = now.hour * 60 + now.minute
            weekday = now.strftime("%a").upper()[:3]

            from . import store
            with store._connect() as conn:
                scheduled = []
                for table, category in [("price_alerts", "PRICE"), ("indicator_alerts", "INDICATOR"), ("volume_alerts", "VOLUME")]:
                    rows = conn.execute(
                        f"SELECT id, symbol, notify_methods, schedule_days, schedule_type, "
                        f"schedule_time, schedule_start, schedule_end, schedule_interval "
                        f"FROM {table} WHERE schedule_enabled = 1 AND is_active = 1"
                    ).fetchall()
                    for r in rows:
                        scheduled.append({
                            "id": r[0], "symbol": r[1], "notify_methods": r[2],
                            "schedule_days": r[3], "schedule_type": r[4] or "once",
                            "schedule_time": r[5], "schedule_start": r[6],
                            "schedule_end": r[7], "schedule_interval": r[8] or 5,
                            "category": category,
                        })

            for alert in scheduled:
                days = (alert["schedule_days"] or "daily").lower()
                day_ok = (days == "daily" or
                          (days == "weekdays" and weekday in ("MON", "TUE", "WED", "THU", "FRI")) or
                          weekday in days.upper())
                if not day_ok:
                    continue

                should_fire = False
                stype = alert["schedule_type"]

                if stype == "once" and alert["schedule_time"] == current_time:
                    should_fire = True
                elif stype == "interval" and alert["schedule_start"] and alert["schedule_end"]:
                    sh, sm = map(int, alert["schedule_start"].split(":"))
                    eh, em = map(int, alert["schedule_end"].split(":"))
                    start_min = sh * 60 + sm
                    end_min = eh * 60 + em
                    interval = int(alert["schedule_interval"] or 5)
                    if start_min <= current_minute <= end_min and (current_minute - start_min) % interval == 0:
                        should_fire = True

                if not should_fire:
                    continue

                try:
                    from .market import fetch_daily_data
                    from .pulse import get_all_indicators, calculate_ma
                    from .alerts_checker import check_user_alerts
                    from .alert import send_message

                    df = await asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, alert["symbol"], "1y")
                    if df.empty:
                        continue

                    indicators = get_all_indicators(df)
                    price = indicators.get("current_price", 0)
                    vol = float(df["Volume"].iloc[-1]) if "Volume" in df.columns else 0
                    avg_vol = float(df["Volume"].tail(20).mean()) if "Volume" in df.columns else 0
                    triggered = check_user_alerts(alert["symbol"], df, price, vol, avg_vol)

                    methods = (alert["notify_methods"] or "PUSH").upper()
                    if "TELEGRAM" not in methods:
                        continue

                    mas = {p: calculate_ma(df, p) for p in (5, 20, 50, 120, 200)}
                    rsi_key = next((k for k in indicators if k.startswith("rsi_")), None)
                    rsi = indicators.get(rsi_key) if rsi_key else None

                    def _arrow(p, ma): return "↑" if p and ma and p > ma else "↓" if p and ma else "—"

                    label = "⏰ 예약" if stype == "once" else f"🔁 {alert['schedule_interval']}분 간격"
                    tg = (
                        f"{label} — <b>{alert['symbol']}</b>  ${price:.2f}\n"
                        f"MA5 {f'${mas[5]:.2f}' if mas[5] else '—'} {_arrow(price, mas[5])}  "
                        f"MA20 {f'${mas[20]:.2f}' if mas[20] else '—'} {_arrow(price, mas[20])}  "
                        f"MA50 {f'${mas[50]:.2f}' if mas[50] else '—'} {_arrow(price, mas[50])}\n"
                        f"RSI: {f'{rsi:.1f}' if rsi else '—'}\n"
                    )
                    if triggered:
                        tg += "🚨 " + " | ".join(ua["message"] for ua in triggered)
                    else:
                        tg += "✅ 조건 미충족"

                    await send_message(tg)
                    logger.info(f"Scheduled [{stype}] fired: {alert['symbol']}")
                except Exception as e:
                    logger.warning(f"Scheduled alert error for {alert.get('symbol')}: {e}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Schedule checker error: {e}")
        await asyncio.sleep(60)


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
