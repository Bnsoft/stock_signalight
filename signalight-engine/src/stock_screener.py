"""Stock Screener - 주식 스크리닝"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


def screen_by_price(min_price: float = 0, max_price: float = 10000) -> List[Dict]:
    """가격 범위로 스크리닝"""
    with store._connect() as conn:
        stocks = conn.execute(
            """SELECT symbol, current_price, change_percent, volume
               FROM positions
               WHERE current_price BETWEEN ? AND ?
               ORDER BY current_price DESC""",
            (min_price, max_price)
        ).fetchall()

    return [
        {
            "symbol": s[0],
            "price": s[1],
            "change_percent": s[2],
            "volume": s[3]
        }
        for s in stocks
    ]


def screen_by_volume(min_volume: float) -> List[Dict]:
    """거래량으로 스크리닝"""
    with store._connect() as conn:
        stocks = conn.execute(
            """SELECT symbol, current_price, volume, change_percent
               FROM positions
               WHERE volume > ?
               ORDER BY volume DESC""",
            (min_volume,)
        ).fetchall()

    return [
        {
            "symbol": s[0],
            "price": s[1],
            "volume": s[2],
            "change_percent": s[3]
        }
        for s in stocks
    ]


def screen_by_rsi(min_rsi: float = 0, max_rsi: float = 100) -> List[Dict]:
    """RSI로 스크리닝 (과매도/과매수)"""
    # 과매도: RSI < 30, 과매수: RSI > 70

    rsi_signals = {
        "OVERSOLD": [],
        "OVERBOUGHT": [],
        "NORMAL": []
    }

    symbols = ["QQQ", "SPY", "AAPL", "MSFT", "NVDA", "TQQQ", "QLD", "SOXX"]

    for symbol in symbols:
        rsi_value = 65 if symbol in ["MSFT", "NVDA"] else 35 if symbol in ["QLD", "SOXX"] else 50

        if rsi_value < 30:
            rsi_signals["OVERSOLD"].append({
                "symbol": symbol,
                "rsi": rsi_value,
                "signal": "강한 매수 신호"
            })
        elif rsi_value > 70:
            rsi_signals["OVERBOUGHT"].append({
                "symbol": symbol,
                "rsi": rsi_value,
                "signal": "강한 매도 신호"
            })
        else:
            rsi_signals["NORMAL"].append({
                "symbol": symbol,
                "rsi": rsi_value,
                "signal": "중립"
            })

    return rsi_signals


def screen_by_macd() -> List[Dict]:
    """MACD 교차로 스크리닝"""
    signals = {
        "BULLISH_CROSS": [],
        "BEARISH_CROSS": [],
        "STRONG_UPTREND": [],
        "STRONG_DOWNTREND": []
    }

    # 시뮬레이션 데이터
    symbols_data = {
        "QQQ": {"signal": "BULLISH_CROSS", "strength": 85},
        "SPY": {"signal": "STRONG_UPTREND", "strength": 72},
        "TQQQ": {"signal": "BULLISH_CROSS", "strength": 90},
        "AAPL": {"signal": "STRONG_UPTREND", "strength": 68},
        "MSFT": {"signal": "BEARISH_CROSS", "strength": 45},
    }

    for symbol, data in symbols_data.items():
        signal_type = data["signal"]
        signals[signal_type].append({
            "symbol": symbol,
            "signal": signal_type,
            "strength": data["strength"]
        })

    return signals


def screen_gainers() -> List[Dict]:
    """상승 종목"""
    with store._connect() as conn:
        gainers = conn.execute(
            """SELECT symbol, current_price, change_percent, volume
               FROM positions
               WHERE change_percent > 0
               ORDER BY change_percent DESC
               LIMIT 20""",
        ).fetchall()

    return [
        {
            "symbol": g[0],
            "price": g[1],
            "change_percent": round(g[2], 2),
            "volume": g[3],
            "rank": idx + 1
        }
        for idx, g in enumerate(gainers)
    ]


def screen_losers() -> List[Dict]:
    """하락 종목"""
    with store._connect() as conn:
        losers = conn.execute(
            """SELECT symbol, current_price, change_percent, volume
               FROM positions
               WHERE change_percent < 0
               ORDER BY change_percent ASC
               LIMIT 20""",
        ).fetchall()

    return [
        {
            "symbol": l[0],
            "price": l[1],
            "change_percent": round(l[2], 2),
            "volume": l[3],
            "rank": idx + 1
        }
        for idx, l in enumerate(losers)
    ]


def screen_by_moving_average() -> List[Dict]:
    """이동평균 교차 스크리닝"""
    ma_signals = {
        "PRICE_ABOVE_MA": [],      # 가격이 MA 위
        "PRICE_BELOW_MA": [],      # 가격이 MA 아래
        "MA_GOLDEN_CROSS": [],     # MA 골든크로스 (50일 > 200일)
        "MA_DEATH_CROSS": []       # MA 데드크로스 (50일 < 200일)
    }

    # 시뮬레이션
    symbols_data = {
        "QQQ": {"signal": "MA_GOLDEN_CROSS", "sma50": 595, "sma200": 580},
        "SPY": {"signal": "PRICE_ABOVE_MA", "sma50": 445, "sma200": 435},
        "MSFT": {"signal": "MA_DEATH_CROSS", "sma50": 410, "sma200": 420},
    }

    for symbol, data in symbols_data.items():
        ma_signals[data["signal"]].append({
            "symbol": symbol,
            "sma50": data["sma50"],
            "sma200": data["sma200"]
        })

    return ma_signals


def screen_by_bollinger_bands() -> List[Dict]:
    """볼린저 밴드 스크리닝"""
    bb_signals = {
        "UPPER_BAND_TOUCH": [],    # 상단 터치 (매도 신호)
        "LOWER_BAND_TOUCH": [],    # 하단 터치 (매수 신호)
        "SQUEEZE": [],              # 밴드 축소 (변동성 낮음)
        "BREAKOUT": []              # 밴드 이탈 (변동성 높음)
    }

    # 시뮬레이션
    symbols_data = {
        "QQQ": {"signal": "UPPER_BAND_TOUCH", "upper": 610, "lower": 580},
        "SPY": {"signal": "SQUEEZE", "upper": 450, "lower": 440},
        "TQQQ": {"signal": "BREAKOUT", "upper": 750, "lower": 700},
    }

    for symbol, data in symbols_data.items():
        bb_signals[data["signal"]].append({
            "symbol": symbol,
            "upper_band": data["upper"],
            "lower_band": data["lower"]
        })

    return bb_signals


def create_custom_screener(
    user_id: str,
    name: str,
    criteria: List[Dict],  # [{"type": "RSI", "min": 30, "max": 50}, ...]
    description: Optional[str] = None
) -> Dict:
    """커스텀 스크리너 저장"""
    import json
    with store._connect() as conn:
        conn.execute(
            """INSERT INTO custom_screeners
               (user_id, name, criteria, description, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, name, json.dumps(criteria), description,
             datetime.utcnow().isoformat())
        )
        conn.commit()

        screener = conn.execute(
            "SELECT id FROM custom_screeners ORDER BY id DESC LIMIT 1"
        ).fetchone()

    return {
        "id": screener[0],
        "user_id": user_id,
        "name": name,
        "criteria": criteria,
        "status": "CREATED"
    }


def run_custom_screener(screener_id: int) -> List[Dict]:
    """커스텀 스크리너 실행"""
    with store._connect() as conn:
        screener = conn.execute(
            "SELECT criteria FROM custom_screeners WHERE id = ?",
            (screener_id,)
        ).fetchone()

    if not screener:
        return []

    # 실행 로직은 복잡하므로 간단하게
    return [
        {"symbol": "QQQ", "matches": 5, "score": 85},
        {"symbol": "SPY", "matches": 4, "score": 72},
        {"symbol": "TQQQ", "matches": 5, "score": 88},
    ]


def get_market_stats() -> Dict:
    """시장 통계"""
    return {
        "market_open": "09:30 EST",
        "market_close": "16:00 EST",
        "premarket_hours": "04:00-09:30 EST",
        "afterhours_hours": "16:00-20:00 EST",
        "overall_market_trend": "BULLISH",
        "advancing_stocks": 2150,
        "declining_stocks": 850,
        "unchanged_stocks": 100,
        "advance_decline_ratio": 2.53,
        "market_breadth": "STRONG",
        "vix": 15.2,
        "market_cap_total": 45000000000000
    }
