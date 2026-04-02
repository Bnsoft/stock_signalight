import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import src.store as store_module
from src.store import init_db


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(store_module, "DB_PATH", db_path)
    import src.config as cfg
    monkeypatch.setattr(cfg, "DB_PATH", db_path)
    init_db()
    yield


# --- Market hours ---

def test_market_hours_logic_weekday():
    from datetime import datetime
    import zoneinfo
    # Wednesday 10:00 ET — within market hours
    now = datetime(2026, 4, 1, 10, 0, tzinfo=zoneinfo.ZoneInfo("America/New_York"))
    assert now.weekday() < 5
    market_open  = now.replace(hour=9,  minute=30)
    market_close = now.replace(hour=16, minute=0)
    assert market_open <= now <= market_close


def test_market_hours_logic_weekend():
    from datetime import datetime
    import zoneinfo
    # Saturday 10:00 ET — always closed
    now = datetime(2026, 4, 4, 10, 0, tzinfo=zoneinfo.ZoneInfo("America/New_York"))
    assert now.weekday() == 5  # Saturday = closed


def test_market_closed_before_open():
    from datetime import datetime
    import zoneinfo
    # 8:00 AM ET on a weekday
    t = datetime(2026, 4, 1, 8, 0, tzinfo=zoneinfo.ZoneInfo("America/New_York"))
    assert t.weekday() < 5  # weekday
    market_open = t.replace(hour=9, minute=30)
    assert t < market_open  # before market open


# --- run_scan ---

@pytest.mark.asyncio
async def test_run_scan_empty_watchlist(monkeypatch):
    import src.app as app_mod
    monkeypatch.setattr("src.app.get_watchlist", lambda: [])
    monkeypatch.setattr("src.app.send_scan_summary", AsyncMock())
    result = await app_mod.run_scan()
    assert result == []


@pytest.mark.asyncio
async def test_run_scan_returns_signals(monkeypatch):
    import pandas as pd
    import src.app as app_mod

    fake_wl = [{"symbol": "QQQ"}]
    fake_df = MagicMock(spec=pd.DataFrame)
    fake_df.empty = False

    fake_indicators = {
        "current_price": 442.5,
        "rsi_14": 25.0,  # oversold — will trigger
        "ma_20": 450.0,
        "ma_60": 445.0,
        "drawdown_pct": -5.0,
        "bollinger_upper": 460.0,
        "bollinger_lower": 440.0,
        "volume_ratio": 1.0,
    }

    monkeypatch.setattr("src.app.get_watchlist", lambda: fake_wl)
    monkeypatch.setattr("src.app.fetch_daily_data", lambda s, period: fake_df)
    monkeypatch.setattr("src.app.get_all_indicators", lambda df: fake_indicators)
    monkeypatch.setattr("src.app.save_signal", MagicMock())
    monkeypatch.setattr("src.app.send_alert", AsyncMock())
    monkeypatch.setattr("src.app.send_scan_summary", AsyncMock())
    monkeypatch.setattr("src.app.log_scan", MagicMock())

    result = await app_mod.run_scan()
    assert isinstance(result, list)
    assert len(result) >= 1
    assert result[0]["symbol"] == "QQQ"


@pytest.mark.asyncio
async def test_run_scan_handles_fetch_error(monkeypatch):
    import src.app as app_mod

    fake_wl = [{"symbol": "QQQ"}]

    def bad_fetch(s, period):
        raise RuntimeError("network error")

    monkeypatch.setattr("src.app.get_watchlist", lambda: fake_wl)
    monkeypatch.setattr("src.app.fetch_daily_data", bad_fetch)
    monkeypatch.setattr("src.app.send_scan_summary", AsyncMock())
    monkeypatch.setattr("src.app.log_scan", MagicMock())

    # Should not raise — errors are caught internally
    result = await app_mod.run_scan()
    assert result == []


@pytest.mark.asyncio
async def test_run_scan_skips_empty_df(monkeypatch):
    import pandas as pd
    import src.app as app_mod

    fake_wl = [{"symbol": "QQQ"}]
    monkeypatch.setattr("src.app.get_watchlist", lambda: fake_wl)
    monkeypatch.setattr("src.app.fetch_daily_data", lambda s, period: pd.DataFrame())
    monkeypatch.setattr("src.app.send_scan_summary", AsyncMock())
    monkeypatch.setattr("src.app.log_scan", MagicMock())

    result = await app_mod.run_scan()
    assert result == []


# --- _scheduled_scan ---

@pytest.mark.asyncio
async def test_scheduled_scan_skips_when_market_closed(monkeypatch):
    import src.app as app_mod
    monkeypatch.setattr("src.app._is_market_open", lambda: False)
    scan_called = []
    monkeypatch.setattr("src.app.run_scan", AsyncMock(side_effect=lambda: scan_called.append(1)))
    await app_mod._scheduled_scan(MagicMock())
    assert len(scan_called) == 0


@pytest.mark.asyncio
async def test_scheduled_scan_runs_when_market_open(monkeypatch):
    import src.app as app_mod
    monkeypatch.setattr("src.app._is_market_open", lambda: True)
    mock_scan = AsyncMock(return_value=[])
    monkeypatch.setattr("src.app.run_scan", mock_scan)
    await app_mod._scheduled_scan(MagicMock())
    mock_scan.assert_called_once()


# --- build_app ---

def test_build_app_registers_scan_runner(monkeypatch):
    import src.app as app_mod
    monkeypatch.setattr("src.app.TELEGRAM_BOT_TOKEN", "fake_token")

    mock_app = MagicMock()
    mock_app.bot_data = {}
    mock_app.job_queue = MagicMock()
    mock_builder = MagicMock()
    mock_builder.token.return_value = mock_builder
    mock_builder.build.return_value = mock_app

    with patch("src.app.Application") as MockApp:
        MockApp.builder.return_value = mock_builder
        with patch("src.app.register_commands") as mock_register:
            app = app_mod.build_app()
            assert app.bot_data["run_scan"] is app_mod.run_scan
            mock_register.assert_called_once_with(mock_app)
