"""Real-time Updates Engine - 실시간 업데이트 시스템"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional
from . import store
import random


class RealtimeUpdateManager:
    """WebSocket 실시간 업데이트 관리자"""

    def __init__(self):
        self.active_connections: Dict[str, Set] = {}  # symbol -> set of websocket connections
        self.subscriptions: Dict = {}  # connection_id -> list of subscribed symbols
        self.market_data_cache: Dict = {}  # symbol -> latest price data

    async def connect(self, websocket, symbol: str, connection_id: str):
        """웹소켓 연결 수락"""
        if symbol not in self.active_connections:
            self.active_connections[symbol] = set()

        self.active_connections[symbol].add((websocket, connection_id))

        if connection_id not in self.subscriptions:
            self.subscriptions[connection_id] = set()

        self.subscriptions[connection_id].add(symbol)

        # 최신 캐시 데이터 전송
        if symbol in self.market_data_cache:
            await websocket.send_json({
                "type": "initial_data",
                "symbol": symbol,
                "data": self.market_data_cache[symbol]
            })

    async def disconnect(self, websocket, symbol: str, connection_id: str):
        """웹소켓 연결 해제"""
        if symbol in self.active_connections:
            self.active_connections[symbol].discard((websocket, connection_id))

            if not self.active_connections[symbol]:
                del self.active_connections[symbol]

        if connection_id in self.subscriptions:
            self.subscriptions[connection_id].discard(symbol)

    async def broadcast_price_update(self, symbol: str, price_data: Dict):
        """가격 업데이트 브로드캐스트"""
        self.market_data_cache[symbol] = price_data

        if symbol not in self.active_connections:
            return

        disconnected = []
        for websocket, connection_id in list(self.active_connections[symbol]):
            try:
                await websocket.send_json({
                    "type": "price_update",
                    "symbol": symbol,
                    "data": price_data
                })
            except Exception:
                disconnected.append((websocket, connection_id))

        # 연결이 끊긴 클라이언트 제거
        for websocket, connection_id in disconnected:
            await self.disconnect(websocket, symbol, connection_id)

    async def broadcast_chart_update(self, symbol: str, chart_data: Dict):
        """차트 데이터 브로드캐스트"""
        if symbol not in self.active_connections:
            return

        disconnected = []
        for websocket, connection_id in list(self.active_connections[symbol]):
            try:
                await websocket.send_json({
                    "type": "chart_update",
                    "symbol": symbol,
                    "data": chart_data
                })
            except Exception:
                disconnected.append((websocket, connection_id))

        for websocket, connection_id in disconnected:
            await self.disconnect(websocket, symbol, connection_id)

    async def broadcast_indicator_update(self, symbol: str, indicator_data: Dict):
        """지표 업데이트 브로드캐스트"""
        if symbol not in self.active_connections:
            return

        disconnected = []
        for websocket, connection_id in list(self.active_connections[symbol]):
            try:
                await websocket.send_json({
                    "type": "indicator_update",
                    "symbol": symbol,
                    "data": indicator_data
                })
            except Exception:
                disconnected.append((websocket, connection_id))

        for websocket, connection_id in disconnected:
            await self.disconnect(websocket, symbol, connection_id)


# Global manager instance
realtime_manager = RealtimeUpdateManager()


def get_mock_price_update(symbol: str) -> Dict:
    """시뮬레이션 가격 업데이트 생성"""
    # 실제로는 실시간 데이터 소스(예: WebSocket broker API)에서 가져옴
    base_prices = {
        "SPY": 450,
        "QQQ": 380,
        "AAPL": 170,
        "MSFT": 420,
        "NVDA": 875,
    }

    base_price = base_prices.get(symbol, 100)

    # 랜덤 변동 시뮬레이션
    change = random.uniform(-1, 1) * (base_price * 0.001)  # ±0.1% 변동
    current_price = base_price + change
    volume = random.randint(1000000, 50000000)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "symbol": symbol,
        "price": round(current_price, 2),
        "bid": round(current_price - 0.01, 2),
        "ask": round(current_price + 0.01, 2),
        "volume": volume,
        "change_percent": round((change / base_price) * 100, 2),
        "market_cap": None,
    }


def get_mock_chart_data(symbol: str, timeframe: str = "1m") -> Dict:
    """시뮬레이션 차트 데이터 생성"""
    base_prices = {
        "SPY": 450,
        "QQQ": 380,
        "AAPL": 170,
        "MSFT": 420,
        "NVDA": 875,
    }

    base_price = base_prices.get(symbol, 100)

    # OHLCV 데이터 생성
    open_price = base_price + random.uniform(-2, 2)
    close_price = base_price + random.uniform(-2, 2)
    high_price = max(open_price, close_price) + random.uniform(0, 2)
    low_price = min(open_price, close_price) - random.uniform(0, 2)
    volume = random.randint(1000000, 50000000)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "symbol": symbol,
        "timeframe": timeframe,
        "open": round(open_price, 2),
        "high": round(high_price, 2),
        "low": round(low_price, 2),
        "close": round(close_price, 2),
        "volume": volume,
    }


def get_mock_indicator_update(symbol: str) -> Dict:
    """시뮬레이션 기술적 지표 업데이트"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "symbol": symbol,
        "rsi": round(random.uniform(30, 70), 2),
        "sma_20": round(random.uniform(90, 110), 2) * 4,  # 대략적인 가격 범위
        "sma_50": round(random.uniform(85, 115), 2) * 4,
        "sma_200": round(random.uniform(80, 120), 2) * 4,
        "macd": round(random.uniform(-5, 5), 2),
        "macd_signal": round(random.uniform(-5, 5), 2),
        "bollinger_upper": round(random.uniform(100, 120), 2) * 4,
        "bollinger_middle": round(random.uniform(90, 110), 2) * 4,
        "bollinger_lower": round(random.uniform(80, 100), 2) * 4,
        "atr": round(random.uniform(1, 5), 2),
        "stoch_k": round(random.uniform(0, 100), 2),
        "stoch_d": round(random.uniform(0, 100), 2),
    }


async def simulate_market_data_stream(symbol: str, update_interval: int = 1):
    """시장 데이터 스트림 시뮬레이션"""
    while True:
        try:
            # 가격 업데이트
            price_data = get_mock_price_update(symbol)
            await realtime_manager.broadcast_price_update(symbol, price_data)

            # 차트 데이터 (5초마다)
            if random.random() < 0.2:
                chart_data = get_mock_chart_data(symbol, "1m")
                await realtime_manager.broadcast_chart_update(symbol, chart_data)

            # 지표 업데이트 (2초마다)
            if random.random() < 0.5:
                indicator_data = get_mock_indicator_update(symbol)
                await realtime_manager.broadcast_indicator_update(symbol, indicator_data)

            await asyncio.sleep(update_interval)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in market data stream for {symbol}: {e}")
            await asyncio.sleep(update_interval)


class StreamTask:
    """스트리밍 작업 관리"""
    tasks: Dict[str, asyncio.Task] = {}

    @classmethod
    async def start_stream(cls, symbol: str):
        """특정 심볼의 스트림 시작"""
        if symbol not in cls.tasks:
            task = asyncio.create_task(simulate_market_data_stream(symbol))
            cls.tasks[symbol] = task

    @classmethod
    async def stop_stream(cls, symbol: str):
        """특정 심볼의 스트림 중지"""
        if symbol in cls.tasks:
            cls.tasks[symbol].cancel()
            try:
                await cls.tasks[symbol]
            except asyncio.CancelledError:
                pass
            del cls.tasks[symbol]

    @classmethod
    async def cleanup(cls):
        """모든 스트림 정리"""
        for task in list(cls.tasks.values()):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        cls.tasks.clear()


# 유틸리티 함수들

def get_current_market_status() -> Dict:
    """현재 시장 상태 조회"""
    current_hour = datetime.utcnow().hour

    # 미국 시간 기준 (EST)
    # 시장 개장: 09:30-16:00 EST (13:30-20:00 UTC)
    is_market_open = 13 <= current_hour < 21

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "is_market_open": is_market_open,
        "market_status": "OPEN" if is_market_open else "CLOSED",
        "market_hours": "09:30-16:00 EST",
        "premarket_hours": "04:00-09:30 EST",
        "afterhours_hours": "16:00-20:00 EST",
    }


def get_price_update_for_symbol(symbol: str) -> Dict:
    """심볼에 대한 가격 업데이트 조회"""
    with store._connect() as conn:
        price_data = conn.execute(
            """SELECT symbol, current_price, change_percent, volume, bid, ask
               FROM positions
               WHERE symbol = ?""",
            (symbol.upper(),)
        ).fetchone()

    if not price_data:
        # DB에 없으면 시뮬레이션 데이터 반환
        return get_mock_price_update(symbol)

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "symbol": price_data[0],
        "price": price_data[1],
        "change_percent": price_data[2],
        "volume": price_data[3],
        "bid": price_data[4] or price_data[1] - 0.01,
        "ask": price_data[5] or price_data[1] + 0.01,
    }


async def send_portfolio_update(websocket, user_id: str):
    """포트폴리오 업데이트 전송"""
    with store._connect() as conn:
        positions = conn.execute(
            """SELECT symbol, quantity, entry_price, current_price
               FROM positions
               WHERE user_id = ?""",
            (user_id,)
        ).fetchall()

    portfolio_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "positions": [
            {
                "symbol": p[0],
                "quantity": p[1],
                "entry_price": p[2],
                "current_price": p[3],
                "pnl": (p[3] - p[2]) * p[1],
                "pnl_percent": ((p[3] - p[2]) / p[2] * 100) if p[2] else 0,
            }
            for p in positions
        ]
    }

    await websocket.send_json({
        "type": "portfolio_update",
        "data": portfolio_data
    })


async def send_watchlist_update(websocket, user_id: str):
    """워치리스트 업데이트 전송"""
    with store._connect() as conn:
        watchlist = conn.execute(
            """SELECT symbol, added_at FROM watchlist WHERE user_id = ?""",
            (user_id,)
        ).fetchall()

    watchlist_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "symbols": [{"symbol": w[0], "added_at": w[1]} for w in watchlist]
    }

    await websocket.send_json({
        "type": "watchlist_update",
        "data": watchlist_data
    })


async def send_alert_trigger_notification(websocket, alert_id: int, alert_data: Dict):
    """알람 발생 알림 전송"""
    await websocket.send_json({
        "type": "alert_triggered",
        "alert_id": alert_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": alert_data
    })


async def send_news_update(websocket, symbol: str, news: Dict):
    """뉴스 업데이트 전송"""
    await websocket.send_json({
        "type": "news_update",
        "symbol": symbol,
        "timestamp": datetime.utcnow().isoformat(),
        "data": news
    })
