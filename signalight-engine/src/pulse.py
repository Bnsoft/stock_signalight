import logging
import pandas as pd
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import MACD, SMAIndicator, EMAIndicator, ADXIndicator, IchimokuIndicator
from ta.volatility import BollingerBands, AverageTrueRange
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


def calculate_vwap(df: pd.DataFrame) -> float | None:
    """VWAP (Volume Weighted Average Price)."""
    if "volume" not in df.columns or df.empty:
        return None
    df_copy = df.copy()
    df_copy["hl2"] = (df_copy["high"] + df_copy["low"]) / 2
    df_copy["vwap"] = (df_copy["hl2"] * df_copy["volume"]).cumsum() / df_copy["volume"].cumsum()
    vwap = float(df_copy["vwap"].iloc[-1])
    return round(vwap, 4) if pd.notna(vwap) else None


def calculate_stochastic(df: pd.DataFrame, period: int = 14, smooth: int = 3) -> dict | None:
    """Stochastic Oscillator (%K and %D)."""
    if len(df) < period:
        return None
    stoch = StochasticOscillator(
        high=df["high"], low=df["low"], close=df["close"], window=period, smooth_window=smooth
    )
    k_val = stoch.stoch().iloc[-1]
    d_val = stoch.stoch_signal().iloc[-1]
    if pd.isna(k_val) or pd.isna(d_val):
        return None
    return {
        "stoch_k": round(float(k_val), 2),
        "stoch_d": round(float(d_val), 2),
    }


def calculate_atr(df: pd.DataFrame, period: int = 14) -> float | None:
    """ATR (Average True Range)."""
    if len(df) < period:
        return None
    atr = AverageTrueRange(high=df["high"], low=df["low"], close=df["close"], window=period)
    val = atr.average_true_range().iloc[-1]
    return round(float(val), 4) if pd.notna(val) else None


def calculate_adx(df: pd.DataFrame, period: int = 14) -> float | None:
    """ADX (Average Directional Index) — trend strength (0–100)."""
    if len(df) < period * 2:
        return None
    adx = ADXIndicator(high=df["high"], low=df["low"], close=df["close"], window=period)
    val = adx.adx().iloc[-1]
    return round(float(val), 2) if pd.notna(val) else None


def calculate_obv(df: pd.DataFrame) -> dict | None:
    """OBV (On-Balance Volume) — manual calculation."""
    if "volume" not in df.columns or len(df) < 2:
        return None

    obv = []
    obv_val = 0

    for i in range(len(df)):
        if df["close"].iloc[i] > df["close"].iloc[i - 1] if i > 0 else False:
            obv_val += df["volume"].iloc[i]
        elif df["close"].iloc[i] < df["close"].iloc[i - 1] if i > 0 else False:
            obv_val -= df["volume"].iloc[i]
        obv.append(obv_val)

    obv_latest = obv[-1]
    obv_prev = obv[-2] if len(obv) >= 2 else obv_latest
    trend = "up" if obv_latest > obv_prev else "down"

    return {
        "obv": int(obv_latest),
        "obv_trend": trend,
    }


def calculate_ichimoku(df: pd.DataFrame) -> dict | None:
    """Ichimoku Cloud — comprehensive trend and support/resistance indicator."""
    if len(df) < 52:  # Ichimoku needs enough data
        return None

    ichimoku = IchimokuIndicator(
        high=df["high"], low=df["low"], window1=9, window2=26, window3=52
    )

    tenkan = ichimoku.ichimoku_conversion_line().iloc[-1]
    kijun = ichimoku.ichimoku_base_line().iloc[-1]
    senkou_a = ichimoku.ichimoku_a().iloc[-1]
    senkou_b = ichimoku.ichimoku_b().iloc[-1]
    chikou = df["close"].shift(-26).iloc[-1] if "close" in df.columns else float("nan")

    if any(pd.isna(x) for x in [tenkan, kijun, senkou_a, senkou_b, chikou]):
        return None

    return {
        "ichimoku_tenkan": round(float(tenkan), 4),
        "ichimoku_kijun": round(float(kijun), 4),
        "ichimoku_senkou_a": round(float(senkou_a), 4),
        "ichimoku_senkou_b": round(float(senkou_b), 4),
        "ichimoku_chikou": round(float(chikou), 4),
    }


def calculate_support_resistance(df: pd.DataFrame, window: int = 20) -> dict | None:
    """Auto-detect recent support and resistance levels using local min/max."""
    if len(df) < window:
        return None

    recent = df.tail(window)
    high = float(recent["high"].max())
    low = float(recent["low"].min())

    return {
        "resistance": round(high, 4),
        "support": round(low, 4),
        "range": round(high - low, 4),
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
    stoch_data = calculate_stochastic(df) or {}
    obv_data = calculate_obv(df) or {}
    ichimoku_data = calculate_ichimoku(df) or {}
    sr_data = calculate_support_resistance(df) or {}

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
        "vwap": calculate_vwap(df),
        "stoch_k": stoch_data.get("stoch_k"),
        "stoch_d": stoch_data.get("stoch_d"),
        "atr": calculate_atr(df),
        "adx": calculate_adx(df),
        "obv": obv_data.get("obv"),
        "obv_trend": obv_data.get("obv_trend"),
        "ichimoku_tenkan": ichimoku_data.get("ichimoku_tenkan"),
        "ichimoku_kijun": ichimoku_data.get("ichimoku_kijun"),
        "ichimoku_senkou_a": ichimoku_data.get("ichimoku_senkou_a"),
        "ichimoku_senkou_b": ichimoku_data.get("ichimoku_senkou_b"),
        "ichimoku_chikou": ichimoku_data.get("ichimoku_chikou"),
        "resistance": sr_data.get("resistance"),
        "support": sr_data.get("support"),
        **vol_data,
    }
