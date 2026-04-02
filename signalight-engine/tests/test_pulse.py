import pytest
import pandas as pd
import numpy as np
from src.pulse import (
    calculate_ma,
    calculate_ema,
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_drawdown,
    calculate_volume_analysis,
    get_all_indicators,
)


def make_df(prices: list, volumes: list | None = None) -> pd.DataFrame:
    """Helper to build a minimal OHLCV DataFrame from a close price list."""
    close = pd.Series(prices, dtype=float)
    df = pd.DataFrame({
        "open": close,
        "high": close * 1.01,
        "low": close * 0.99,
        "close": close,
        "volume": volumes if volumes else [1_000_000] * len(prices),
    })
    return df


# --- MA ---

def test_ma_calculation():
    prices = list(range(1, 22))  # 1..21
    df = make_df(prices)
    result = calculate_ma(df, 20)
    expected = sum(range(2, 22)) / 20  # avg of last 20
    assert result == round(expected, 4)


def test_ma_insufficient_data():
    df = make_df([100, 200])
    assert calculate_ma(df, 20) is None


# --- EMA ---

def test_ema_returns_float():
    df = make_df(list(range(1, 32)))
    result = calculate_ema(df, 20)
    assert isinstance(result, float)
    assert result > 0


# --- RSI ---

def test_rsi_range():
    import src.market as m
    df = m.fetch_daily_data("SPY", period="3mo")
    rsi = calculate_rsi(df, period=14)
    assert rsi is not None
    assert 0 <= rsi <= 100


def test_rsi_oversold_signal():
    # Steadily declining prices should produce low RSI
    prices = [100 - i * 2 for i in range(30)]
    df = make_df(prices)
    rsi = calculate_rsi(df, period=14)
    assert rsi is not None
    assert rsi < 40


def test_rsi_overbought_signal():
    # Steadily rising prices should produce high RSI
    prices = [100 + i * 2 for i in range(30)]
    df = make_df(prices)
    rsi = calculate_rsi(df, period=14)
    assert rsi is not None
    assert rsi > 60


def test_rsi_insufficient_data():
    df = make_df([100, 101, 102])
    assert calculate_rsi(df, period=14) is None


# --- MACD ---

def test_macd_returns_dict():
    prices = [100 + np.sin(i / 5) * 10 for i in range(50)]
    df = make_df(prices)
    result = calculate_macd(df)
    assert result is not None
    assert "macd" in result
    assert "macd_signal" in result


def test_macd_insufficient_data():
    df = make_df([100] * 20)
    assert calculate_macd(df) is None


# --- Bollinger Bands ---

def test_bollinger_bands_upper_gt_lower():
    prices = [100 + np.sin(i) * 5 for i in range(30)]
    df = make_df(prices)
    result = calculate_bollinger_bands(df, period=20)
    assert result is not None
    assert result["bollinger_upper"] > result["bollinger_lower"]


def test_bollinger_bands_insufficient_data():
    df = make_df([100] * 10)
    assert calculate_bollinger_bands(df, period=20) is None


# --- Drawdown ---

def test_drawdown_accuracy():
    prices = [100, 110, 120, 90, 100]  # ATH=120, current=100
    df = make_df(prices)
    result = calculate_drawdown(df)
    assert result is not None
    assert result["ath"] == 120.0
    expected_dd = round(((100 - 120) / 120) * 100, 2)
    assert result["drawdown_pct"] == expected_dd


def test_drawdown_at_ath():
    prices = [100, 110, 120]
    df = make_df(prices)
    result = calculate_drawdown(df)
    assert result["drawdown_pct"] == 0.0


# --- Volume Analysis ---

def test_volume_ratio_spike():
    # Last volume is 3x the average
    volumes = [1_000_000] * 19 + [3_000_000]
    df = make_df([100] * 20, volumes=volumes)
    result = calculate_volume_analysis(df, period=20)
    assert result is not None
    assert result["volume_ratio"] > 1.5


def test_volume_change_pct():
    volumes = [1_000_000] * 18 + [1_000_000, 2_000_000]
    df = make_df([100] * 20, volumes=volumes)
    result = calculate_volume_analysis(df, period=20)
    assert result["volume_change_pct"] == 100.0


# --- get_all_indicators ---

def test_get_all_indicators_keys():
    import src.market as m
    df = m.fetch_daily_data("SPY", period="6mo")
    result = get_all_indicators(df)
    expected_keys = [
        "current_price", "ma_20", "ma_60", "ema_20",
        "rsi_14", "macd", "macd_signal",
        "bollinger_upper", "bollinger_lower",
        "drawdown_pct", "ath",
        "volume", "volume_avg", "volume_ratio",
    ]
    for key in expected_keys:
        assert key in result, f"Missing key: {key}"


def test_get_all_indicators_empty_df():
    result = get_all_indicators(pd.DataFrame())
    assert result == {}
