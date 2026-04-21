import asyncio
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from src.config import TELEGRAM_CHAT_ID, SIGNAL_CONFIG
from src.store import (
    get_watchlist,
    add_to_watchlist,
    remove_from_watchlist,
    get_recent_signals,
    get_signal_history,
    get_last_scan,
)
from src.market import fetch_daily_data, fetch_current_price
from src.pulse import get_all_indicators
from src.alert import send_daily_report

logger = logging.getLogger(__name__)

ALLOWED_CHAT_IDS = {int(TELEGRAM_CHAT_ID)} if TELEGRAM_CHAT_ID else set()

SEVERITY_EMOJI = {"ACTION": "🚨", "WARNING": "⚠️", "INFO": "ℹ️"}


# --- Auth guard ---

async def _is_authorized(update: Update) -> bool:
    if update.effective_chat.id not in ALLOWED_CHAT_IDS:
        await update.message.reply_text("⛔ Unauthorized")
        return False
    return True


# --- Helpers ---

def _format_signal_row(sig: dict, show_date: bool = False) -> str:
    emoji = SEVERITY_EMOJI.get(sig.get("severity", "INFO"), "ℹ️")
    ts = sig.get("created_at", "")[:16] if show_date else ""
    date_suffix = f"  <i>{ts}</i>" if ts else ""
    return f"  {emoji} {sig['symbol']} — {sig['signal_type']}{date_suffix}"


# --- Commands ---

async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return
    text = (
        "🤖 <b>Signalight Scanner</b>\n"
        "─" * 22 + "\n"
        "/scan       — Run scan now\n"
        "/status     — Scanner health\n"
        "/price SYM  — Price + indicators\n"
        "/signals    — Recent signals (24h)\n"
        "/signals SYM — Signals for symbol\n"
        "/watchlist  — Current watchlist\n"
        "/add SYM    — Add symbol\n"
        "/remove SYM — Remove symbol\n"
        "/report     — Full daily report\n"
        "/help       — This message"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return

    last = get_last_scan()
    wl = get_watchlist()
    signals_today = get_recent_signals(hours=24)

    if last:
        scanned_at = last.get("scanned_at", "")[:16]
        last_line = f"Last scan: {scanned_at} UTC"
    else:
        last_line = "Last scan: not yet run"

    text = (
        "🟢 <b>Scanner Running</b>\n"
        "─" * 22 + "\n"
        f"{last_line}\n"
        f"Symbols: {len(wl)}\n"
        f"Signals today: {len(signals_today)}\n"
        f"Scan interval: {SIGNAL_CONFIG['scan_interval_minutes']} min"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def cmd_price(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return

    if not context.args:
        await update.message.reply_text("Usage: /price <SYMBOL>  e.g. /price QQQ")
        return

    symbol = context.args[0].upper()
    await update.message.reply_text(f"⏳ Fetching {symbol}...")

    try:
        loop = asyncio.get_event_loop()

        # Fetch daily (1y for 200MA) and weekly data concurrently
        df_daily, df_weekly = await asyncio.gather(
            loop.run_in_executor(None, fetch_daily_data, symbol, "1y"),
            loop.run_in_executor(None, fetch_daily_data, symbol, "5y"),
        )
    except Exception as e:
        await update.message.reply_text(f"❌ 데이터 조회 실패: {e}")
        return

    if df_daily.empty:
        await update.message.reply_text(f"❌ No data for <b>{symbol}</b>", parse_mode="HTML")
        return

    try:
        from .pulse import calculate_ma
        from ta.momentum import RSIIndicator
        import pandas as pd

        ind = get_all_indicators(df_daily)
        price = ind.get("current_price", 0)
        dd = ind.get("drawdown_pct")
        ath = ind.get("ath")

        # Daily MAs (1y data)
        d_mas = {p: calculate_ma(df_daily, p) for p in (5, 20, 50, 120, 200)}

        # Weekly series from 5y daily data
        col = "close" if "close" in df_weekly.columns else "Close"
        wk_close = df_weekly[col].resample("W").last().dropna() if not df_weekly.empty and col in df_weekly.columns else pd.Series(dtype=float)
        wk_vol   = df_weekly["volume"].resample("W").sum().dropna() if not df_weekly.empty and "volume" in df_weekly.columns else pd.Series(dtype=float)

        def _wma(period: int):
            if len(wk_close) < period:
                return None
            v = wk_close.rolling(period).mean().iloc[-1]
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

        # Volume stats
        cur_vol = int(df_daily["volume"].iloc[-1]) if "volume" in df_daily.columns else 0
        avg_vol_1y = int(df_daily["volume"].tail(252).mean()) if "volume" in df_daily.columns else 0
        vol_pct = round((cur_vol - avg_vol_1y) / avg_vol_1y * 100, 1) if avg_vol_1y > 0 else 0
        vol_sign = "+" if vol_pct >= 0 else ""

        def _f(v):
            return f"${v:.2f}" if v else "—"

        def _arrow(p, ma):
            if p and ma:
                return "↑" if p > ma else "↓"
            return ""

        def _rsi_note(r):
            if r is None: return ""
            if r <= 30: return " 🔴과매도"
            if r <= 40: return " ⚠️근접"
            if r >= 70: return " 🔴과매수"
            return ""

        text = (
            f"📈 <b>{symbol}</b>  ${price:.2f}\n"
            f"{'─' * 24}\n"
            f"<b>📊 일봉 이동평균선</b>\n"
            f"  MA5:   {_f(d_mas[5])} {_arrow(price, d_mas[5])}\n"
            f"  MA20:  {_f(d_mas[20])} {_arrow(price, d_mas[20])}\n"
            f"  MA50:  {_f(d_mas[50])} {_arrow(price, d_mas[50])}\n"
            f"  MA120: {_f(d_mas[120])} {_arrow(price, d_mas[120])}\n"
            f"  MA200: {_f(d_mas[200])} {_arrow(price, d_mas[200])}\n"
            f"  RSI:   {f'{d_rsi:.1f}' if d_rsi else '—'}{_rsi_note(d_rsi)}\n"
            f"{'─' * 24}\n"
            f"<b>📅 주봉 이동평균선</b>\n"
            f"  MA5:   {_f(w_mas[5])} {_arrow(price, w_mas[5])}\n"
            f"  MA20:  {_f(w_mas[20])} {_arrow(price, w_mas[20])}\n"
            f"  MA50:  {_f(w_mas[50])} {_arrow(price, w_mas[50])}\n"
            f"  MA120: {_f(w_mas[120])} {_arrow(price, w_mas[120])}\n"
            f"  MA200: {_f(w_mas[200])} {_arrow(price, w_mas[200])}\n"
            f"  RSI:   {f'{w_rsi:.1f}' if w_rsi else '—'}{_rsi_note(w_rsi)}\n"
            f"{'─' * 24}\n"
            f"<b>📊 거래량</b>\n"
            f"  현재:    {cur_vol:,}\n"
            f"  1년평균: {avg_vol_1y:,}\n"
            f"  대비:    {vol_sign}{vol_pct}%\n"
            f"{'─' * 24}\n"
            f"<b>Drawdown:</b> {f'{dd:.1f}%' if dd is not None else '—'}"
            f"{f' (ATH ${ath:.2f})' if ath else ''}"
        )
        await update.message.reply_text(text, parse_mode="HTML")
    except Exception as e:
        logger.error(f"cmd_price error for {symbol}: {e}", exc_info=True)
        await update.message.reply_text(f"❌ 오류 발생: {e}")


async def cmd_signals(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return

    symbol = context.args[0].upper() if context.args else None

    if symbol:
        records = get_signal_history(symbol=symbol, days=7)
        header = f"📋 <b>{symbol} Signals — Last 7 Days</b>"
    else:
        records = get_recent_signals(hours=24)
        header = "📋 <b>Signals — Last 24 Hours</b>"

    if not records:
        await update.message.reply_text(f"{header}\n─\nNo signals found.", parse_mode="HTML")
        return

    lines = [header, "─" * 22]
    for i, sig in enumerate(records[:20], 1):
        emoji = SEVERITY_EMOJI.get(sig.get("severity", "INFO"), "ℹ️")
        ts = sig.get("created_at", "")[:16]
        price = sig.get("price_at_signal")
        price_str = f" @ ${price:.2f}" if price else ""
        lines.append(
            f"{i}. {emoji} <b>{sig['symbol']}</b> — {sig['signal_type']}{price_str}\n"
            f"   <i>{ts} UTC</i>"
        )
    lines.append(f"{'─' * 22}\nTotal: {len(records)} signal(s)")
    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


async def cmd_watchlist(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return

    wl = get_watchlist()
    if not wl:
        await update.message.reply_text("Watchlist is empty.")
        return

    await update.message.reply_text(f"⏳ Fetching prices for {len(wl)} symbols...")

    loop = asyncio.get_event_loop()
    prices = await asyncio.gather(*[loop.run_in_executor(None, fetch_current_price, e["symbol"]) for e in wl])

    lines = [f"👀 <b>Watchlist ({len(wl)} symbols)</b>", "─" * 22]
    for entry, price in zip(wl, prices):
        sym = entry["symbol"]
        lines.append(f"<b>{sym}</b>  {f'${price:.2f}' if price else '—'}")

    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


async def cmd_add(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return

    if not context.args:
        await update.message.reply_text("Usage: /add <SYMBOL>  e.g. /add AAPL")
        return

    symbol = context.args[0].upper()

    # Validate symbol exists
    price = fetch_current_price(symbol)
    if price is None:
        await update.message.reply_text(
            f"❌ <b>{symbol}</b> not found. Check the symbol and try again.",
            parse_mode="HTML",
        )
        return

    added = add_to_watchlist(symbol, symbol)
    wl = get_watchlist()

    if added:
        await update.message.reply_text(
            f"✅ Added <b>{symbol}</b> to watchlist\nWatchlist: {len(wl)} symbols",
            parse_mode="HTML",
        )
    else:
        await update.message.reply_text(
            f"<b>{symbol}</b> is already in your watchlist.",
            parse_mode="HTML",
        )


async def cmd_remove(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return

    if not context.args:
        await update.message.reply_text("Usage: /remove <SYMBOL>  e.g. /remove AAPL")
        return

    symbol = context.args[0].upper()
    removed = remove_from_watchlist(symbol)
    wl = get_watchlist()

    if removed:
        await update.message.reply_text(
            f"🗑️ Removed <b>{symbol}</b> from watchlist\nWatchlist: {len(wl)} symbols",
            parse_mode="HTML",
        )
    else:
        await update.message.reply_text(
            f"<b>{symbol}</b> not found in watchlist.",
            parse_mode="HTML",
        )


async def cmd_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await _is_authorized(update):
        return

    wl = get_watchlist()
    await update.message.reply_text(f"⏳ Building report for {len(wl)} symbols...")

    loop = asyncio.get_event_loop()
    dfs = await asyncio.gather(*[loop.run_in_executor(None, fetch_daily_data, e["symbol"], "6mo") for e in wl])
    all_indicators = {e["symbol"]: (get_all_indicators(df) if not df.empty else {}) for e, df in zip(wl, dfs)}

    await send_daily_report(all_indicators)
    await update.message.reply_text("✅ Report sent.")


async def cmd_scan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Trigger an immediate scan. Wired to the scan runner in app.py."""
    if not await _is_authorized(update):
        return
    # The actual scan logic lives in app.py; this queues it via context.
    await update.message.reply_text("⏳ Running scan...")
    if context.bot_data.get("run_scan"):
        signals = await context.bot_data["run_scan"]()
        count = len(signals)
        wl = get_watchlist()
        if count == 0:
            await update.message.reply_text(
                f"📊 Scan Complete — {len(wl)} symbols\n✅ No signals triggered"
            )
        else:
            lines = [f"📊 Scan Complete — {len(wl)} symbols", f"🚨 {count} signal(s) found:"]
            for s in signals:
                emoji = SEVERITY_EMOJI.get(s.get("severity", "INFO"), "ℹ️")
                lines.append(f"  {emoji} {s['symbol']} — {s['signal_type']}")
            await update.message.reply_text("\n".join(lines))
    else:
        await update.message.reply_text("⚠️ Scanner not ready yet.")


def register_commands(app: Application) -> None:
    """Register all command handlers on the Application."""
    app.add_handler(CommandHandler("help",      cmd_help))
    app.add_handler(CommandHandler("start",     cmd_help))
    app.add_handler(CommandHandler("status",    cmd_status))
    app.add_handler(CommandHandler("price",     cmd_price))
    app.add_handler(CommandHandler("signals",   cmd_signals))
    app.add_handler(CommandHandler("watchlist", cmd_watchlist))
    app.add_handler(CommandHandler("add",       cmd_add))
    app.add_handler(CommandHandler("remove",    cmd_remove))
    app.add_handler(CommandHandler("report",    cmd_report))
    app.add_handler(CommandHandler("scan",      cmd_scan))
    logger.info("Telegram command handlers registered")
