import logging
from enum import Enum
from src.config import SIGNAL_CONFIG, DRAWDOWN_LEVELS
from src.store import get_recent_signals

logger = logging.getLogger(__name__)


class SignalType(str, Enum):
    RSI_OVERSOLD           = "RSI Oversold"
    RSI_OVERBOUGHT         = "RSI Overbought"
    MA_GOLDEN_CROSS        = "MA Golden Cross"
    MA_DEATH_CROSS         = "MA Death Cross"
    DRAWDOWN_ENTRY         = "QQQ Drawdown Entry"
    PRICE_BELOW_BOLLINGER  = "Price Below Lower Bollinger"
    PRICE_ABOVE_BOLLINGER  = "Price Above Upper Bollinger"
    VOLUME_SPIKE           = "Volume Spike"
    VWAP_BREAKBELOW        = "Price Below VWAP"
    STOCH_OVERSOLD         = "Stochastic Oversold"
    STOCH_OVERBOUGHT       = "Stochastic Overbought"
    ATR_SPIKE              = "ATR Spike"
    ADX_STRONG_TREND       = "Strong Trend (ADX)"
    OBV_DIVERGENCE         = "OBV Bullish Divergence"
    ICHIMOKU_BREAKOUT      = "Ichimoku Cloud Breakout"
    SUPPORT_BOUNCE         = "Support Level Bounce"
    RESISTANCE_REJECTION   = "Resistance Level Rejection"


class Severity(str, Enum):
    INFO    = "INFO"
    WARNING = "WARNING"
    ACTION  = "ACTION"


def _already_fired(symbol: str, signal_type: str, hours: int | None = None) -> bool:
    """Return True if this signal already fired within the cooldown window."""
    cooldown = hours or SIGNAL_CONFIG["signal_cooldown_hours"]
    recent = get_recent_signals(hours=cooldown)
    return any(
        r["symbol"] == symbol and r["signal_type"] == signal_type
        for r in recent
    )


def check_rsi_signals(symbol: str, indicators: dict) -> list[dict]:
    rsi = indicators.get(f"rsi_{SIGNAL_CONFIG['rsi_period']}")
    if rsi is None:
        return []

    signals = []
    if rsi <= SIGNAL_CONFIG["rsi_oversold"]:
        sig_type = SignalType.RSI_OVERSOLD.value
        if not _already_fired(symbol, sig_type):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.ACTION.value,
                "message": f"RSI {rsi:.1f} — oversold (threshold ≤ {SIGNAL_CONFIG['rsi_oversold']})",
                "indicators": indicators,
                "price": indicators.get("current_price", 0),
            })

    elif rsi >= SIGNAL_CONFIG["rsi_overbought"]:
        sig_type = SignalType.RSI_OVERBOUGHT.value
        if not _already_fired(symbol, sig_type):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.WARNING.value,
                "message": f"RSI {rsi:.1f} — overbought (threshold ≥ {SIGNAL_CONFIG['rsi_overbought']})",
                "indicators": indicators,
                "price": indicators.get("current_price", 0),
            })

    return signals


def check_ma_crossover(
    symbol: str, indicators: dict, prev_indicators: dict
) -> list[dict]:
    ma_short_key = f"ma_{SIGNAL_CONFIG['ma_short']}"
    ma_long_key  = f"ma_{SIGNAL_CONFIG['ma_long']}"

    ma_s = indicators.get(ma_short_key)
    ma_l = indicators.get(ma_long_key)
    prev_ma_s = prev_indicators.get(ma_short_key)
    prev_ma_l = prev_indicators.get(ma_long_key)

    if None in (ma_s, ma_l, prev_ma_s, prev_ma_l):
        return []

    signals = []

    # Golden Cross: short crosses above long
    if prev_ma_s <= prev_ma_l and ma_s > ma_l:
        sig_type = SignalType.MA_GOLDEN_CROSS.value
        if not _already_fired(symbol, sig_type):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.ACTION.value,
                "message": (
                    f"MA{SIGNAL_CONFIG['ma_short']} ({ma_s:.2f}) crossed above "
                    f"MA{SIGNAL_CONFIG['ma_long']} ({ma_l:.2f})"
                ),
                "indicators": indicators,
                "price": indicators.get("current_price", 0),
            })

    # Death Cross: short crosses below long
    elif prev_ma_s >= prev_ma_l and ma_s < ma_l:
        sig_type = SignalType.MA_DEATH_CROSS.value
        if not _already_fired(symbol, sig_type):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.WARNING.value,
                "message": (
                    f"MA{SIGNAL_CONFIG['ma_short']} ({ma_s:.2f}) crossed below "
                    f"MA{SIGNAL_CONFIG['ma_long']} ({ma_l:.2f})"
                ),
                "indicators": indicators,
                "price": indicators.get("current_price", 0),
            })

    return signals


def check_drawdown_levels(symbol: str, indicators: dict) -> list[dict]:
    """Only applies to QQQ. Fires at each drawdown threshold once per 24h."""
    if symbol != "QQQ":
        return []

    drawdown = indicators.get("drawdown_pct")
    if drawdown is None:
        return []

    signals = []
    for level in DRAWDOWN_LEVELS:
        if drawdown <= level["drawdown_pct"]:
            sig_type = f"{SignalType.DRAWDOWN_ENTRY.value} {level['drawdown_pct']}%"
            if not _already_fired(symbol, sig_type):
                signals.append({
                    "symbol": symbol,
                    "signal_type": sig_type,
                    "severity": Severity.ACTION.value,
                    "message": (
                        f"QQQ drawdown {drawdown:.1f}% — {level['action']}"
                    ),
                    "indicators": indicators,
                    "price": indicators.get("current_price", 0),
                })

    return signals


def check_bollinger_signals(symbol: str, indicators: dict) -> list[dict]:
    price  = indicators.get("current_price")
    upper  = indicators.get("bollinger_upper")
    lower  = indicators.get("bollinger_lower")

    if None in (price, upper, lower):
        return []

    signals = []

    if price < lower:
        sig_type = SignalType.PRICE_BELOW_BOLLINGER.value
        if not _already_fired(symbol, sig_type):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.ACTION.value,
                "message": f"Price {price:.2f} below lower Bollinger Band {lower:.2f}",
                "indicators": indicators,
                "price": price,
            })

    elif price > upper:
        sig_type = SignalType.PRICE_ABOVE_BOLLINGER.value
        if not _already_fired(symbol, sig_type):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.WARNING.value,
                "message": f"Price {price:.2f} above upper Bollinger Band {upper:.2f}",
                "indicators": indicators,
                "price": price,
            })

    return signals


def check_vwap_signal(symbol: str, indicators: dict) -> list[dict]:
    """Fire when price breaks below VWAP."""
    price = indicators.get("current_price")
    vwap = indicators.get("vwap")

    if None in (price, vwap):
        return []

    signals = []
    if price < vwap * 0.98:  # Price more than 2% below VWAP
        sig_type = SignalType.VWAP_BREAKBELOW.value
        if not _already_fired(symbol, sig_type):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.WARNING.value,
                "message": f"Price {price:.2f} below VWAP {vwap:.2f}",
                "indicators": indicators,
                "price": price,
            })

    return signals


def check_stochastic_signals(symbol: str, indicators: dict) -> list[dict]:
    """Fire on Stochastic crossovers in oversold/overbought zones."""
    k = indicators.get("stoch_k")
    d = indicators.get("stoch_d")

    if None in (k, d):
        return []

    signals = []

    # Oversold: K and D both below 20
    if k < 20 and d < 20:
        sig_type = SignalType.STOCH_OVERSOLD.value
        if not _already_fired(symbol, sig_type, hours=4):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.ACTION.value,
                "message": f"Stochastic oversold: K={k:.1f}, D={d:.1f}",
                "indicators": indicators,
                "price": indicators.get("current_price", 0),
            })

    # Overbought: K and D both above 80
    elif k > 80 and d > 80:
        sig_type = SignalType.STOCH_OVERBOUGHT.value
        if not _already_fired(symbol, sig_type, hours=4):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.WARNING.value,
                "message": f"Stochastic overbought: K={k:.1f}, D={d:.1f}",
                "indicators": indicators,
                "price": indicators.get("current_price", 0),
            })

    return signals


def check_atr_signal(symbol: str, indicators: dict, atr_prev_indicators: dict | None = None) -> list[dict]:
    """Fire when ATR spikes (sudden volatility increase)."""
    atr = indicators.get("atr")
    if atr is None:
        return []

    # Simple check: if ATR is unusually high, flag it
    # In production, compare to ATR moving average
    signals = []
    if atr > 10:  # Adjust threshold per asset
        sig_type = SignalType.ATR_SPIKE.value
        if not _already_fired(symbol, sig_type, hours=6):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.INFO.value,
                "message": f"High volatility: ATR {atr:.2f}",
                "indicators": indicators,
                "price": indicators.get("current_price", 0),
            })

    return signals


def check_adx_signal(symbol: str, indicators: dict) -> list[dict]:
    """Fire when ADX indicates a strong trend (> 25)."""
    adx = indicators.get("adx")
    if adx is None or adx < 25:
        return []

    sig_type = SignalType.ADX_STRONG_TREND.value
    if _already_fired(symbol, sig_type, hours=12):
        return []

    return [{
        "symbol": symbol,
        "signal_type": sig_type,
        "severity": Severity.INFO.value,
        "message": f"Strong trend detected: ADX {adx:.1f}",
        "indicators": indicators,
        "price": indicators.get("current_price", 0),
    }]


def check_obv_signal(symbol: str, indicators: dict, prev_indicators: dict) -> list[dict]:
    """OBV Bullish Divergence: price at support but OBV rising."""
    price = indicators.get("current_price")
    obv = indicators.get("obv")
    support = indicators.get("support")
    prev_obv = prev_indicators.get("obv")

    if None in (price, obv, support, prev_obv):
        return []

    signals = []
    # Price near support but OBV trending up = bullish divergence
    if price <= support * 1.02 and obv > prev_obv:
        sig_type = SignalType.OBV_DIVERGENCE.value
        if not _already_fired(symbol, sig_type, hours=6):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.ACTION.value,
                "message": f"OBV bullish divergence: price at support {support:.2f}, OBV rising",
                "indicators": indicators,
                "price": price,
            })

    return signals


def check_ichimoku_signal(symbol: str, indicators: dict) -> list[dict]:
    """Ichimoku Cloud Breakout: price crosses above cloud."""
    price = indicators.get("current_price")
    senkou_a = indicators.get("ichimoku_senkou_a")
    senkou_b = indicators.get("ichimoku_senkou_b")

    if None in (price, senkou_a, senkou_b):
        return []

    cloud_top = max(senkou_a, senkou_b)
    cloud_bottom = min(senkou_a, senkou_b)

    signals = []
    # Price breakout above cloud
    if price > cloud_top * 1.01:
        sig_type = SignalType.ICHIMOKU_BREAKOUT.value
        if not _already_fired(symbol, sig_type, hours=8):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.WARNING.value,
                "message": f"Ichimoku breakout above cloud: {price:.2f} > {cloud_top:.2f}",
                "indicators": indicators,
                "price": price,
            })

    return signals


def check_support_resistance_signal(symbol: str, indicators: dict, prev_indicators: dict) -> list[dict]:
    """Price bounces off support or rejected at resistance."""
    price = indicators.get("current_price")
    prev_price = prev_indicators.get("current_price")
    support = indicators.get("support")
    resistance = indicators.get("resistance")

    if None in (price, prev_price, support, resistance):
        return []

    signals = []

    # Bounce off support
    if (
        prev_price is not None
        and prev_price <= support * 1.02
        and price > support * 1.03
    ):
        sig_type = SignalType.SUPPORT_BOUNCE.value
        if not _already_fired(symbol, sig_type, hours=4):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.INFO.value,
                "message": f"Support bounce: bounced from {support:.2f} to {price:.2f}",
                "indicators": indicators,
                "price": price,
            })

    # Rejection at resistance
    elif (
        prev_price is not None
        and prev_price >= resistance * 0.98
        and price < resistance * 0.97
    ):
        sig_type = SignalType.RESISTANCE_REJECTION.value
        if not _already_fired(symbol, sig_type, hours=4):
            signals.append({
                "symbol": symbol,
                "signal_type": sig_type,
                "severity": Severity.INFO.value,
                "message": f"Resistance rejection: rejected from {resistance:.2f} to {price:.2f}",
                "indicators": indicators,
                "price": price,
            })

    return signals


def check_volume_spike(symbol: str, indicators: dict, threshold: float = 2.0) -> list[dict]:
    """Fire when current volume is >= threshold x the 20-day average."""
    ratio = indicators.get("volume_ratio")
    if ratio is None or ratio < threshold:
        return []

    sig_type = SignalType.VOLUME_SPIKE.value
    if _already_fired(symbol, sig_type, hours=4):  # shorter cooldown for volume
        return []

    return [{
        "symbol": symbol,
        "signal_type": sig_type,
        "severity": Severity.INFO.value,
        "message": (
            f"Volume spike: {ratio:.1f}x average "
            f"({indicators.get('volume', 0):,} vs avg {indicators.get('volume_avg', 0):,})"
        ),
        "indicators": indicators,
        "price": indicators.get("current_price", 0),
    }]


def evaluate_all_signals(
    symbol: str,
    indicators: dict,
    prev_indicators: dict,
) -> list[dict]:
    """Run all signal checks and return every triggered signal."""
    if not indicators:
        return []

    triggered = []
    triggered += check_rsi_signals(symbol, indicators)
    triggered += check_ma_crossover(symbol, indicators, prev_indicators)
    triggered += check_drawdown_levels(symbol, indicators)
    triggered += check_bollinger_signals(symbol, indicators)
    triggered += check_volume_spike(symbol, indicators)
    triggered += check_vwap_signal(symbol, indicators)
    triggered += check_stochastic_signals(symbol, indicators)
    triggered += check_atr_signal(symbol, indicators, prev_indicators)
    triggered += check_adx_signal(symbol, indicators)
    triggered += check_obv_signal(symbol, indicators, prev_indicators)
    triggered += check_ichimoku_signal(symbol, indicators)
    triggered += check_support_resistance_signal(symbol, indicators, prev_indicators)

    if triggered:
        logger.info(f"{symbol}: {len(triggered)} signal(s) triggered")
    return triggered
