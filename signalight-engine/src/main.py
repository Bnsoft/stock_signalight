"""Signalight main entry point — FastAPI app + background scanner + Telegram bot."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .error_handlers import setup_error_handlers
from . import store

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

    # Track fired "once" alerts this minute to avoid double-fire on drift
    _fired_once: dict[str, str] = {}  # alert_key -> "HH:MM" when last fired

    await asyncio.sleep(15)
    logger.info("Schedule checker started")

    while True:
        try:
            now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
            current_time = now.strftime("%H:%M")
            current_minute = now.hour * 60 + now.minute
            weekday = now.strftime("%a").upper()[:3]

            with store._connect() as conn:
                scheduled = []
                for table, category in [("price_alerts", "PRICE"), ("indicator_alerts", "INDICATOR"), ("volume_alerts", "VOLUME")]:
                    try:
                        rows = conn.execute(
                            f"SELECT id, symbol, notify_methods, schedule_days, schedule_type, "
                            f"schedule_time, schedule_start, schedule_end, schedule_interval "
                            f"FROM {table} WHERE schedule_enabled = 1 AND is_active = 1"
                        ).fetchall()
                    except Exception:
                        continue
                    for r in rows:
                        scheduled.append({
                            "key": f"{category}:{r[0]}",
                            "id": r[0], "symbol": r[1], "notify_methods": r[2],
                            "schedule_days": r[3], "schedule_type": r[4] or "once",
                            "schedule_time": r[5], "schedule_start": r[6],
                            "schedule_end": r[7], "schedule_interval": int(r[8] or 5),
                            "category": category,
                        })

            for alert in scheduled:
                # Day-of-week check
                days = (alert["schedule_days"] or "daily").lower()
                day_ok = (
                    days == "daily" or
                    (days == "weekdays" and weekday in ("MON", "TUE", "WED", "THU", "FRI")) or
                    weekday in days.upper()
                )
                if not day_ok:
                    continue

                stype = alert["schedule_type"]
                should_fire = False

                if stype == "once":
                    sched_time = alert["schedule_time"]
                    if sched_time:
                        sh, sm = map(int, sched_time.split(":"))
                        sched_min = sh * 60 + sm
                        # Fire if within ±1 minute and not already fired this hour-minute
                        if abs(current_minute - sched_min) <= 1:
                            fired_key = _fired_once.get(alert["key"])
                            if fired_key != current_time:
                                should_fire = True
                                _fired_once[alert["key"]] = current_time

                elif stype == "interval" and alert["schedule_start"] and alert["schedule_end"]:
                    sh, sm = map(int, alert["schedule_start"].split(":"))
                    eh, em = map(int, alert["schedule_end"].split(":"))
                    start_min = sh * 60 + sm
                    end_min = eh * 60 + em
                    interval = alert["schedule_interval"]
                    if start_min <= current_minute <= end_min and (current_minute - start_min) % interval == 0:
                        should_fire = True

                if not should_fire:
                    continue

                try:
                    from .market import fetch_daily_data
                    from .pulse import get_all_indicators, calculate_ma
                    from .alerts_checker import check_user_alerts
                    from .alert import send_message

                    methods = (alert["notify_methods"] or "PUSH").upper()
                    if "TELEGRAM" not in methods:
                        logger.info(f"Scheduled alert skipped (no TELEGRAM): {alert['symbol']}")
                        continue

                    df = await asyncio.get_event_loop().run_in_executor(
                        None, fetch_daily_data, alert["symbol"], "1y"
                    )
                    if df.empty:
                        logger.warning(f"No data for scheduled alert: {alert['symbol']}")
                        continue

                    indicators = get_all_indicators(df)
                    price = indicators.get("current_price", 0)
                    vol = float(df["Volume"].iloc[-1]) if "Volume" in df.columns else 0
                    avg_vol = float(df["Volume"].tail(20).mean()) if "Volume" in df.columns else 0
                    triggered = check_user_alerts(alert["symbol"], df, price, vol, avg_vol)

                    mas = {p: calculate_ma(df, p) for p in (5, 20, 50, 120, 200)}
                    rsi_key = next((k for k in indicators if k.startswith("rsi_")), None)
                    rsi = indicators.get(rsi_key) if rsi_key else None
                    dd = indicators.get("drawdown_pct")

                    def _arrow(p, ma): return "↑" if p and ma and p > ma else "↓" if ma else "—"
                    def _f(v): return f"${v:.2f}" if v else "—"

                    label = f"⏰ {alert['schedule_time']}" if stype == "once" else f"🔁 {alert['schedule_interval']}분"
                    tg = (
                        f"{label} — <b>{alert['symbol']}</b>  ${price:.2f}\n"
                        f"{'─' * 20}\n"
                        f"MA5:  {_f(mas[5])} {_arrow(price, mas[5])}  "
                        f"MA20: {_f(mas[20])} {_arrow(price, mas[20])}\n"
                        f"MA50: {_f(mas[50])} {_arrow(price, mas[50])}  "
                        f"MA120:{_f(mas[120])} {_arrow(price, mas[120])}\n"
                        f"MA200:{_f(mas[200])} {_arrow(price, mas[200])}\n"
                        f"RSI: {f'{rsi:.1f}' if rsi else '—'}  "
                        f"DD: {f'{dd:.1f}%' if dd is not None else '—'}\n"
                    )
                    if triggered:
                        tg += "🚨 " + " | ".join(ua["message"] for ua in triggered)
                    else:
                        tg += "✅ 조건 미충족"

                    await send_message(tg)
                    store.save_schedule_run_log(
                        alert_id=alert["id"], alert_category=alert["category"],
                        symbol=alert["symbol"], schedule_type=stype,
                        status="success", triggered=bool(triggered),
                        message_sent=tg[:500],
                    )
                    logger.info(f"Scheduled [{stype}] fired OK: {alert['symbol']} @ {current_time}")

                except Exception as e:
                    store.save_schedule_run_log(
                        alert_id=alert["id"], alert_category=alert["category"],
                        symbol=alert.get("symbol", "?"), schedule_type=stype,
                        status="failed", error_reason=str(e)[:300],
                    )
                    logger.warning(f"Scheduled alert error [{alert.get('symbol')}]: {e}", exc_info=True)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Schedule checker loop error: {e}", exc_info=True)

        await asyncio.sleep(60)


async def _send_report(sub: dict) -> tuple[str | None, str | None]:
    """Build and send a report matching /price output. Returns (content, error)."""
    from .market import fetch_daily_data
    from .pulse import get_all_indicators, calculate_ma
    from .alert import send_message
    from ta.momentum import RSIIndicator
    import pandas as pd

    symbols = sub["symbols"].split(",") if isinstance(sub["symbols"], str) else sub["symbols"]
    channels = sub["channels"].split(",") if isinstance(sub["channels"], str) else sub["channels"]
    name = sub.get("name", "데일리 리포트")

    lines = [f"📊 <b>{name}</b>\n{'─' * 22}"]

    try:
        for sym in [s.strip().upper() for s in symbols if s.strip()]:
            df_daily, df_5y = await asyncio.gather(
                asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, sym, "1y"),
                asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, sym, "5y"),
            )
            if df_daily.empty:
                lines.append(f"\n<b>{sym}</b>: 데이터 없음")
                continue

            ind = get_all_indicators(df_daily)
            price = ind.get("current_price", 0)
            d_mas = {p: calculate_ma(df_daily, p) for p in (5, 20, 50, 120, 200)}

            # Weekly MAs
            col = "close" if "close" in df_5y.columns else "Close"
            wk_close = df_5y[col].resample("W").last().dropna() if not df_5y.empty and col in df_5y.columns else pd.Series(dtype=float)
            def _wma(p):
                if len(wk_close) < p: return None
                v = wk_close.rolling(p).mean().iloc[-1]
                return round(float(v), 2) if pd.notna(v) else None
            w_mas = {p: _wma(p) for p in (5, 20, 50, 120, 200)}

            # Daily RSI
            d_rsi = None
            if len(df_daily) >= 15 and "close" in df_daily.columns:
                v = RSIIndicator(close=df_daily["close"], window=14).rsi().iloc[-1]
                d_rsi = round(float(v), 1) if pd.notna(v) else None

            # Weekly RSI
            w_rsi = None
            if len(wk_close) >= 15:
                v = RSIIndicator(close=wk_close, window=14).rsi().iloc[-1]
                w_rsi = round(float(v), 1) if pd.notna(v) else None

            dd = ind.get("drawdown_pct")
            ath = ind.get("ath")
            vol = int(df_daily["Volume"].iloc[-1]) if "Volume" in df_daily.columns else 0
            avg_vol = int(df_daily["Volume"].tail(252).mean()) if "Volume" in df_daily.columns else 0
            vol_pct = round((vol - avg_vol) / avg_vol * 100, 1) if avg_vol else 0
            vol_sign = "+" if vol_pct >= 0 else ""

            def _f(v): return f"${v:.2f}" if v else "—"
            def _a(p, ma): return "↑" if p and ma and p > ma else "↓" if ma else "—"

            lines.append(
                f"\n📈 <b>{sym}</b>  ${price:.2f}\n"
                f"{'─' * 20}\n"
                f"<b>📊 일봉 이동평균선</b>\n"
                f"  MA5:   {_f(d_mas[5])} {_a(price, d_mas[5])}\n"
                f"  MA20:  {_f(d_mas[20])} {_a(price, d_mas[20])}\n"
                f"  MA50:  {_f(d_mas[50])} {_a(price, d_mas[50])}\n"
                f"  MA120: {_f(d_mas[120])} {_a(price, d_mas[120])}\n"
                f"  MA200: {_f(d_mas[200])} {_a(price, d_mas[200])}\n"
                f"  RSI:   {f'{d_rsi:.1f}' if d_rsi else '—'}\n"
                f"<b>📅 주봉 이동평균선</b>\n"
                f"  MA5:   {_f(w_mas[5])} {_a(price, w_mas[5])}\n"
                f"  MA20:  {_f(w_mas[20])} {_a(price, w_mas[20])}\n"
                f"  MA50:  {_f(w_mas[50])} {_a(price, w_mas[50])}\n"
                f"  MA120: {_f(w_mas[120])} {_a(price, w_mas[120])}\n"
                f"  MA200: {_f(w_mas[200])} {_a(price, w_mas[200])}\n"
                f"  RSI:   {f'{w_rsi:.1f}' if w_rsi else '—'}\n"
                f"<b>📊 거래량</b>\n"
                f"  현재: {vol:,}  ({vol_sign}{vol_pct}% vs 1y평균)\n"
                f"<b>Drawdown:</b> {f'{dd:.1f}%' if dd is not None else '—'}"
                f"{f' (ATH ${ath:.2f})' if ath else ''}"
            )

        content = "\n".join(lines)
        if "TELEGRAM" in [c.upper() for c in channels]:
            await send_message(content)
        return content, None

    except Exception as e:
        return None, str(e)


async def _report_scheduler():
    """Send report subscriptions at scheduled times."""
    import zoneinfo
    from datetime import datetime

    _fired: dict[str, str] = {}  # sub_id -> "HH:MM" last fired

    await asyncio.sleep(20)
    logger.info("Report scheduler started")

    while True:
        try:
            now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
            current_time = now.strftime("%H:%M")
            current_minute = now.hour * 60 + now.minute
            weekday = now.strftime("%a").upper()[:3]

            subs = store.get_active_report_subscriptions()

            for sub in subs:
                days = (sub.get("days") or "weekdays").lower()
                day_ok = (
                    days == "daily" or
                    (days == "weekdays" and weekday in ("MON", "TUE", "WED", "THU", "FRI")) or
                    weekday in days.upper()
                )
                if not day_ok:
                    continue

                sched_time = sub.get("report_time", "")
                if not sched_time:
                    continue

                sh, sm = map(int, sched_time.split(":"))
                sched_min = sh * 60 + sm
                key = str(sub["id"])

                if abs(current_minute - sched_min) <= 1 and _fired.get(key) != current_time:
                    _fired[key] = current_time
                    content, error = await _send_report(sub)
                    store.save_report_history(
                        subscription_id=sub["id"], user_id=sub["user_id"],
                        status="success" if not error else "failed",
                        content=content, error_reason=error,
                        channels=sub.get("channels", "TELEGRAM"),
                    )
                    if error:
                        logger.warning(f"Report failed [{sub.get('name')}]: {error}")
                    else:
                        logger.info(f"Report sent: {sub.get('name')} @ {current_time}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Report scheduler error: {e}", exc_info=True)

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
    report_task = asyncio.create_task(_report_scheduler())
    bot_app = await _start_telegram_bot()

    yield

    logger.info("Shutting down...")
    scanner_task.cancel()
    schedule_task.cancel()
    report_task.cancel()
    await asyncio.gather(scanner_task, schedule_task, report_task, return_exceptions=True)

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
