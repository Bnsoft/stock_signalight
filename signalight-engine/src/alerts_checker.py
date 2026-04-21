"""Check user-defined alerts against live indicators and fire Telegram notifications."""

import logging
from datetime import datetime
from typing import Optional
import pandas as pd

from . import store
from .pulse import calculate_ma

logger = logging.getLogger(__name__)


def _get_active_alerts(symbol: str) -> dict:
    """Fetch all active user alerts for a symbol."""
    with store._connect() as conn:
        price = conn.execute(
            "SELECT id, alert_type, trigger_price, notify_methods FROM price_alerts "
            "WHERE user_id IS NOT NULL AND symbol = ? AND is_active = 1",
            (symbol,)
        ).fetchall()

        indicator = conn.execute(
            "SELECT id, indicator, condition, threshold, timeframe, notify_methods FROM indicator_alerts "
            "WHERE symbol = ? AND is_active = 1",
            (symbol,)
        ).fetchall()

        volume = conn.execute(
            "SELECT id, alert_type, multiplier, notify_methods FROM volume_alerts "
            "WHERE symbol = ? AND is_active = 1",
            (symbol,)
        ).fetchall()

    return {"price": price, "indicator": indicator, "volume": volume}


def _already_fired(alert_id: int, alert_type: str) -> bool:
    """Prevent duplicate fires within 24h."""
    with store._connect() as conn:
        row = conn.execute(
            "SELECT fired_at FROM alert_fire_log WHERE alert_id = ? AND alert_category = ? "
            "AND fired_at > datetime('now', '-24 hours')",
            (alert_id, alert_type)
        ).fetchone()
    return row is not None


def _log_fire(alert_id: int, alert_type: str):
    with store._connect() as conn:
        conn.execute(
            "INSERT INTO alert_fire_log (alert_id, alert_category, fired_at) VALUES (?, ?, ?)",
            (alert_id, alert_type, datetime.utcnow().isoformat())
        )
        conn.commit()


def _ma_value(df: pd.DataFrame, period: int) -> Optional[float]:
    return calculate_ma(df, period)


def _prev_ma_value(df: pd.DataFrame, period: int) -> Optional[float]:
    """MA value one bar ago."""
    if len(df) < period + 1:
        return None
    return calculate_ma(df.iloc[:-1], period)


def check_user_alerts(symbol: str, df: pd.DataFrame, current_price: float, current_volume: float, avg_volume: float) -> list[dict]:
    """Check all user alerts for a symbol. Returns list of triggered alert dicts."""
    alerts = _get_active_alerts(symbol)
    triggered = []

    # --- Price alerts ---
    for row in alerts["price"]:
        alert_id, alert_type, trigger_price, notify_methods = row
        if _already_fired(alert_id, "PRICE"):
            continue

        fired = False
        if alert_type == "PRICE_ABOVE" and current_price > trigger_price:
            fired = True
        elif alert_type == "PRICE_BELOW" and current_price < trigger_price:
            fired = True

        if fired:
            _log_fire(alert_id, "PRICE")
            triggered.append({
                "symbol": symbol,
                "alert_type": "PRICE",
                "condition": alert_type,
                "current_price": current_price,
                "trigger_price": trigger_price,
                "notify_methods": (notify_methods or "PUSH").split(","),
                "message": f"{symbol} 가격 알람: ${current_price:.2f} ({alert_type.replace('_', ' ')} ${trigger_price:.2f})",
            })

    # --- MA / Indicator alerts ---
    for row in alerts["indicator"]:
        alert_id, indicator, condition, threshold, timeframe, notify_methods = row
        if indicator != "MA":
            continue
        if _already_fired(alert_id, "INDICATOR"):
            continue

        period = int(threshold)
        curr_ma = _ma_value(df, period)
        prev_ma = _prev_ma_value(df, period)

        if curr_ma is None:
            continue

        fired = False
        if condition == "CROSS_ABOVE" and prev_ma is not None:
            fired = current_price > curr_ma and (df["Close"].iloc[-2] if len(df) > 1 else current_price) <= prev_ma
        elif condition == "CROSS_BELOW" and prev_ma is not None:
            prev_close = df["Close"].iloc[-2] if len(df) > 1 else current_price
            fired = current_price < curr_ma and prev_close >= prev_ma
        elif condition == "ABOVE":
            fired = current_price > curr_ma
        elif condition == "BELOW":
            fired = current_price < curr_ma

        if fired:
            _log_fire(alert_id, "INDICATOR")
            label_map = {
                "CROSS_ABOVE": "골든크로스 (상향돌파)",
                "CROSS_BELOW": "데드크로스 (하향돌파)",
                "ABOVE": "이평선 위",
                "BELOW": "이평선 아래",
            }
            triggered.append({
                "symbol": symbol,
                "alert_type": "INDICATOR",
                "condition": condition,
                "current_price": current_price,
                "ma_period": period,
                "ma_value": curr_ma,
                "timeframe": timeframe,
                "notify_methods": (notify_methods or "PUSH").split(","),
                "message": f"{symbol} MA{period} {label_map.get(condition, condition)}: 현재가 ${current_price:.2f} / MA{period} ${curr_ma:.2f}",
            })

    # --- Volume alerts ---
    for row in alerts["volume"]:
        alert_id, alert_type, multiplier, notify_methods = row
        if _already_fired(alert_id, "VOLUME"):
            continue

        if avg_volume > 0 and current_volume > avg_volume * multiplier:
            _log_fire(alert_id, "VOLUME")
            triggered.append({
                "symbol": symbol,
                "alert_type": "VOLUME",
                "condition": alert_type,
                "current_volume": current_volume,
                "avg_volume": avg_volume,
                "multiplier": multiplier,
                "notify_methods": (notify_methods or "PUSH").split(","),
                "message": f"{symbol} 거래량 급등: {current_volume:,.0f} (평균의 {current_volume/avg_volume:.1f}배)",
            })

    return triggered
