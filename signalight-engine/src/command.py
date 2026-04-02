import logging
from datetime import datetime, timezone
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from src.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SIGNAL_CONFIG
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

    df = fetch_daily_data(symbol, period="6mo")
    if df.empty:
        await update.message.reply_text(f"❌ Could not fetch data for <b>{symbol}</b>. Invalid symbol?", parse_mode="HTML")
        return

    ind = get_all_indicators(df)
    price  = ind.get("current_price", 0)
    rsi_key = next((k for k in ind if k.startswith("rsi_")), None)
    rsi    = ind.get(rsi_key) if rsi_key else None
    ma20   = ind.get("ma_20")
    ma60   = ind.get("ma_60")
    macd   = ind.get("macd")
    macd_s = ind.get("macd_signal")
    bb_u   = ind.get("bollinger_upper")
    bb_l   = ind.get("bollinger_lower")
    dd     = ind.get("drawdown_pct")
    ath    = ind.get("ath")
    vol_r  = ind.get("volume_ratio")

    rsi_note = ""
    if rsi is not None:
        if rsi <= 30:
            rsi_note = " 🔴 Oversold"
        elif rsi <= 40:
            rsi_note = " ⚠️ Near oversold"
        elif rsi >= 70:
            rsi_note = " 🔴 Overbought"

    vol_note = f" ({vol_r:.1f}x avg)" if vol_r else ""

    text = (
        f"📈 <b>{symbol}</b>\n"
        f"{'─' * 22}\n"
        f"<b>Price:</b>  ${price:.2f}\n"
        f"{'─' * 22}\n"
        f"<b>MA20:</b>   {f'${ma20:.2f}' if ma20 else '—'}\n"
        f"<b>MA60:</b>   {f'${ma60:.2f}' if ma60 else '—'}\n"
        f"<b>RSI:</b>    {f'{rsi:.1f}' if rsi else '—'}{rsi_note}\n"
        f"<b>MACD:</b>   {f'{macd:.3f}' if macd else '—'}  (Signal: {f'{macd_s:.3f}' if macd_s else '—'})\n"
        f"{'─' * 22}\n"
        f"<b>Drawdown:</b> {f'{dd:.1f}%' if dd is not None else '—'}"
        f"{f' from ATH (${ath:.2f})' if ath else ''}\n"
        f"<b>Bollinger:</b> {f'${bb_l:.2f} — ${bb_u:.2f}' if bb_l and bb_u else '—'}\n"
        f"<b>Volume:</b>  {str(ind['volume']) + vol_note if ind.get('volume') else '—'}"
    )
    await update.message.reply_text(text, parse_mode="HTML")


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

    lines = [f"👀 <b>Watchlist ({len(wl)} symbols)</b>", "─" * 22]
    for entry in wl:
        sym = entry["symbol"]
        price = fetch_current_price(sym)
        if price:
            lines.append(f"<b>{sym}</b>  ${price:.2f}")
        else:
            lines.append(f"<b>{sym}</b>  —")

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

    all_indicators = {}
    for entry in wl:
        sym = entry["symbol"]
        df = fetch_daily_data(sym, period="6mo")
        all_indicators[sym] = get_all_indicators(df) if not df.empty else {}

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
