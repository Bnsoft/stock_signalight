import pytest
from unittest.mock import AsyncMock, MagicMock
from src.alert import (
    send_alert,
    send_scan_summary,
    send_daily_report,
    send_startup_message,
    send_message,
)


def make_signal(severity="ACTION", symbol="QQQ", signal_type="RSI Oversold"):
    return {
        "symbol": symbol,
        "signal_type": signal_type,
        "severity": severity,
        "message": "RSI 28.0 — oversold (threshold ≤ 30)",
        "price": 442.50,
        "indicators": {
            "current_price": 442.50,
            "rsi_14": 28.0,
            "ma_20": 450.0,
            "ma_60": 445.0,
            "drawdown_pct": -12.5,
            "ath": 505.7,
        },
    }


@pytest.fixture
def mock_bot(monkeypatch):
    """Patch Bot so no real Telegram calls are made."""
    bot_instance = AsyncMock()
    bot_instance.__aenter__ = AsyncMock(return_value=bot_instance)
    bot_instance.__aexit__ = AsyncMock(return_value=False)
    bot_instance.send_message = AsyncMock(return_value=MagicMock())

    monkeypatch.setattr("src.alert.TELEGRAM_BOT_TOKEN", "fake_token")
    monkeypatch.setattr("src.alert.TELEGRAM_CHAT_ID", "12345")
    monkeypatch.setattr("src.alert._bot", lambda: bot_instance)
    return bot_instance


@pytest.mark.asyncio
async def test_send_message_calls_bot(mock_bot):
    result = await send_message("hello")
    assert result is True
    mock_bot.send_message.assert_called_once()


@pytest.mark.asyncio
async def test_send_message_no_credentials():
    result = await send_message.__wrapped__("hello") if hasattr(send_message, "__wrapped__") else None
    # Without credentials set: should return False
    import src.alert as alert_mod
    orig_token = alert_mod.TELEGRAM_BOT_TOKEN
    orig_chat  = alert_mod.TELEGRAM_CHAT_ID
    alert_mod.TELEGRAM_BOT_TOKEN = ""
    alert_mod.TELEGRAM_CHAT_ID   = ""
    result = await send_message("hello")
    alert_mod.TELEGRAM_BOT_TOKEN = orig_token
    alert_mod.TELEGRAM_CHAT_ID   = orig_chat
    assert result is False


@pytest.mark.asyncio
async def test_send_alert_action(mock_bot):
    signal = make_signal(severity="ACTION")
    result = await send_alert(signal)
    assert result is True
    call_kwargs = mock_bot.send_message.call_args
    text = call_kwargs.kwargs.get("text") or call_kwargs.args[0] if call_kwargs.args else ""
    if not text:
        text = str(call_kwargs)
    assert "QQQ" in text
    assert "RSI Oversold" in text


@pytest.mark.asyncio
async def test_send_alert_warning(mock_bot):
    signal = make_signal(severity="WARNING", signal_type="RSI Overbought")
    result = await send_alert(signal)
    assert result is True


@pytest.mark.asyncio
async def test_send_scan_summary_no_signals(mock_bot):
    result = await send_scan_summary(total=7, signals_found=0, signal_list=[])
    assert result is True
    text = str(mock_bot.send_message.call_args)
    assert "No signals" in text


@pytest.mark.asyncio
async def test_send_scan_summary_with_signals(mock_bot):
    signals = [make_signal(), make_signal(symbol="TQQQ", signal_type="MA Death Cross")]
    result = await send_scan_summary(total=7, signals_found=2, signal_list=signals)
    assert result is True
    text = str(mock_bot.send_message.call_args)
    assert "2 signal" in text


@pytest.mark.asyncio
async def test_send_daily_report(mock_bot):
    all_indicators = {
        "QQQ":  {"current_price": 442.5, "rsi_14": 32.5, "drawdown_pct": -12.5},
        "TQQQ": {"current_price": 42.1,  "rsi_14": 28.0, "drawdown_pct": -35.0},
        "SPY":  {},
    }
    result = await send_daily_report(all_indicators)
    assert result is True
    text = str(mock_bot.send_message.call_args)
    assert "QQQ" in text
    assert "TQQQ" in text


@pytest.mark.asyncio
async def test_send_startup_message(mock_bot):
    result = await send_startup_message(symbol_count=7)
    assert result is True
    text = str(mock_bot.send_message.call_args)
    assert "7" in text
