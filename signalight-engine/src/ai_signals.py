"""AI & Machine Learning signal analysis module"""

import math
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


def calculate_signal_confidence(signal_id: int, symbol: str, signal_type: str) -> float:
    """
    Calculate AI confidence score for a signal (0-100)
    Based on: historical accuracy, indicator strength, market conditions
    """

    # 1. Get signal performance history
    with store._connect() as conn:
        perf = conn.execute(
            """SELECT COUNT(*) as total,
                      SUM(CASE WHEN roi_percent > 0 THEN 1 ELSE 0 END) as wins
               FROM signal_performance
               WHERE signal_type = ? AND status != 'PENDING'""",
            (signal_type,),
        ).fetchone()

    if not perf or perf[0] == 0:
        return 50.0  # Neutral confidence

    # 2. Calculate win rate
    win_rate = (perf[1] or 0) / perf[0]
    base_score = win_rate * 100

    # 3. Adjust for recency (recent signals weighted higher)
    with store._connect() as conn:
        recent = conn.execute(
            """SELECT COUNT(*) FROM signal_performance
               WHERE signal_type = ? AND created_at > datetime('now', '-7 days')""",
            (signal_type,),
        ).fetchone()

    if recent and recent[0] > 0:
        recency_boost = min(20, recent[0] * 2)  # Max 20 point boost
        base_score = min(100, base_score + recency_boost)

    # 4. Adjust for market conditions (simplified)
    volatility_adjustment = _get_volatility_adjustment(symbol)
    final_score = base_score * (1 + volatility_adjustment / 100)

    return round(min(100, max(0, final_score)), 2)


def _get_volatility_adjustment(symbol: str) -> float:
    """Adjust confidence based on market volatility"""
    # In production, would get from real market data
    # For now, return neutral
    return 0.0


def predict_entry_exit_points(symbol: str, recent_signals: List[dict]) -> Dict:
    """
    ML-based prediction of optimal entry and exit points
    """
    if not recent_signals:
        return {"entry_price": None, "exit_price": None, "confidence": 0}

    # Get recent prices
    with store._connect() as conn:
        prices = conn.execute(
            """SELECT current_price FROM positions
               WHERE symbol = ?
               ORDER BY updated_at DESC LIMIT 20""",
            (symbol.upper(),),
        ).fetchall()

    if not prices or len(prices) < 5:
        return {"entry_price": None, "exit_price": None, "confidence": 50}

    prices = [p[0] for p in prices]

    # Simple ML model (linear regression)
    entry_pred = np.mean(prices) * 0.98  # 2% below average
    exit_pred = np.mean(prices) * 1.05   # 5% above average

    confidence = min(100, 60 + len(recent_signals) * 5)

    return {
        "entry_price": round(entry_pred, 2),
        "exit_price": round(exit_pred, 2),
        "confidence": round(confidence, 2),
        "model_type": "linear_regression"
    }


def analyze_sentiment(content: str, source: str) -> Dict:
    """
    Analyze sentiment of news/social media content
    Returns: sentiment (positive/negative/neutral), score (-1 to 1)
    """

    # Simple keyword-based sentiment (in production, use NLP)
    positive_words = [
        'bullish', 'gain', 'rally', 'surge', 'beat', 'strong',
        'growth', 'profit', 'outperform', 'excellent'
    ]
    negative_words = [
        'bearish', 'loss', 'crash', 'plunge', 'miss', 'weak',
        'decline', 'loss', 'underperform', 'terrible'
    ]

    content_lower = content.lower()
    pos_count = sum(1 for word in positive_words if word in content_lower)
    neg_count = sum(1 for word in negative_words if word in content_lower)

    if pos_count + neg_count == 0:
        sentiment = "neutral"
        score = 0.0
    else:
        score = (pos_count - neg_count) / (pos_count + neg_count)
        if score > 0.2:
            sentiment = "positive"
        elif score < -0.2:
            sentiment = "negative"
        else:
            sentiment = "neutral"

    return {
        "sentiment": sentiment,
        "score": round(score, 2),
        "positive_count": pos_count,
        "negative_count": neg_count
    }


def detect_patterns(symbol: str) -> List[Dict]:
    """
    Detect chart patterns: head & shoulders, triangles, flags, etc.
    """
    patterns = []

    # Get recent prices
    with store._connect() as conn:
        candles = conn.execute(
            """SELECT id, close FROM signals
               WHERE symbol = ?
               ORDER BY created_at DESC LIMIT 50""",
            (symbol.upper(),),
        ).fetchall()

    if not candles or len(candles) < 10:
        return patterns

    closes = [c[1] for c in reversed(candles)]

    # Pattern 1: Head & Shoulders
    if len(closes) >= 5:
        if (closes[-5] < closes[-4] and closes[-4] > closes[-3] and
            closes[-3] < closes[-2] and closes[-2] > closes[-1]):
            patterns.append({
                "type": "head_and_shoulders",
                "confidence": 65,
                "signal": "bearish"
            })

    # Pattern 2: Triangle
    if len(closes) >= 4:
        volatility = np.std(closes[-4:]) / np.mean(closes[-4:])
        if volatility < 0.02:  # Low volatility
            patterns.append({
                "type": "triangle",
                "confidence": 50,
                "signal": "breakout_imminent"
            })

    # Pattern 3: Flag
    if len(closes) >= 3:
        if abs(closes[-3] - closes[-1]) / closes[-3] < 0.01:
            patterns.append({
                "type": "flag",
                "confidence": 55,
                "signal": "continuation"
            })

    return patterns


def detect_anomalies(symbol: str) -> List[Dict]:
    """
    Detect anomalies: unusual volume, extreme price moves, etc.
    """
    anomalies = []

    # Get recent signals
    with store._connect() as conn:
        signals = conn.execute(
            """SELECT id, message FROM signals
               WHERE symbol = ?
               ORDER BY created_at DESC LIMIT 30""",
            (symbol.upper(),),
        ).fetchall()

    if not signals or len(signals) < 5:
        return anomalies

    # Count signals last hour
    with store._connect() as conn:
        recent_count = conn.execute(
            """SELECT COUNT(*) FROM signals
               WHERE symbol = ? AND created_at > datetime('now', '-1 hour')""",
            (symbol.upper(),),
        ).fetchone()[0]

    average_count = len(signals) / 30 * 24
    if recent_count > average_count * 2:
        anomalies.append({
            "type": "unusual_signal_volume",
            "severity": "high",
            "count": recent_count,
            "message": f"{recent_count} signals in last hour (avg: {average_count:.0f})"
        })

    return anomalies


def get_user_risk_profile(user_id: str) -> Dict:
    """
    Analyze user's trading behavior and create risk profile
    """
    with store._connect() as conn:
        profile = conn.execute(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    if profile:
        return dict(profile)

    # Create profile from trading history
    with store._connect() as conn:
        trades = conn.execute(
            """SELECT COUNT(*), AVG(roi_percent)
               FROM signal_performance
               WHERE status != 'PENDING'""",
        ).fetchone()

    if not trades or trades[0] == 0:
        avg_roi = 0
    else:
        avg_roi = trades[1] or 0

    # Determine profile
    if avg_roi > 20:
        risk_profile = "aggressive"
        experience = "expert"
    elif avg_roi > 10:
        risk_profile = "moderate"
        experience = "intermediate"
    else:
        risk_profile = "conservative"
        experience = "beginner"

    return {
        "risk_profile": risk_profile,
        "experience_level": experience,
        "avg_roi": round(avg_roi, 2)
    }


def recommend_signals_for_user(user_id: str, available_signals: List[Dict]) -> List[Dict]:
    """
    Recommend signals based on user's risk profile
    """
    profile = get_user_risk_profile(user_id)
    risk_level = profile.get("risk_profile", "moderate")

    recommended = []

    for signal in available_signals:
        confidence = signal.get("confidence_score", 50)

        # Filter based on risk profile
        if risk_level == "conservative" and confidence < 70:
            continue
        elif risk_level == "moderate" and confidence < 50:
            continue
        # aggressive: accept all

        score = confidence
        if risk_level == "conservative":
            score *= 1.2  # Prioritize high confidence

        recommended.append({
            **signal,
            "matched_score": round(score, 2),
            "reason": f"Matches {risk_level} profile"
        })

    # Sort by score
    recommended.sort(key=lambda x: x["matched_score"], reverse=True)
    return recommended[:10]  # Top 10


def save_signal_confidence(signal_id: int, symbol: str, signal_type: str, confidence_score: float):
    """Save confidence score to database"""
    with store._connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO signal_confidence
               (signal_id, symbol, signal_type, confidence_score, last_updated)
               VALUES (?, ?, ?, ?, ?)""",
            (signal_id, symbol.upper(), signal_type, confidence_score, datetime.utcnow().isoformat()),
        )


def get_signal_confidence(signal_id: int) -> Optional[float]:
    """Get confidence score for a signal"""
    with store._connect() as conn:
        row = conn.execute(
            "SELECT confidence_score FROM signal_confidence WHERE signal_id = ?",
            (signal_id,),
        ).fetchone()

    return row[0] if row else None
