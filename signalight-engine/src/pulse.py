import logging
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import MACD, SMAIndicator, EMAIndicator
from ta.volatility import BollingerBands
from src.config import SIGNAL_CONFIG

logger = logging.getLogger(__name__)


def calculate_ma(df: pd.DataFrame, period: int) -> float | None:
    """Simple Moving Average for the latest bar."""
    if len(df) < period:
        return None
    sma = SMAIndicator(close=df["close"], window=period)
    val = sma.sma_indicator().iloc[-1]
    return round(float(val), 4) if pd.notna(val) else None


def calculate_ema(df: pd.DataFrame, period: int) -> float | None:
    """Exponential Moving Average for the latest bar."""
    if len(df) < period:
        return None
    ema = EMAIndicator(close=df["close"], window=period)
    val = ema.ema_indicator().iloc[-1]
    return round(float(val), 4) if pd.notna(val) else None


def calculate_rsi(df: pd.DataFrame, period: int = 14) -> float | None:
    """RSI (0–100) for the latest bar."""
    if len(df) < period + 1:
        return None
    rsi = RSIIndicator(close=df["close"], window=period)
    val = rsi.rsi().iloc[-1]
    return round(float(val), 2) if pd.notna(val) else None


def calculate_macd(df: pd.DataFrame) -> dict | None:
    """MACD line and signal line for the latest bar."""
    if len(df) < 26:
        return None
    macd = MACD(close=df["close"])
    macd_val = macd.macd().iloc[-1]
    signal_val = macd.macd_signal().iloc[-1]
    if pd.isna(macd_val) or pd.isna(signal_val):
        return None
    return {
        "macd": round(float(macd_val), 4),
        "macd_signal": round(float(signal_val), 4),
    }


def calculate_bollinger_bands(df: pd.DataFrame, period: int = 20) -> dict | None:
    """Upper and lower Bollinger Bands for the latest bar."""
    if len(df) < period:
        return None
    bb = BollingerBands(close=df["close"], window=period)
    upper = bb.bollinger_hband().iloc[-1]
    lower = bb.bollinger_lband().iloc[-1]
    if pd.isna(upper) or pd.isna(lower):
        return None
    return {
        "bollinger_upper": round(float(upper), 4),
        "bollinger_lower": round(float(lower), 4),
    }


def calculate_drawdown(df: pd.DataFrame) -> dict | None:
    """Current drawdown percentage from all-time high."""
    if df.empty:
        return None
    ath = float(df["close"].max())
    current = float(df["close"].iloc[-1])
    if ath == 0:
        return None
    drawdown_pct = round(((current - ath) / ath) * 100, 2)
    return {
        "drawdown_pct": drawdown_pct,
        "ath": round(ath, 4),
    }


def calculate_volume_analysis(df: pd.DataFrame, period: int = 20) -> dict | None:
    """Volume analysis: current vs average, and ratio."""
    if "volume" not in df.columns or len(df) < period:
        return None
    avg_volume = float(df["volume"].tail(period).mean())
    current_volume = float(df["volume"].iloc[-1])
    prev_volume = float(df["volume"].iloc[-2]) if len(df) >= 2 else None
    ratio = round(current_volume / avg_volume, 2) if avg_volume > 0 else None
    return {
        "volume": int(current_volume),
        "volume_avg": int(avg_volume),
        "volume_ratio": ratio,          # > 1.5 = above average, > 2.0 = spike
        "volume_prev": int(prev_volume) if prev_volume is not None else None,
        "volume_change_pct": round(
            ((current_volume - prev_volume) / prev_volume) * 100, 2
        ) if prev_volume and prev_volume > 0 else None,
    }


def get_all_indicators(df: pd.DataFrame) -> dict:
    """Calculate all indicators and return as a flat dict."""
    if df.empty:
        return {}

    ma_short = SIGNAL_CONFIG["ma_short"]
    ma_long = SIGNAL_CONFIG["ma_long"]
    rsi_period = SIGNAL_CONFIG["rsi_period"]

    current_price = round(float(df["close"].iloc[-1]), 4)

    macd_data = calculate_macd(df) or {}
    bb_data = calculate_bollinger_bands(df) or {}
    dd_data = calculate_drawdown(df) or {}
    vol_data = calculate_volume_analysis(df) or {}

    return {
        "current_price": current_price,
        f"ma_{ma_short}": calculate_ma(df, ma_short),
        f"ma_{ma_long}": calculate_ma(df, ma_long),
        f"ema_{ma_short}": calculate_ema(df, ma_short),
        f"rsi_{rsi_period}": calculate_rsi(df, rsi_period),
        "macd": macd_data.get("macd"),
        "macd_signal": macd_data.get("macd_signal"),
        "bollinger_upper": bb_data.get("bollinger_upper"),
        "bollinger_lower": bb_data.get("bollinger_lower"),
        "drawdown_pct": dd_data.get("drawdown_pct"),
        "ath": dd_data.get("ath"),
        **vol_data,
    }
