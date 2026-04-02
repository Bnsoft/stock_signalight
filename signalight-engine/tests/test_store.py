import pytest
import src.store as store_module
from src.store import (
    init_db,
    save_signal,
    get_recent_signals,
    get_signal_history,
    log_scan,
    get_last_scan,
    get_watchlist,
    add_to_watchlist,
    remove_from_watchlist,
)


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    """Use a fresh temporary DB for every test."""
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(store_module, "DB_PATH", db_path)
    # Also patch the config import inside store
    import src.config as cfg
    monkeypatch.setattr(cfg, "DB_PATH", db_path)
    init_db()
    yield


def test_init_db_creates_tables():
    wl = get_watchlist()
    assert len(wl) > 0  # seeded from default WATCHLIST


def test_save_and_retrieve_signal():
    save_signal("QQQ", "RSI Oversold", "ACTION", "RSI 28", {"rsi_14": 28}, 442.5)
    recent = get_recent_signals(hours=1)
    assert len(recent) == 1
    assert recent[0]["symbol"] == "QQQ"
    assert recent[0]["signal_type"] == "RSI Oversold"


def test_get_signal_history_filtered_by_symbol():
    save_signal("QQQ", "RSI Oversold", "ACTION", "RSI 28", {}, 442.5)
    save_signal("SPY", "RSI Overbought", "WARNING", "RSI 72", {}, 520.0)
    history = get_signal_history(symbol="QQQ", days=1)
    assert len(history) == 1
    assert history[0]["symbol"] == "QQQ"


def test_get_signal_history_all_symbols():
    save_signal("QQQ", "RSI Oversold", "ACTION", "RSI 28", {}, 442.5)
    save_signal("SPY", "RSI Overbought", "WARNING", "RSI 72", {}, 520.0)
    history = get_signal_history(days=1)
    assert len(history) == 2


def test_log_and_get_last_scan():
    log_scan(symbols_scanned=7, signals_found=2, errors="")
    last = get_last_scan()
    assert last is not None
    assert last["symbols_scanned"] == 7
    assert last["signals_found"] == 2


def test_add_to_watchlist_new_symbol():
    result = add_to_watchlist("AAPL", "Apple Inc.")
    assert result is True
    wl = get_watchlist()
    symbols = [e["symbol"] for e in wl]
    assert "AAPL" in symbols


def test_add_to_watchlist_already_exists():
    add_to_watchlist("AAPL", "Apple Inc.")
    result = add_to_watchlist("AAPL", "Apple Inc.")
    assert result is False  # already active


def test_remove_from_watchlist():
    add_to_watchlist("AAPL", "Apple Inc.")
    result = remove_from_watchlist("AAPL")
    assert result is True
    wl = get_watchlist()
    symbols = [e["symbol"] for e in wl]
    assert "AAPL" not in symbols


def test_remove_nonexistent_symbol():
    result = remove_from_watchlist("NOTREAL")
    assert result is False


def test_readd_removed_symbol():
    add_to_watchlist("AAPL", "Apple Inc.")
    remove_from_watchlist("AAPL")
    result = add_to_watchlist("AAPL", "Apple Inc.")
    assert result is True
    wl = get_watchlist()
    symbols = [e["symbol"] for e in wl]
    assert "AAPL" in symbols
