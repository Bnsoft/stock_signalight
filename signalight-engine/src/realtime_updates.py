"""Real-time Updates Engine - Real-time Update System"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional
from . import store
import random


class RealtimeUpdateManager:
    """WebSocket real-time update manager"""

    def __init__(self):
        self.active_connections: Dict[str, Set] = {}  # symbol -> set of websocket connections
        self.subscriptions: Dict = {}  # connection_id -> list of subscribed symbols
        self.market_data_cache: Dict = {}  # symbol -> latest price data

    async def connect(self, websocket, symbol: str, connection_id: str):
        """Accept a WebSocket connection"""
        if symbol not in self.active_connections:
            self.active_connections[symbol] = set()

        self.active_connections[symbol].add((websocket, connection_id))

        if connection_id not in self.subscriptions:
            self.subscriptions[connection_id] = set()

        self.subscriptions[connection_id].add(symbol)

        # Send latest cached data
        if symbol in self.market_data_cache:
            await websocket.send_json({
                "type": "initial_data",
                "symbol": symbol,
                "data": self.market_data_cache[symbol]
            })

    async def disconnect(self, websocket, symbol: str, connection_id: str):
        """Disconnect a WebSocket connection"""
        if symbol in self.active_connections:
            self.active_connections[symbol].discard((websocket, connection_id))

            if not self.active_connections[symbol]:
                del self.active_connections[symbol]

        if connection_id in self.subscriptions:
            self.subscriptions[connection_id].discard(symbol)

    async def broadcast_price_update(self, symbol: str, price_data: Dict):
        """Broadcast a price update"""
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

        # Remove disconnected clients
        for websocket, connection_id in disconnected:
            await self.disconnect(websocket, symbol, connection_id)

    async def broadcast_chart_update(self, symbol: str, chart_data: Dict):
        """Broadcast chart data"""
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
        """Broadcast an indicator update"""
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
    """Generate a simulated price update"""
    # In production, this would be fetched from a real-time data source (e.g., WebSocket broker API)
    base_prices = {
        "SPY": 450,
        "QQQ": 380,
        "AAPL": 170,
        "MSFT": 420,
        "NVDA": 875,
    }

    base_price = base_prices.get(symbol, 100)

    # Simulate random price fluctuation
    change = random.uniform(-1, 1) * (base_price * 0.001)  # ±0.1% variation
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
    """Generate simulated chart data"""
    base_prices = {
        "SPY": 450,
        "QQQ": 380,
        "AAPL": 170,
        "MSFT": 420,
        "NVDA": 875,
    }

    base_price = base_prices.get(symbol, 100)

    # Generate OHLCV data
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
    """Generate a simulated technical indicator update"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "symbol": symbol,
        "rsi": round(random.uniform(30, 70), 2),
        "sma_20": round(random.uniform(90, 110), 2) * 4,  # approximate price range
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
    """Simulate a market data stream"""
    while True:
        try:
            # Price update
            price_data = get_mock_price_update(symbol)
            await realtime_manager.broadcast_price_update(symbol, price_data)

            # Chart data (every ~5 seconds)
            if random.random() < 0.2:
                chart_data = get_mock_chart_data(symbol, "1m")
                await realtime_manager.broadcast_chart_update(symbol, chart_data)

            # Indicator update (every ~2 seconds)
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
    """Manages streaming tasks"""
    tasks: Dict[str, asyncio.Task] = {}

    @classmethod
    async def start_stream(cls, symbol: str):
        """Start a stream for a given symbol"""
        if symbol not in cls.tasks:
            task = asyncio.create_task(simulate_market_data_stream(symbol))
            cls.tasks[symbol] = task

    @classmethod
    async def stop_stream(cls, symbol: str):
        """Stop the stream for a given symbol"""
        if symbol in cls.tasks:
            cls.tasks[symbol].cancel()
            try:
                await cls.tasks[symbol]
            except asyncio.CancelledError:
                pass
            del cls.tasks[symbol]

    @classmethod
    async def cleanup(cls):
        """Clean up all streams"""
        for task in list(cls.tasks.values()):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        cls.tasks.clear()


# Utility functions

def get_current_market_status() -> Dict:
    """Get the current market status"""
    current_hour = datetime.utcnow().hour

    # Based on US Eastern Time (EST)
    # Market hours: 09:30-16:00 EST (13:30-20:00 UTC)
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
    """Get a price update for a given symbol"""
    with store._connect() as conn:
        price_data = conn.execute(
            """SELECT symbol, current_price, change_percent, volume, bid, ask
               FROM positions
               WHERE symbol = ?""",
            (symbol.upper(),)
        ).fetchone()

    if not price_data:
        # Not found in DB — return simulated data
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
    """Send a portfolio update"""
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
    """Send a watchlist update"""
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
    """Send an alert trigger notification"""
    await websocket.send_json({
        "type": "alert_triggered",
        "alert_id": alert_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": alert_data
    })


async def send_news_update(websocket, symbol: str, news: Dict):
    """Send a news update"""
    await websocket.send_json({
        "type": "news_update",
        "symbol": symbol,
        "timestamp": datetime.utcnow().isoformat(),
        "data": news
    })
