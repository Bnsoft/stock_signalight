import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import src.store as store_module
from src.store import init_db, add_to_watchlist, save_signal


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(store_module, "DB_PATH", db_path)
    import src.config as cfg
    monkeypatch.setattr(cfg, "DB_PATH", db_path)
    init_db()
    yield


def make_update(text: str, chat_id: int = 99999) -> MagicMock:
    """Build a fake Telegram Update object."""
    update = MagicMock()
    update.effective_chat.id = chat_id
    update.message.reply_text = AsyncMock()
    update.message.text = text
    return update


def make_context(args: list[str] | None = None) -> MagicMock:
    ctx = MagicMock()
    ctx.args = args or []
    ctx.bot_data = {}
    return ctx


@pytest.fixture
def authorized_chat_id(monkeypatch):
    import src.command as cmd_mod
    monkeypatch.setattr(cmd_mod, "ALLOWED_CHAT_IDS", {99999})
    return 99999


# --- Auth ---

@pytest.mark.asyncio
async def test_unauthorized_user_blocked(monkeypatch):
    import src.command as cmd_mod
    monkeypatch.setattr(cmd_mod, "ALLOWED_CHAT_IDS", {99999})
    update = make_update("/help", chat_id=11111)
    await cmd_mod.cmd_help(update, make_context())
    update.message.reply_text.assert_called_once_with("⛔ Unauthorized")


@pytest.mark.asyncio
async def test_authorized_user_gets_help(authorized_chat_id):
    from src.command import cmd_help
    update = make_update("/help", chat_id=authorized_chat_id)
    await cmd_help(update, make_context())
    update.message.reply_text.assert_called_once()
    text = update.message.reply_text.call_args.args[0]
    assert "/scan" in text
    assert "/price" in text


# --- /status ---

@pytest.mark.asyncio
async def test_cmd_status(authorized_chat_id):
    from src.command import cmd_status
    update = make_update("/status", chat_id=authorized_chat_id)
    await cmd_status(update, make_context())
    update.message.reply_text.assert_called_once()
    text = update.message.reply_text.call_args.kwargs.get("text") or \
           update.message.reply_text.call_args.args[0]
    assert "Scanner" in text


# --- /signals ---

@pytest.mark.asyncio
async def test_cmd_signals_no_data(authorized_chat_id):
    from src.command import cmd_signals
    update = make_update("/signals", chat_id=authorized_chat_id)
    await cmd_signals(update, make_context())
    text = update.message.reply_text.call_args.kwargs.get("text") or \
           update.message.reply_text.call_args.args[0]
    assert "No signals" in text


@pytest.mark.asyncio
async def test_cmd_signals_with_data(authorized_chat_id):
    save_signal("QQQ", "RSI Oversold", "ACTION", "RSI 28", {}, 442.5)
    from src.command import cmd_signals
    update = make_update("/signals", chat_id=authorized_chat_id)
    await cmd_signals(update, make_context())
    text = update.message.reply_text.call_args.kwargs.get("text") or \
           update.message.reply_text.call_args.args[0]
    assert "QQQ" in text


@pytest.mark.asyncio
async def test_cmd_signals_filtered_by_symbol(authorized_chat_id):
    save_signal("QQQ", "RSI Oversold", "ACTION", "RSI 28", {}, 442.5)
    save_signal("SPY", "RSI Overbought", "WARNING", "RSI 72", {}, 520.0)
    from src.command import cmd_signals
    update = make_update("/signals QQQ", chat_id=authorized_chat_id)
    await cmd_signals(update, make_context(args=["QQQ"]))
    text = update.message.reply_text.call_args.kwargs.get("text") or \
           update.message.reply_text.call_args.args[0]
    assert "QQQ" in text
    assert "7 Days" in text


# --- /add and /remove ---

@pytest.mark.asyncio
async def test_cmd_add_valid_symbol(authorized_chat_id, monkeypatch):
    import src.command as cmd_mod
    monkeypatch.setattr(cmd_mod, "fetch_current_price", AsyncMock(return_value=None))
    # Use sync mock via lambda
    monkeypatch.setattr("src.command.fetch_current_price", lambda s: 182.5)
    update = make_update("/add AAPL", chat_id=authorized_chat_id)
    await cmd_mod.cmd_add(update, make_context(args=["AAPL"]))
    text = update.message.reply_text.call_args.kwargs.get("text") or \
           update.message.reply_text.call_args.args[0]
    assert "AAPL" in text
    assert "Added" in text


@pytest.mark.asyncio
async def test_cmd_add_invalid_symbol(authorized_chat_id, monkeypatch):
    import src.command as cmd_mod
    monkeypatch.setattr("src.command.fetch_current_price", lambda s: None)
    update = make_update("/add INVALIDXYZ", chat_id=authorized_chat_id)
    await cmd_mod.cmd_add(update, make_context(args=["INVALIDXYZ"]))
    text = update.message.reply_text.call_args.kwargs.get("text") or \
           update.message.reply_text.call_args.args[0]
    assert "not found" in text or "❌" in text


@pytest.mark.asyncio
async def test_cmd_remove_existing_symbol(authorized_chat_id):
    add_to_watchlist("AAPL", "Apple Inc.")
    from src.command import cmd_remove
    update = make_update("/remove AAPL", chat_id=authorized_chat_id)
    await cmd_remove(update, make_context(args=["AAPL"]))
    text = update.message.reply_text.call_args.kwargs.get("text") or \
           update.message.reply_text.call_args.args[0]
    assert "Removed" in text or "🗑️" in text


@pytest.mark.asyncio
async def test_cmd_remove_missing_arg(authorized_chat_id):
    from src.command import cmd_remove
    update = make_update("/remove", chat_id=authorized_chat_id)
    await cmd_remove(update, make_context(args=[]))
    text = update.message.reply_text.call_args.args[0]
    assert "Usage" in text


# --- /price ---

@pytest.mark.asyncio
async def test_cmd_price_no_arg(authorized_chat_id):
    from src.command import cmd_price
    update = make_update("/price", chat_id=authorized_chat_id)
    await cmd_price(update, make_context(args=[]))
    text = update.message.reply_text.call_args.args[0]
    assert "Usage" in text


@pytest.mark.asyncio
async def test_cmd_price_invalid_symbol(authorized_chat_id, monkeypatch):
    import pandas as pd
    import src.command as cmd_mod
    monkeypatch.setattr("src.command.fetch_daily_data", lambda s, period: pd.DataFrame())
    update = make_update("/price BADXYZ", chat_id=authorized_chat_id)
    await cmd_mod.cmd_price(update, make_context(args=["BADXYZ"]))
    calls = [str(c) for c in update.message.reply_text.call_args_list]
    assert any("Could not" in c or "Invalid" in c or "❌" in c for c in calls)


# --- register_commands ---

def test_register_commands():
    from telegram.ext import Application
    from src.command import register_commands
    app = MagicMock(spec=Application)
    app.add_handler = MagicMock()
    register_commands(app)
    assert app.add_handler.call_count == 10  # 10 commands registered
