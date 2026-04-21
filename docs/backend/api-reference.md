# Signalight API Reference

Base URL: `http://localhost:8000`
Auth: `Authorization: Bearer {token}` (JWT)

## Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Register with email + password |
| POST | `/auth/login` | Login with email + password |
| POST | `/auth/guest` | Create guest session (no DB) |
| POST | `/auth/google` | Google OAuth login |
| GET | `/auth/verify?token=` | Verify JWT, return user info |

## User / Profile
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/{user_id}` | Get profile + preferences |
| POST | `/api/user/{user_id}/preferences` | Update (theme, telegram_chat_id, etc.) |

## Watchlist
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/watchlist` | List with live prices |
| POST | `/api/watchlist` | Add `{ symbol, name }` |
| DELETE | `/api/watchlist/{symbol}` | Remove symbol |

## Signals & Scan
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/signals` | Paginated history (`?symbol=&limit=&offset=`) |
| GET | `/api/signals/recent` | Last 7 days (`?limit=&symbol=`) |
| POST | `/api/scan/run` | Manual scan trigger |

## Chart & Quote
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chart/{symbol}` | OHLCV (`?interval=1d&period=6mo`) |
| GET | `/api/quote/{symbol}` | Current price + all indicators |

## Alerts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/alerts/price?user_id=` | Price alert |
| POST | `/api/alerts/indicator?user_id=` | MA alert |
| POST | `/api/alerts/volume?user_id=` | Volume spike alert |
| GET | `/api/alerts?user_id=` | All alerts (price/indicator/volume) |
| PUT | `/api/alerts/{id}/toggle?alert_type=&is_active=` | Toggle |
| DELETE | `/api/alerts/{id}?alert_type=` | Delete |

- price `alert_type`: `PRICE_ABOVE` \| `PRICE_BELOW`
- indicator `condition`: `CROSS_ABOVE` \| `CROSS_BELOW` \| `ABOVE` \| `BELOW`
- `notify_methods`: `["TELEGRAM"]` \| `["EMAIL"]` \| `["TELEGRAM","EMAIL"]`
- Alerts are checked every scan cycle; TELEGRAM fires to `TELEGRAM_CHAT_ID` in `.env`

## Calculator
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/calculate?user_id=` | Profit/ROI calculation |
| GET | `/api/user/{user_id}/calculations` | History |

## Backtest
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/backtest` | Run `{ symbol, days, strategy }` |
| GET | `/api/backtest/results` | Saved results (`?symbol=`) |

## Export
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/signals?user_id=&format=csv` | Signal history CSV/JSON |
| GET | `/api/export/alerts?user_id=&format=csv` | Alert list CSV/JSON |

## WebSocket
- `ws://localhost:8000/ws/signals` — signal stream, pushes every 10s
