"""Real-time Updates Engine — yfinance-based real market data"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Set, Optional

logger = logging.getLogger(__name__)

# Cache: symbol -> {price, change, prev_close, timestamp}
_price_cache: Dict[str, dict] = {}


def _fetch_real_price(symbol: str) -> Optional[dict]:
    """Fetch current price data via yfinance. Returns None on failure."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info

        price = info.last_price
        prev_close = info.previous_close or info.regular_market_previous_close

        if not price or price <= 0:
            # Fallback: last row of recent history
            df = ticker.history(period="2d", interval="1d")
            if df.empty:
                return None
            price = float(df["Close"].iloc[-1])
            prev_close = float(df["Close"].iloc[-2]) if len(df) > 1 else price

        price = round(float(price), 4)
        prev_close = round(float(prev_close), 4) if prev_close else price
        change = round(price - prev_close, 4)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0.0

        volume = None
        try:
            volume = int(info.three_month_average_volume or 0)
        except Exception:
            pass

        return {
            "price": price,
            "prev_close": prev_close,
            "change": change,
            "change_percent": change_pct,
            "volume": volume,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.debug(f"Price fetch failed for {symbol}: {e}")
        return None


def _fetch_real_indicators(symbol: str) -> Optional[dict]:
    """Calculate real technical indicators via yfinance + pulse module."""
    try:
        from .market import fetch_daily_data
        from .pulse import get_all_indicators
        df = fetch_daily_data(symbol, period="6mo")
        if df.empty:
            return None
        return get_all_indicators(df)
    except Exception as e:
        logger.debug(f"Indicator fetch failed for {symbol}: {e}")
        return None


def _fetch_latest_candle(symbol: str) -> Optional[dict]:
    """Fetch the most recent 1-day candle for a symbol."""
    try:
        import yfinance as yf
        df = yf.Ticker(symbol).history(period="1d", interval="1d")
        if df.empty:
            return None
        row = df.iloc[-1]
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "open": round(float(row["Open"]), 4),
            "high": round(float(row["High"]), 4),
            "low": round(float(row["Low"]), 4),
            "close": round(float(row["Close"]), 4),
            "volume": int(row["Volume"]),
        }
    except Exception as e:
        logger.debug(f"Candle fetch failed for {symbol}: {e}")
        return None


class RealtimeUpdateManager:
    """WebSocket real-time update manager"""

    def __init__(self):
        # symbol -> set of (websocket, connection_id) tuples
        self.active_connections: Dict[str, Set] = {}
        # connection_id -> set of subscribed symbols
        self.subscriptions: Dict[str, Set] = {}
        # symbol -> latest cached price data
        self.market_data_cache: Dict[str, dict] = {}
        # symbol -> running stream task
        self._stream_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket, symbol: str, connection_id: str):
        """Accept a WebSocket connection and start streaming if needed."""
        symbol = symbol.upper()
        if symbol not in self.active_connections:
            self.active_connections[symbol] = set()

        self.active_connections[symbol].add((websocket, connection_id))

        if connection_id not in self.subscriptions:
            self.subscriptions[connection_id] = set()
        self.subscriptions[connection_id].add(symbol)

        # Send cached data immediately so client isn't blank
        if symbol in self.market_data_cache:
            await websocket.send_json({
                "type": "initial_data",
                "symbol": symbol,
                "data": self.market_data_cache[symbol],
            })

        # Start background stream if not already running
        if symbol not in self._stream_tasks or self._stream_tasks[symbol].done():
            self._stream_tasks[symbol] = asyncio.create_task(
                self._stream_symbol(symbol)
            )

    async def disconnect(self, websocket, symbol: str, connection_id: str):
        """Disconnect and clean up."""
        symbol = symbol.upper()
        if symbol in self.active_connections:
            self.active_connections[symbol].discard((websocket, connection_id))
            if not self.active_connections[symbol]:
                del self.active_connections[symbol]
                # Stop stream task when no subscribers remain
                task = self._stream_tasks.pop(symbol, None)
                if task and not task.done():
                    task.cancel()

        if connection_id in self.subscriptions:
            self.subscriptions[connection_id].discard(symbol)

    async def broadcast_price_update(self, symbol: str, data: dict):
        """Broadcast price update to all symbol subscribers."""
        self.market_data_cache[symbol] = data
        await self._broadcast(symbol, {"type": "price_update", "symbol": symbol, "data": data})

    async def broadcast_chart_update(self, symbol: str, data: dict):
        await self._broadcast(symbol, {"type": "chart_update", "symbol": symbol, "data": data})

    async def broadcast_indicator_update(self, symbol: str, data: dict):
        await self._broadcast(symbol, {"type": "indicator_update", "symbol": symbol, "data": data})

    async def _broadcast(self, symbol: str, message: dict):
        if symbol not in self.active_connections:
            return
        disconnected = []
        for websocket, connection_id in list(self.active_connections[symbol]):
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append((websocket, connection_id))
        for ws, cid in disconnected:
            await self.disconnect(ws, symbol, cid)

    async def _stream_symbol(self, symbol: str):
        """Background task: fetch real yfinance data and broadcast every 15s.

        yfinance data is ~15-min delayed during market hours.
        After market close the price is the official closing price.
        Interval is 15s to avoid hammering Yahoo Finance.
        """
        tick = 0
        while symbol in self.active_connections:
            try:
                # Price update every cycle (15s)
                price_data = await asyncio.get_event_loop().run_in_executor(
                    None, _fetch_real_price, symbol
                )
                if price_data:
                    await self.broadcast_price_update(symbol, price_data)

                # Latest candle every 4th cycle (~60s)
                if tick % 4 == 0:
                    candle = await asyncio.get_event_loop().run_in_executor(
                        None, _fetch_latest_candle, symbol
                    )
                    if candle:
                        await self.broadcast_chart_update(symbol, candle)

                # Indicators every 8th cycle (~120s) — heavier calculation
                if tick % 8 == 0:
                    indicators = await asyncio.get_event_loop().run_in_executor(
                        None, _fetch_real_indicators, symbol
                    )
                    if indicators:
                        await self.broadcast_indicator_update(symbol, indicators)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Stream error for {symbol}: {e}")

            tick += 1
            await asyncio.sleep(15)


    async def shutdown(self):
        """Cancel all running stream tasks on app shutdown."""
        for task in list(self._stream_tasks.values()):
            if not task.done():
                task.cancel()
        self._stream_tasks.clear()
        self.active_connections.clear()


# Global singleton
realtime_manager = RealtimeUpdateManager()


def get_current_market_status() -> dict:
    """Return current market open/closed status (NYSE hours)."""
    import zoneinfo
    now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
    is_weekday = now.weekday() < 5
    market_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
    is_open = is_weekday and market_open <= now <= market_close
    return {
        "is_open": is_open,
        "current_time_et": now.strftime("%Y-%m-%d %H:%M:%S ET"),
        "session": "regular" if is_open else ("pre" if now < market_open and is_weekday else "after"),
    }


def get_price_update_for_symbol(symbol: str) -> Optional[dict]:
    """Single price snapshot (no WebSocket). Used by REST fallback endpoint."""
    return _fetch_real_price(symbol.upper())
