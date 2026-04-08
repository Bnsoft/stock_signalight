# Market Data

Module: `market_data.py` · Page: `/dashboard/market-overview`

## Asset Classes

### Cryptocurrency
| API | Description |
|-----|-------------|
| GET `/api/market/crypto` | All crypto prices `?symbols=BTC,ETH` |
| GET `/api/market/crypto/chart/{symbol}` | OHLCV `?timeframe=1d&limit=100` |
| GET `/api/market/crypto/portfolio/{user_id}` | User crypto holdings |

Supported: `BTC, ETH, BNB, SOL, XRP, ADA, DOGE, SHIB`
Response fields: `symbol, name, price, change_percent, market_cap, volume_24h`

### Futures
| API | Description |
|-----|-------------|
| GET `/api/market/futures` | Contracts list `?asset_class=INDEX\|COMMODITY\|CURRENCY\|INTEREST` |
| GET `/api/market/futures/chain/{symbol}` | Expiration chain (12 months) |

Asset classes: `INDEX` (ES, NQ, YM), `COMMODITY` (CL, GC, NG), `CURRENCY` (6E, 6J, 6B), `INTEREST` (ZB, ZN, ZF)
Response fields: `symbol, name, price, change_percent, expiration, open_interest`

### Forex
| API | Description |
|-----|-------------|
| GET `/api/market/forex` | Rates `?pairs=EURUSD,GBPUSD` |
| GET `/api/market/forex/chart/{pair}` | OHLCV `?timeframe=1h&limit=100` |

Pairs: `EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD, USDINR`
Response fields: `symbol, rate, change_percent, bid, ask, spread_pips`

### Bonds
| API | Description |
|-----|-------------|
| GET `/api/market/bonds` | Treasury + bond ETF data |
| GET `/api/market/bonds/analysis/{symbol}` | Duration/convexity analysis |
| GET `/api/market/bonds/yield-curve` | 2Y/5Y/10Y/30Y yields |
| GET `/api/market/bonds/price-calculator` | `?coupon_rate&yield_rate&years_to_maturity&face_value` |

Symbols: `UST2Y, UST5Y, UST10Y, UST30Y, LQD (IG Corp ETF), HYG (High Yield ETF)`
Response fields: `symbol, name, yield_percent, price, duration, coupon_percent`

### Stocks (Market Stats)
| API | Description |
|-----|-------------|
| GET `/api/market/stats` | VIX, advance/decline ratio, market breadth |

Response: `overall_market_trend, advancing_stocks, declining_stocks, vix, advance_decline_ratio, market_breadth`

---

## Market Overview Page

File: `market-overview/page.tsx`
Views: `stocks | crypto | futures | forex | bonds`
Each view fetches its corresponding `/api/market/*` endpoint when selected.

---

## Sector Data
| API | Description |
|-----|-------------|
| GET `/api/sector-heatmap` | Sector performance grid |
| GET `/api/sector-sentiment/{sector}` | Sentiment for specific sector |
| GET `/api/correlation-matrix` | Asset correlation matrix |
