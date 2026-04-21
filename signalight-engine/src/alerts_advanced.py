"""Advanced Alert System - Advanced Alert Configuration"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


# ============= Alert Templates =============

def _schedule_kwargs(kwargs: dict) -> tuple:
    """Extract schedule fields from kwargs, return tuple for INSERT."""
    return (
        1 if kwargs.get("schedule_enabled") else 0,
        kwargs.get("schedule_type", "once"),
        kwargs.get("schedule_time"),
        kwargs.get("schedule_days", "daily"),
        kwargs.get("schedule_start"),
        kwargs.get("schedule_end"),
        kwargs.get("schedule_interval", 5),
    )


def create_price_alert(
    user_id: str,
    symbol: str,
    alert_type: str,
    trigger_price: float,
    trigger_price_high: Optional[float] = None,
    notify_methods: List[str] = None,
    repeat_alert: bool = True,
    **schedule_kwargs
) -> Dict:
    if notify_methods is None:
        notify_methods = ["PUSH"]
    sched = _schedule_kwargs(schedule_kwargs)

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO price_alerts
               (user_id, symbol, alert_type, trigger_price, trigger_price_high,
                notify_methods, repeat_alert, is_active, created_at,
                schedule_enabled, schedule_type, schedule_time, schedule_days,
                schedule_start, schedule_end, schedule_interval)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, symbol.upper(), alert_type, trigger_price, trigger_price_high,
             ",".join(notify_methods), 1 if repeat_alert else 0,
             datetime.utcnow().isoformat(), *sched)
        )
        conn.commit()

    return {"user_id": user_id, "symbol": symbol, "alert_type": alert_type,
            "trigger_price": trigger_price, "notify_methods": notify_methods, "status": "ACTIVE"}


def create_indicator_alert(
    user_id: str,
    symbol: str,
    indicator: str,
    condition: str,
    threshold: float,
    timeframe: str = "1D",
    notify_methods: List[str] = None,
    **schedule_kwargs
) -> Dict:
    if notify_methods is None:
        notify_methods = ["PUSH"]
    sched = _schedule_kwargs(schedule_kwargs)

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO indicator_alerts
               (user_id, symbol, indicator, condition, threshold, timeframe,
                notify_methods, is_active, created_at,
                schedule_enabled, schedule_type, schedule_time, schedule_days,
                schedule_start, schedule_end, schedule_interval)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, symbol.upper(), indicator, condition, threshold, timeframe,
             ",".join(notify_methods), datetime.utcnow().isoformat(), *sched)
        )
        conn.commit()

    return {"user_id": user_id, "symbol": symbol, "indicator": indicator,
            "condition": condition, "threshold": threshold, "status": "ACTIVE"}


def create_volume_alert(
    user_id: str,
    symbol: str,
    alert_type: str,
    volume_threshold: float,
    multiplier: float = 2.0,
    notify_methods: List[str] = None,
    **schedule_kwargs
) -> Dict:
    if notify_methods is None:
        notify_methods = ["PUSH"]
    sched = _schedule_kwargs(schedule_kwargs)

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO volume_alerts
               (user_id, symbol, alert_type, volume_threshold, multiplier,
                notify_methods, is_active, created_at,
                schedule_enabled, schedule_type, schedule_time, schedule_days,
                schedule_start, schedule_end, schedule_interval)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, symbol.upper(), alert_type, volume_threshold, multiplier,
             ",".join(notify_methods), datetime.utcnow().isoformat(), *sched)
        )
        conn.commit()

    return {"user_id": user_id, "symbol": symbol, "alert_type": alert_type,
            "multiplier": multiplier, "status": "ACTIVE"}


def create_portfolio_alert(
    user_id: str,
    alert_type: str,  # "PORTFOLIO_GAIN", "PORTFOLIO_LOSS", "POSITION_LOSS", "DAILY_LOSS"
    threshold: float,
    notify_methods: List[str] = None
) -> Dict:
    """Create a portfolio-based alert"""
    if notify_methods is None:
        notify_methods = ["PUSH", "EMAIL"]

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO portfolio_alerts
               (user_id, alert_type, threshold, notify_methods, is_active, created_at)
               VALUES (?, ?, ?, ?, 1, ?)""",
            (user_id, alert_type, threshold, ",".join(notify_methods),
             datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "alert_type": alert_type,
        "threshold": threshold,
        "notify_methods": notify_methods,
        "status": "ACTIVE"
    }


def create_news_alert(
    user_id: str,
    symbol: str,
    keywords: List[str],
    sentiment: Optional[str] = None,  # "POSITIVE", "NEGATIVE", "NEUTRAL" or None for all
    notify_methods: List[str] = None
) -> Dict:
    """Create a news-based alert"""
    if notify_methods is None:
        notify_methods = ["PUSH", "EMAIL"]

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO news_alerts
               (user_id, symbol, keywords, sentiment, notify_methods, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, 1, ?)""",
            (user_id, symbol.upper(), ",".join(keywords), sentiment or "ALL",
             ",".join(notify_methods), datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "symbol": symbol,
        "keywords": keywords,
        "sentiment": sentiment or "ALL",
        "notify_methods": notify_methods,
        "status": "ACTIVE"
    }


def create_time_based_alert(
    user_id: str,
    symbol: str,
    alert_time: str,  # "09:30", "16:00" (market hours)
    message: str,
    recurring: str = "DAILY",  # "ONCE", "DAILY", "WEEKLY", "MONTHLY"
    days_of_week: Optional[List[str]] = None,  # ["MON", "TUE", ...] for WEEKLY
    notify_methods: List[str] = None
) -> Dict:
    """Create a time-based alert"""
    if notify_methods is None:
        notify_methods = ["PUSH"]

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO time_alerts
               (user_id, symbol, alert_time, message, recurring, days_of_week,
                notify_methods, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)""",
            (user_id, symbol.upper(), alert_time, message, recurring,
             ",".join(days_of_week or []), ",".join(notify_methods),
             datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "symbol": symbol,
        "alert_time": alert_time,
        "recurring": recurring,
        "notify_methods": notify_methods,
        "status": "ACTIVE"
    }


def create_composite_alert(
    user_id: str,
    symbol: str,
    conditions: List[Dict],  # [{"type": "RSI", "value": 30}, {"type": "PRICE", "value": 150}]
    logic: str = "AND",  # "AND" or "OR"
    notify_methods: List[str] = None
) -> Dict:
    """Create a composite condition alert"""
    if notify_methods is None:
        notify_methods = ["PUSH"]

    import json
    with store._connect() as conn:
        conn.execute(
            """INSERT INTO composite_alerts
               (user_id, symbol, conditions, logic, notify_methods, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, 1, ?)""",
            (user_id, symbol.upper(), json.dumps(conditions), logic,
             ",".join(notify_methods), datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "symbol": symbol,
        "conditions": conditions,
        "logic": logic,
        "notify_methods": notify_methods,
        "status": "ACTIVE"
    }


# ============= Alert Management =============

def get_all_alerts(user_id: str) -> Dict:
    """Retrieve all alerts for a user"""
    with store._connect() as conn:
        price_alerts = conn.execute(
            """SELECT id, symbol, alert_type, trigger_price, is_active, notify_methods,
                      schedule_enabled, schedule_time, schedule_days,
                      schedule_type, schedule_start, schedule_end, schedule_interval
               FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

        indicator_alerts = conn.execute(
            """SELECT id, symbol, indicator, condition, threshold, timeframe, is_active, notify_methods,
                      schedule_enabled, schedule_time, schedule_days,
                      schedule_type, schedule_start, schedule_end, schedule_interval
               FROM indicator_alerts WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

        volume_alerts = conn.execute(
            """SELECT id, symbol, alert_type, volume_threshold, is_active, notify_methods,
                      schedule_enabled, schedule_time, schedule_days,
                      schedule_type, schedule_start, schedule_end, schedule_interval
               FROM volume_alerts WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

        portfolio_alerts = conn.execute(
            """SELECT id, alert_type, threshold, is_active FROM portfolio_alerts
               WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

        news_alerts = conn.execute(
            """SELECT id, symbol, keywords, sentiment, is_active FROM news_alerts
               WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

        time_alerts = conn.execute(
            """SELECT id, symbol, alert_time, recurring, is_active FROM time_alerts
               WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

    return {
        "price_alerts": [
            {"id": p[0], "symbol": p[1], "type": p[2], "trigger": p[3], "active": bool(p[4]),
             "notify_methods": (p[5] or "PUSH").split(","),
             "schedule_enabled": bool(p[6]), "schedule_time": p[7], "schedule_days": p[8],
             "schedule_type": p[9] or "once", "schedule_start": p[10], "schedule_end": p[11], "schedule_interval": p[12] or 5}
            for p in price_alerts
        ],
        "indicator_alerts": [
            {"id": i[0], "symbol": i[1], "indicator": i[2], "condition": i[3], "threshold": i[4],
             "timeframe": i[5], "active": bool(i[6]), "notify_methods": (i[7] or "PUSH").split(","),
             "schedule_enabled": bool(i[8]), "schedule_time": i[9], "schedule_days": i[10],
             "schedule_type": i[11] or "once", "schedule_start": i[12], "schedule_end": i[13], "schedule_interval": i[14] or 5}
            for i in indicator_alerts
        ],
        "volume_alerts": [
            {"id": v[0], "symbol": v[1], "type": v[2], "threshold": v[3], "active": bool(v[4]),
             "notify_methods": (v[5] or "PUSH").split(","),
             "schedule_enabled": bool(v[6]), "schedule_time": v[7], "schedule_days": v[8],
             "schedule_type": v[9] or "once", "schedule_start": v[10], "schedule_end": v[11], "schedule_interval": v[12] or 5}
            for v in volume_alerts
        ],
        "portfolio_alerts": [
            {"id": p[0], "type": p[1], "threshold": p[2], "active": bool(p[3])}
            for p in portfolio_alerts
        ],
        "news_alerts": [
            {"id": n[0], "symbol": n[1], "keywords": n[2], "sentiment": n[3], "active": bool(n[4])}
            for n in news_alerts
        ],
        "time_alerts": [
            {"id": t[0], "symbol": t[1], "time": t[2], "recurring": t[3], "active": bool(t[4])}
            for t in time_alerts
        ],
        "total_active": sum([len([a for a in [price_alerts, indicator_alerts, volume_alerts, portfolio_alerts, news_alerts, time_alerts] if a])])
    }


def toggle_alert(alert_id: int, alert_type: str, is_active: bool) -> bool:
    """Enable or disable an alert"""
    table_map = {
        "PRICE": "price_alerts",
        "INDICATOR": "indicator_alerts",
        "VOLUME": "volume_alerts",
        "PORTFOLIO": "portfolio_alerts",
        "NEWS": "news_alerts",
        "TIME": "time_alerts",
        "COMPOSITE": "composite_alerts"
    }

    table_name = table_map.get(alert_type)
    if not table_name:
        return False

    with store._connect() as conn:
        conn.execute(
            f"UPDATE {table_name} SET is_active = ? WHERE id = ?",
            (1 if is_active else 0, alert_id)
        )
        conn.commit()

    return True


def delete_alert(alert_id: int, alert_type: str) -> bool:
    """Delete an alert"""
    table_map = {
        "PRICE": "price_alerts",
        "INDICATOR": "indicator_alerts",
        "VOLUME": "volume_alerts",
        "PORTFOLIO": "portfolio_alerts",
        "NEWS": "news_alerts",
        "TIME": "time_alerts",
        "COMPOSITE": "composite_alerts"
    }

    table_name = table_map.get(alert_type)
    if not table_name:
        return False

    with store._connect() as conn:
        conn.execute(f"DELETE FROM {table_name} WHERE id = ?", (alert_id,))
        conn.commit()

    return True


def get_alert_history(user_id: str, limit: int = 50) -> List[Dict]:
    """Alert trigger history"""
    with store._connect() as conn:
        history = conn.execute(
            """SELECT id, alert_type, symbol, trigger_price, notify_method, triggered_at
               FROM alert_history
               WHERE user_id = ?
               ORDER BY triggered_at DESC
               LIMIT ?""",
            (user_id, limit)
        ).fetchall()

    return [
        {
            "id": h[0],
            "alert_type": h[1],
            "symbol": h[2],
            "trigger_price": h[3],
            "notify_method": h[4],
            "triggered_at": h[5]
        }
        for h in history
    ]


def configure_notification_settings(
    user_id: str,
    email: bool = True,
    push: bool = True,
    sms: bool = False,
    telegram: bool = False,
    discord: bool = False,
    quiet_hours: Optional[str] = None  # "23:00-09:00"
) -> Dict:
    """Configure notification settings"""
    with store._connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO notification_settings
               (user_id, email_enabled, push_enabled, sms_enabled, telegram_enabled,
                discord_enabled, quiet_hours, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, 1 if email else 0, 1 if push else 0, 1 if sms else 0,
             1 if telegram else 0, 1 if discord else 0, quiet_hours,
             datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "email_enabled": email,
        "push_enabled": push,
        "sms_enabled": sms,
        "telegram_enabled": telegram,
        "discord_enabled": discord,
        "quiet_hours": quiet_hours
    }
