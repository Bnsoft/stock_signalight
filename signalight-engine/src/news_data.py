"""News & Events Data - News and Events Data"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


def get_latest_news(
    symbol: Optional[str] = None,
    limit: int = 20,
    sentiment: Optional[str] = None
) -> List[Dict]:
    """Retrieve the latest news"""
    # Simulated news data
    news_items = [
        {
            "id": 1,
            "symbol": "AAPL",
            "title": "Apple Q2 earnings beat expectations with strong iPhone sales",
            "source": "CNBC",
            "url": "https://example.com/news/1",
            "published_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "sentiment": "POSITIVE",
            "content": "Apple reported Q2 earnings that beat Wall Street expectations...",
            "relevance_score": 0.95,
            "news_type": "EARNINGS"
        },
        {
            "id": 2,
            "symbol": "MSFT",
            "title": "Microsoft announces $10B investment in AI research",
            "source": "Bloomberg",
            "url": "https://example.com/news/2",
            "published_at": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
            "sentiment": "POSITIVE",
            "content": "Microsoft announced a significant investment in artificial intelligence...",
            "relevance_score": 0.92,
            "news_type": "CORPORATE_ACTION"
        },
        {
            "id": 3,
            "symbol": "TSLA",
            "title": "Tesla faces increased competition in EV market",
            "source": "Reuters",
            "url": "https://example.com/news/3",
            "published_at": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
            "sentiment": "NEGATIVE",
            "content": "Tesla's market share in the electric vehicle sector is declining...",
            "relevance_score": 0.88,
            "news_type": "INDUSTRY_NEWS"
        },
        {
            "id": 4,
            "symbol": "NVDA",
            "title": "NVIDIA sets new quarterly revenue record",
            "source": "MarketWatch",
            "url": "https://example.com/news/4",
            "published_at": (datetime.utcnow() - timedelta(hours=8)).isoformat(),
            "sentiment": "POSITIVE",
            "content": "NVIDIA reported record quarterly revenue driven by AI chip demand...",
            "relevance_score": 0.91,
            "news_type": "EARNINGS"
        },
        {
            "id": 5,
            "symbol": "JPM",
            "title": "JPMorgan warns of potential recession risks",
            "source": "Financial Times",
            "url": "https://example.com/news/5",
            "published_at": (datetime.utcnow() - timedelta(hours=10)).isoformat(),
            "sentiment": "NEGATIVE",
            "content": "JPMorgan Chase's chief economist warns about potential recession...",
            "relevance_score": 0.85,
            "news_type": "ECONOMIC_OUTLOOK"
        },
    ]

    # Filtering
    if symbol:
        news_items = [n for n in news_items if n["symbol"].upper() == symbol.upper()]

    if sentiment:
        news_items = [n for n in news_items if n["sentiment"] == sentiment.upper()]

    return news_items[:limit]


def get_earnings_calendar(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50
) -> List[Dict]:
    """Retrieve the earnings release calendar"""
    earnings = [
        {
            "symbol": "AAPL",
            "company_name": "Apple Inc.",
            "earnings_date": (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "fiscal_quarter": "Q2 2024",
            "eps_estimate": 1.95,
            "revenue_estimate": 98.5e9,
            "previous_eps": 1.85,
            "previous_revenue": 94.8e9,
            "market_cap": 2.5e12,
            "time": "After Market Close"
        },
        {
            "symbol": "MSFT",
            "company_name": "Microsoft Corporation",
            "earnings_date": (datetime.utcnow() + timedelta(days=8)).strftime("%Y-%m-%d"),
            "fiscal_quarter": "Q3 2024",
            "eps_estimate": 2.75,
            "revenue_estimate": 65.2e9,
            "previous_eps": 2.55,
            "previous_revenue": 61.8e9,
            "market_cap": 3.1e12,
            "time": "After Market Close"
        },
        {
            "symbol": "GOOGL",
            "company_name": "Alphabet Inc.",
            "earnings_date": (datetime.utcnow() + timedelta(days=12)).strftime("%Y-%m-%d"),
            "fiscal_quarter": "Q1 2024",
            "eps_estimate": 1.45,
            "revenue_estimate": 87.3e9,
            "previous_eps": 1.33,
            "previous_revenue": 83.9e9,
            "market_cap": 1.8e12,
            "time": "After Market Close"
        },
        {
            "symbol": "AMZN",
            "company_name": "Amazon.com Inc.",
            "earnings_date": (datetime.utcnow() + timedelta(days=15)).strftime("%Y-%m-%d"),
            "fiscal_quarter": "Q1 2024",
            "eps_estimate": 0.95,
            "revenue_estimate": 143.5e9,
            "previous_eps": 0.85,
            "previous_revenue": 127.4e9,
            "market_cap": 1.9e12,
            "time": "After Market Close"
        },
        {
            "symbol": "NVDA",
            "company_name": "NVIDIA Corporation",
            "earnings_date": (datetime.utcnow() + timedelta(days=18)).strftime("%Y-%m-%d"),
            "fiscal_quarter": "Q1 FY2025",
            "eps_estimate": 5.25,
            "revenue_estimate": 32.5e9,
            "previous_eps": 3.85,
            "previous_revenue": 26.0e9,
            "market_cap": 2.8e12,
            "time": "After Market Close"
        },
    ]

    return earnings[:limit]


def get_economic_calendar(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 30
) -> List[Dict]:
    """Retrieve the economic calendar"""
    events = [
        {
            "id": 1,
            "event": "Non-Farm Payrolls",
            "country": "USA",
            "date": (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d"),
            "time": "08:30 EST",
            "forecast": "200K",
            "previous": "195K",
            "impact": "HIGH",
            "currency": "USD"
        },
        {
            "id": 2,
            "event": "Federal Funds Rate Decision",
            "country": "USA",
            "date": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "time": "18:00 EST",
            "forecast": "5.50%",
            "previous": "5.50%",
            "impact": "HIGH",
            "currency": "USD"
        },
        {
            "id": 3,
            "event": "Consumer Price Index (CPI)",
            "country": "USA",
            "date": (datetime.utcnow() + timedelta(days=4)).strftime("%Y-%m-%d"),
            "time": "08:30 EST",
            "forecast": "3.2%",
            "previous": "3.2%",
            "impact": "HIGH",
            "currency": "USD"
        },
        {
            "id": 4,
            "event": "European Central Bank (ECB) Decision",
            "country": "Eurozone",
            "date": (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "time": "13:45 EST",
            "forecast": "4.50%",
            "previous": "4.50%",
            "impact": "HIGH",
            "currency": "EUR"
        },
        {
            "id": 5,
            "event": "Bank of England Rate Decision",
            "country": "UK",
            "date": (datetime.utcnow() + timedelta(days=6)).strftime("%Y-%m-%d"),
            "time": "12:00 EST",
            "forecast": "5.50%",
            "previous": "5.50%",
            "impact": "HIGH",
            "currency": "GBP"
        },
        {
            "id": 6,
            "event": "Initial Jobless Claims",
            "country": "USA",
            "date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "time": "08:30 EST",
            "forecast": "210K",
            "previous": "205K",
            "impact": "MEDIUM",
            "currency": "USD"
        },
    ]

    return events[:limit]


def get_ipo_calendar(limit: int = 20) -> List[Dict]:
    """Retrieve the IPO calendar"""
    return [
        {
            "id": 1,
            "company": "TechStartup Inc.",
            "symbol": "TECH",
            "ipo_date": (datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "price_range": "$18-$22",
            "shares_offered": 25e6,
            "expected_revenue": 500e6,
            "industry": "Software",
            "lead_underwriter": "Goldman Sachs"
        },
        {
            "id": 2,
            "company": "GreenEnergy Solutions",
            "symbol": "GREEN",
            "ipo_date": (datetime.utcnow() + timedelta(days=20)).strftime("%Y-%m-%d"),
            "price_range": "$25-$30",
            "shares_offered": 15e6,
            "expected_revenue": 800e6,
            "industry": "Renewable Energy",
            "lead_underwriter": "Morgan Stanley"
        },
    ]


def get_company_announcements(symbol: str) -> List[Dict]:
    """Retrieve company announcements"""
    announcements = [
        {
            "id": 1,
            "symbol": symbol.upper(),
            "title": "Form 10-Q Filing",
            "date": (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "type": "QUARTERLY_REPORT",
            "url": "https://example.com/filings/10q"
        },
        {
            "id": 2,
            "symbol": symbol.upper(),
            "title": "Insider Trading",
            "date": (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "type": "INSIDER_TRANSACTION",
            "details": "CEO sold 100,000 shares"
        },
        {
            "id": 3,
            "symbol": symbol.upper(),
            "title": "Dividend Announcement",
            "date": (datetime.utcnow() - timedelta(days=10)).strftime("%Y-%m-%d"),
            "type": "DIVIDEND",
            "details": "$0.25 per share on 2024-06-15"
        },
        {
            "id": 4,
            "symbol": symbol.upper(),
            "title": "Stock Split Approval",
            "date": (datetime.utcnow() - timedelta(days=15)).strftime("%Y-%m-%d"),
            "type": "CORPORATE_ACTION",
            "details": "3-for-1 stock split effective 2024-07-01"
        },
    ]

    return announcements


def analyze_sentiment(text: str) -> Dict:
    """Analyze news sentiment"""
    # Simple sentiment analysis (in production, an NLP model would be used)
    positive_words = ["beat", "surge", "rally", "gain", "jump", "soar", "excellent", "strong"]
    negative_words = ["miss", "decline", "fall", "loss", "plunge", "weak", "poor", "warning"]

    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)

    if positive_count > negative_count:
        sentiment = "POSITIVE"
        score = min(1.0, positive_count / max(1, positive_count + negative_count))
    elif negative_count > positive_count:
        sentiment = "NEGATIVE"
        score = min(1.0, negative_count / max(1, positive_count + negative_count))
    else:
        sentiment = "NEUTRAL"
        score = 0.5

    return {
        "sentiment": sentiment,
        "score": round(score, 3),
        "positive_words": positive_count,
        "negative_words": negative_count
    }


def get_sector_news(sector: str, limit: int = 10) -> List[Dict]:
    """Retrieve news by sector"""
    sector_symbols = {
        "Technology": ["AAPL", "MSFT", "GOOGL", "NVIDIA", "META"],
        "Healthcare": ["JNJ", "PFE", "ABBV", "MRK", "LLY"],
        "Financials": ["JPM", "BAC", "WFC", "GS", "MS"],
        "Energy": ["XOM", "CVX", "COP", "SLB", "EOG"],
        "Consumer": ["WMT", "MCD", "KO", "PEP", "AZO"],
    }

    symbols = sector_symbols.get(sector, [])
    news = []

    for symbol in symbols:
        news.extend(get_latest_news(symbol, limit=2))

    return sorted(news, key=lambda x: x["published_at"], reverse=True)[:limit]


def track_earnings_surprises(limit: int = 20) -> List[Dict]:
    """Track earnings surprises"""
    surprises = [
        {
            "symbol": "AAPL",
            "eps_surprise_percent": 5.4,
            "revenue_surprise_percent": 3.2,
            "sentiment": "POSITIVE"
        },
        {
            "symbol": "MSFT",
            "eps_surprise_percent": -2.1,
            "revenue_surprise_percent": 1.8,
            "sentiment": "MIXED"
        },
        {
            "symbol": "NVDA",
            "eps_surprise_percent": 12.3,
            "revenue_surprise_percent": 8.9,
            "sentiment": "POSITIVE"
        },
        {
            "symbol": "META",
            "eps_surprise_percent": 6.7,
            "revenue_surprise_percent": 4.1,
            "sentiment": "POSITIVE"
        },
        {
            "symbol": "TSLA",
            "eps_surprise_percent": -8.2,
            "revenue_surprise_percent": -5.3,
            "sentiment": "NEGATIVE"
        },
    ]

    return surprises[:limit]
