# Real-time Streaming

Module: `realtime_updates.py` · Hook: `src/hooks/useRealtimeData.ts`

## WebSocket Architecture

```
Client → WS /ws/realtime/{symbol}
              ↓
    RealtimeUpdateManager (connection registry)
              ↓
    StreamTask (per-symbol background task)
              ↓
    Broadcasts: price_update | chart_update | indicator_update | portfolio_update | alert_trigger
```

## Connection Lifecycle

1. Client connects to `ws://localhost:8000/ws/realtime/{symbol}`
2. Server calls `StreamTask.start_stream(symbol)` — begins sending mock data every ~1s
3. `RealtimeUpdateManager.connect(websocket, symbol, connection_id)` registers connection
4. Client can send subscribe/unsubscribe/ping messages
5. On disconnect, cleanup removes connection; if no subscribers remain, stream stops

## Client → Server Messages
```json
{ "type": "subscribe", "symbol": "AAPL" }
{ "type": "unsubscribe", "symbol": "AAPL" }
{ "type": "ping" }
```

## Server → Client Message Types

### `price_update`
```json
{ "type": "price_update", "symbol": "SPY",
  "data": { "price": 452.34, "change": 1.23, "change_percent": 0.27,
            "volume": 1234567, "timestamp": "2026-04-08T10:30:00" } }
```

### `chart_update`
```json
{ "type": "chart_update", "symbol": "SPY",
  "data": { "timestamp": "...", "open": 451.0, "high": 453.0, "low": 450.5, "close": 452.34, "volume": 50000 } }
```

### `indicator_update`
```json
{ "type": "indicator_update", "symbol": "SPY",
  "data": { "rsi": 54.2, "macd": 1.23, "macd_signal": 0.89,
            "bb_upper": 460.0, "bb_lower": 440.0, "volume_ratio": 1.3 } }
```

### `pong`
```json
{ "type": "pong", "timestamp": "..." }
```

## REST Fallbacks (no WebSocket needed)
| API | Description |
|-----|-------------|
| GET `/api/realtime/price/{symbol}` | Latest price snapshot |
| GET `/api/realtime/market-status` | Market open/closed + session info |

## Frontend Hook (`useRealtimeData.ts`)

```tsx
import { usePriceUpdate, useChartData, useIndicators } from "@/hooks/useRealtimeData"

const price = usePriceUpdate("SPY")      // { price, change, change_percent, volume }
const candles = useChartData("SPY")      // OptionChain[] — last N candles
const indicators = useIndicators("SPY")  // { rsi, macd, bb_upper, bb_lower }
```

Features: auto-reconnects on disconnect, type-safe, shared connection per symbol.

## Key Classes/Functions

| Name | Description |
|------|-------------|
| `RealtimeUpdateManager` | Manages connections dict, broadcast methods |
| `RealtimeUpdateManager.connect(ws, symbol, id)` | Register connection |
| `RealtimeUpdateManager.disconnect(ws, symbol, id)` | Remove connection |
| `RealtimeUpdateManager.broadcast_price_update(symbol, data)` | Push to all subscribers |
| `StreamTask.start_stream(symbol)` | Start background streaming task |
| `StreamTask.stop_stream(symbol)` | Stop streaming task |
| `get_current_market_status()` | Returns market hours info |
| `get_price_update_for_symbol(symbol)` | Single price fetch (no WS) |

## Global Instance
`realtime_manager = RealtimeUpdateManager()` — singleton used across all WebSocket connections.
