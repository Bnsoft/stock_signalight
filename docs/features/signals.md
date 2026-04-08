# Signal Detection

## Architecture
```
pulse.py (indicators) → trigger.py (rules) → signals table → api.py /api/signals
```

## Signal Types
| Type | Description | Severity |
|------|-------------|----------|
| `RSI_OVERSOLD` | RSI < 30 | HIGH |
| `RSI_OVERBOUGHT` | RSI > 70 | HIGH |
| `MACD_BULLISH` | MACD crosses above signal line | MEDIUM |
| `MACD_BEARISH` | MACD crosses below signal line | MEDIUM |
| `BOLLINGER_LOWER` | Price touches lower band | MEDIUM |
| `BOLLINGER_UPPER` | Price touches upper band | MEDIUM |
| `VOLUME_SPIKE` | Volume > 2x average | LOW |
| `MA_GOLDEN_CROSS` | 50MA crosses above 200MA | HIGH |
| `MA_DEATH_CROSS` | 50MA crosses below 200MA | HIGH |
| `DRAWDOWN_WARNING` | Portfolio drawdown exceeds threshold | HIGH |

## Indicators (`pulse.py`)
| Function | Output |
|----------|--------|
| `calc_rsi(prices, period=14)` | RSI value 0–100 |
| `calc_macd(prices)` | `{macd, signal, histogram}` |
| `calc_bollinger(prices, period=20, std=2)` | `{upper, middle, lower}` |
| `calc_moving_averages(prices)` | `{ma20, ma50, ma200}` |

## Signal Detection (`trigger.py`)
| Function | Checks |
|----------|--------|
| `check_rsi_signal(symbol, prices)` | RSI < 30 or > 70 |
| `check_macd_signal(symbol, prices)` | MACD/signal line crossovers |
| `check_bollinger_signal(symbol, prices)` | Price vs bands |
| `check_volume_signal(symbol, volume, avg_volume)` | Volume > 2x avg |

## Signal Storage
Table: `signals` — `id, symbol, signal_type, severity, message, timestamp`

## API
- `GET /api/signals?symbol=SPY&signal_type=RSI_OVERSOLD&limit=50&offset=0`
- `GET /api/signal-stats` — accuracy per signal type
- `POST /api/signals/{signal_id}/confidence` — user rates signal
- `GET /api/signals/{signal_type}/guide` — educational content

## AI Enhancement (`ai_signals.py`)
- `POST /api/predictions/{symbol}` — ML price prediction
- `POST /api/sentiment/analyze` — text sentiment → bullish/bearish score
- `GET /api/patterns/{symbol}` — chart pattern detection (head & shoulders, etc.)
- `GET /api/anomalies/{symbol}` — statistical anomaly detection
