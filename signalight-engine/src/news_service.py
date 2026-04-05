"""News, economic indicators, and market sentiment module"""

import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


def get_news_feed(symbol: Optional[str] = None, limit: int = 20) -> List[Dict]:
    """Get latest news feed for stocks or market"""

    # In production, integrate with news APIs (NewsAPI, Finnhub, etc.)
    # For now, retrieve from database
    with store._connect() as conn:
        query = """SELECT id, source, title, url, summary, sentiment, published_at
                   FROM news_signals
                   WHERE 1=1"""
        params = []

        if symbol:
            query += " AND symbol = ?"
            params.append(symbol.upper())

        query += " ORDER BY published_at DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()

    news = []
    for row in rows:
        news.append({
            "id": row[0],
            "source": row[1],
            "title": row[2],
            "url": row[3],
            "summary": row[4],
            "sentiment": row[5],
            "published_at": row[6]
        })

    return news


def link_news_to_signal(signal_id: int, news_id: int, relevance_score: float = 0.5):
    """Link news to a signal"""
    with store._connect() as conn:
        conn.execute(
            """INSERT INTO news_signal_links
               (signal_id, news_id, relevance_score, created_at)
               VALUES (?, ?, ?, ?)""",
            (signal_id, news_id, relevance_score, datetime.utcnow().isoformat())
        )
        conn.commit()


def get_economic_events(days_ahead: int = 30) -> List[Dict]:
    """Get upcoming economic events calendar"""

    with store._connect() as conn:
        future_date = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat()

        rows = conn.execute(
            """SELECT id, event_name, country, scheduled_time, previous_value,
                      forecast_value, actual_value, impact, description
               FROM economic_calendar
               WHERE scheduled_time <= ?
               AND scheduled_time >= datetime('now')
               ORDER BY scheduled_time ASC""",
            (future_date,)
        ).fetchall()

    events = []
    for row in rows:
        events.append({
            "id": row[0],
            "event_name": row[1],
            "country": row[2],
            "scheduled_time": row[3],
            "previous_value": row[4],
            "forecast_value": row[5],
            "actual_value": row[6],
            "impact": row[7],  # LOW, MEDIUM, HIGH
            "description": row[8]
        })

    return events


def get_earnings_calendar(days_ahead: int = 30) -> List[Dict]:
    """Get upcoming earnings calendar"""

    with store._connect() as conn:
        future_date = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat()

        rows = conn.execute(
            """SELECT id, symbol, company_name, earnings_date, eps_estimate,
                      revenue_estimate, report_time
               FROM earnings_calendar
               WHERE earnings_date <= ?
               AND earnings_date >= datetime('now')
               ORDER BY earnings_date ASC""",
            (future_date,)
        ).fetchall()

    earnings = []
    for row in rows:
        earnings.append({
            "id": row[0],
            "symbol": row[1],
            "company_name": row[2],
            "earnings_date": row[3],
            "eps_estimate": row[4],
            "revenue_estimate": row[5],
            "report_time": row[6]
        })

    return earnings


def get_market_sentiment() -> Dict:
    """Get overall market sentiment indicators"""

    # In production, fetch real data from APIs
    # For now, return simulated/cached values
    return {
        "vix": {
            "value": 15.2,
            "previous_close": 14.8,
            "change": 0.4,
            "interpretation": "normal"  # low, normal, elevated, extreme
        },
        "put_call_ratio": {
            "value": 1.05,
            "average": 1.0,
            "interpretation": "slightly_bearish"
        },
        "market_breadth": {
            "advancing": 2100,
            "declining": 900,
            "unchanged": 50,
            "advance_decline_ratio": 2.33
        },
        "fear_greed_index": {
            "value": 62,
            "label": "neutral"  # extreme_fear(0), fear, neutral, greed, extreme_greed(100)
        },
        "market_cap": {
            "us_market": 45000000000000,  # $45 trillion
            "total_volume": 12500000000,  # 12.5B shares
            "breadth_trend": "bullish"
        }
    }


def get_related_assets_correlation() -> Dict:
    """Get correlation and performance of related assets"""

    # Fetch or cache price data for related assets
    with store._connect() as conn:
        # This would normally fetch real-time prices
        # For now, return structured data
        pass

    return {
        "crude_oil_wti": {
            "price": 78.50,
            "change_pct": 2.3,
            "correlation_to_stocks": -0.4
        },
        "gold": {
            "price": 2085.50,
            "change_pct": 0.8,
            "correlation_to_stocks": -0.2
        },
        "usd_index": {
            "value": 104.2,
            "change_pct": -0.5,
            "correlation_to_stocks": -0.6
        },
        "10year_treasury": {
            "yield": 4.25,
            "change_bps": 5,
            "correlation_to_stocks": -0.7
        },
        "bitcoin": {
            "price": 68500,
            "change_pct": 5.2,
            "correlation_to_stocks": 0.5
        }
    }


def save_news_signal(
    symbol: str,
    title: str,
    summary: str,
    url: str,
    source: str,
    sentiment: str,
    signal_strength: float = 0.5
):
    """Save news signal to database"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO news_signals
               (symbol, title, summary, url, source, sentiment, signal_strength, published_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (symbol.upper(), title, summary, url, source, sentiment, signal_strength,
             datetime.utcnow().isoformat())
        )
        conn.commit()


def save_economic_event(
    event_name: str,
    country: str,
    scheduled_time: str,
    previous_value: Optional[float],
    forecast_value: Optional[float],
    impact: str,
    description: Optional[str] = None
):
    """Save economic event to calendar"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO economic_calendar
               (event_name, country, scheduled_time, previous_value, forecast_value, impact, description)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (event_name, country, scheduled_time, previous_value, forecast_value, impact, description)
        )
        conn.commit()


def save_earnings_event(
    symbol: str,
    company_name: str,
    earnings_date: str,
    eps_estimate: Optional[float],
    revenue_estimate: Optional[float],
    report_time: Optional[str] = None
):
    """Save earnings event to calendar"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO earnings_calendar
               (symbol, company_name, earnings_date, eps_estimate, revenue_estimate, report_time)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (symbol.upper(), company_name, earnings_date, eps_estimate, revenue_estimate, report_time)
        )
        conn.commit()


def get_news_signal_impact(symbol: str, days: int = 7) -> Dict:
    """Analyze news signal impact on price movement"""

    with store._connect() as conn:
        # Get news signals
        news = conn.execute(
            """SELECT sentiment, published_at
               FROM news_signals
               WHERE symbol = ?
               AND published_at > datetime('now', '-' || ? || ' days')
               ORDER BY published_at DESC""",
            (symbol.upper(), days)
        ).fetchall()

        # Get price change
        prices = conn.execute(
            """SELECT current_price FROM positions
               WHERE symbol = ?
               ORDER BY updated_at DESC LIMIT 2""",
            (symbol.upper(),)
        ).fetchall()

    if len(prices) < 2:
        return {"signal_count": 0, "price_change": 0, "impact_score": 0}

    sentiment_positive = sum(1 for n in news if n[0] == "positive")
    sentiment_negative = sum(1 for n in news if n[0] == "negative")
    sentiment_neutral = sum(1 for n in news if n[0] == "neutral")

    price_change = ((prices[0][0] - prices[1][0]) / prices[1][0]) * 100

    # Calculate impact score based on sentiment alignment
    impact_score = 0
    if price_change > 0 and sentiment_positive > sentiment_negative:
        impact_score = min(100, (sentiment_positive / (len(news) or 1)) * 100)
    elif price_change < 0 and sentiment_negative > sentiment_positive:
        impact_score = min(100, (sentiment_negative / (len(news) or 1)) * 100)

    return {
        "symbol": symbol,
        "signal_count": len(news),
        "positive_sentiment": sentiment_positive,
        "negative_sentiment": sentiment_negative,
        "neutral_sentiment": sentiment_neutral,
        "price_change_pct": round(price_change, 2),
        "impact_score": round(impact_score, 2),
        "days_analyzed": days
    }


def track_sector_news_correlation(sector: str) -> Dict:
    """Track how sector news affects ETF performance"""

    # Example sectors: Technology, Healthcare, Finance, Energy
    sector_etfs = {
        "Technology": "QQQ",
        "Healthcare": "XLV",
        "Finance": "XLF",
        "Energy": "XLE",
        "Consumer": "XLY",
        "Industrial": "XLI"
    }

    etf = sector_etfs.get(sector)
    if not etf:
        return {"error": "Unknown sector"}

    # Get sentiment for sector companies
    with store._connect() as conn:
        news = conn.execute(
            """SELECT sentiment FROM news_signals
               WHERE symbol IN (SELECT symbol FROM positions WHERE sector = ?)
               AND published_at > datetime('now', '-7 days')""",
            (sector,)
        ).fetchall()

    if not news:
        return {"sector": sector, "etf": etf, "news_count": 0}

    positive = sum(1 for n in news if n[0] == "positive")
    negative = sum(1 for n in news if n[0] == "negative")

    sentiment_score = (positive - negative) / len(news) * 100 if news else 0

    return {
        "sector": sector,
        "etf": etf,
        "news_count": len(news),
        "positive_news": positive,
        "negative_news": negative,
        "sector_sentiment_score": round(sentiment_score, 2)
    }
