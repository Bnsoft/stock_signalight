import pytest
import pandas as pd
from src.market import fetch_daily_data, fetch_current_price, fetch_all_watchlist


def test_fetch_daily_data_valid_symbol():
    df = fetch_daily_data("SPY", period="1mo")
    assert not df.empty
    assert "close" in df.columns
    assert "open" in df.columns
    assert "high" in df.columns
    assert "low" in df.columns
    assert "volume" in df.columns


def test_fetch_daily_data_invalid_symbol():
    df = fetch_daily_data("INVALIDXYZ123")
    assert isinstance(df, pd.DataFrame)
    assert df.empty


def test_fetch_daily_data_returns_sorted_index():
    df = fetch_daily_data("SPY", period="1mo")
    assert df.index.is_monotonic_increasing


def test_fetch_current_price_valid_symbol():
    price = fetch_current_price("SPY")
    assert price is not None
    assert isinstance(price, float)
    assert price > 0


def test_fetch_current_price_invalid_symbol():
    price = fetch_current_price("INVALIDXYZ123")
    assert price is None


def test_fetch_all_watchlist_returns_dict():
    # Only fetch a short period to keep test fast
    import src.market as m
    original = m.WATCHLIST
    m.WATCHLIST = [{"symbol": "SPY", "name": "SPDR S&P 500"}]
    results = fetch_all_watchlist(period="5d")
    m.WATCHLIST = original
    assert isinstance(results, dict)
    assert "SPY" in results
    assert not results["SPY"].empty
