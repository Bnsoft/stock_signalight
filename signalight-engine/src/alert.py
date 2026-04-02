import logging
from datetime import datetime, timezone
from telegram import Bot
from telegram.error import TelegramError
from src.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

logger = logging.getLogger(__name__)

SEVERITY_EMOJI = {
    "ACTION":  "🚨",
    "WARNING": "⚠️",
    "INFO":    "ℹ️",
}


def _bot() -> Bot:
    return Bot(token=TELEGRAM_BOT_TOKEN)


async def send_message(text: str, chat_id: str | None = None) -> bool:
    """Send a raw text message to the configured chat."""
    target = chat_id or TELEGRAM_CHAT_ID
    if not target or not TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram credentials not configured — message not sent")
        return False
    try:
        async with _bot() as bot:
            await bot.send_message(
                chat_id=target,
                text=text,
                parse_mode="HTML",
            )
        return True
    except TelegramError as e:
        logger.error(f"Telegram send failed: {e}")
        return False


async def send_alert(signal: dict) -> bool:
    """Format and send a single signal alert."""
    emoji = SEVERITY_EMOJI.get(signal.get("severity", "INFO"), "ℹ️")
    symbol = signal.get("symbol", "")
    ind = signal.get("indicators", {})
    price = signal.get("price", ind.get("current_price", 0))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    rsi_key = next((k for k in ind if k.startswith("rsi_")), None)
    rsi_val = f"{ind[rsi_key]:.1f}" if rsi_key and ind.get(rsi_key) else "—"

    ma20  = f"${ind['ma_20']:.2f}"  if ind.get("ma_20")  else "—"
    ma60  = f"${ind['ma_60']:.2f}"  if ind.get("ma_60")  else "—"
    dd    = f"{ind['drawdown_pct']:.1f}%" if ind.get("drawdown_pct") is not None else "—"

    text = (
        f"{emoji} <b>{signal.get('severity')} SIGNAL: {symbol}</b>\n"
        f"{'─' * 22}\n"
        f"<b>Signal:</b> {signal.get('signal_type')}\n"
        f"{signal.get('message', '')}\n"
        f"{'─' * 22}\n"
        f"<b>Price:</b>  ${price:.2f}\n"
        f"<b>RSI:</b>    {rsi_val}\n"
        f"<b>MA20:</b>   {ma20}  |  <b>MA60:</b> {ma60}\n"
        f"<b>Drawdown:</b> {dd}\n"
        f"{'─' * 22}\n"
        f"🕐 {now}"
    )
    return await send_message(text)


async def send_scan_summary(
    total: int,
    signals_found: int,
    signal_list: list[dict],
    next_scan_minutes: int = 5,
) -> bool:
    """Post-scan summary message."""
    if signals_found == 0:
        text = (
            f"📊 <b>Scan Complete</b> — {total} symbols\n"
            f"✅ No signals triggered\n"
            f"Next scan: {next_scan_minutes} min"
        )
    else:
        lines = [f"📊 <b>Scan Complete</b> — {total} symbols"]
        lines.append(f"🚨 <b>{signals_found} signal(s) found:</b>")
        for s in signal_list:
            emoji = SEVERITY_EMOJI.get(s.get("severity", "INFO"), "ℹ️")
            lines.append(f"  {emoji} {s['symbol']} — {s['signal_type']}")
        lines.append(f"Next scan: {next_scan_minutes} min")
        text = "\n".join(lines)
    return await send_message(text)


async def send_daily_report(all_indicators: dict[str, dict]) -> bool:
    """End-of-day summary for all watchlist symbols."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [f"📊 <b>Daily Report — {now}</b>", "─" * 22]

    for symbol, ind in all_indicators.items():
        if not ind:
            lines.append(f"<b>{symbol}</b>: no data")
            continue
        price = ind.get("current_price", 0)
        rsi_key = next((k for k in ind if k.startswith("rsi_")), None)
        rsi = ind[rsi_key] if rsi_key and ind.get(rsi_key) else None
        dd = ind.get("drawdown_pct")

        rsi_str = f"RSI {rsi:.1f}" if rsi is not None else "RSI —"
        dd_str  = f"DD {dd:.1f}%"   if dd  is not None else ""

        if rsi is not None and rsi <= 30:
            rsi_icon = "🔴"
        elif rsi is not None and rsi <= 40:
            rsi_icon = "⚠️"
        else:
            rsi_icon = "✅"

        lines.append(
            f"<b>{symbol}</b>  ${price:.2f}  {rsi_str} {rsi_icon}  {dd_str}"
        )

    lines.append("─" * 22)
    return await send_message("\n".join(lines))


async def send_startup_message(symbol_count: int) -> bool:
    text = (
        f"🟢 <b>Signalight Scanner started</b>\n"
        f"Monitoring <b>{symbol_count}</b> symbols\n"
        f"Scan interval: every 5 min"
    )
    return await send_message(text)
