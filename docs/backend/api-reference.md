# API Reference

Base URL: `http://localhost:8000`
Auth: `Authorization: Bearer {token}` (token = `user_id.timestamp.signature`)

---

## Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login → returns token |
| POST | `/auth/guest` | Guest session |
| POST | `/auth/google` | Google OAuth |
| GET | `/auth/verify` | Verify token validity |

## Signals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/signals` | List signals `?symbol&signal_type&limit&offset` |
| GET | `/api/candles` | OHLCV data `?symbol&period&limit` |
| GET | `/api/indicators` | Technical indicators for symbol |
| GET | `/api/signal-stats` | Signal performance stats |
| GET | `/api/indicator-stats` | Indicator accuracy stats |
| POST | `/api/signals/{signal_id}/confidence` | Rate signal confidence |
| GET | `/api/signals/{signal_type}/guide` | Educational guide for signal type |

## User & Profile
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/{user_id}` | Get user profile |
| POST | `/api/user/{user_id}/preferences` | Save preferences |
| GET | `/api/user-settings` | Get user settings |
| POST | `/api/user-settings` | Save user settings |
| GET | `/api/user/{user_id}/badges` | User badges |
| GET | `/api/user/{user_id}/points` | Gamification points |
| GET | `/api/user/{user_id}/net-worth` | Total net worth tracker |

## Watchlist
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/watchlist` | Get watchlist with real-time prices (yfinance) |
| POST | `/api/watchlist` | Add symbol `{symbol, name?}` — validates via yfinance |
| DELETE | `/api/watchlist/{symbol}` | Remove symbol |

## Market Data (Real — yfinance)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quote/{symbol}` | Current price + full indicators `{symbol, price, indicators, timestamp}` |
| GET | `/api/chart/{symbol}` | OHLCV candles `?interval=1m\|5m\|15m\|1h\|1d\|1wk\|1mo&period=1d\|5d\|1mo\|3mo\|6mo\|1y\|2y\|5y` |
| GET | `/api/signals/recent` | Real signals from DB `?limit=50&symbol=` (last 7 days) |
| POST | `/api/scan/run` | Trigger manual scan of full watchlist — saves signals to DB |

## Portfolio
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/portfolio/positions` | Add position |
| GET | `/api/portfolio/{user_id}` | Get portfolio |
| GET | `/api/portfolio/{user_id}/history` | Portfolio value history |
| DELETE | `/api/portfolio/positions/{position_id}` | Remove position |
| PUT | `/api/portfolio/positions/{position_id}/price` | Update current price |
| GET | `/api/performance/{user_id}/metrics` | Performance metrics |
| POST | `/api/goals` | Set investment goal |
| GET | `/api/goals/{user_id}` | Get goals |
| POST | `/api/portfolio/targets` | Set target allocation |
| GET | `/api/portfolio/{user_id}/rebalance-suggestion` | Rebalance suggestions |
| GET | `/api/portfolio/{user_id}/hedging-suggestions` | Hedge suggestions |
| POST | `/api/portfolio/{user_id}/apply-hedge` | Apply hedge strategy |

## Portfolio Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/{user_id}/risk-profile` | Risk profile |
| GET | `/api/user/{user_id}/var` | Value at Risk |
| GET | `/api/user/{user_id}/expected-shortfall` | Expected shortfall |
| GET | `/api/user/{user_id}/portfolio-risk` | Portfolio risk summary |
| GET | `/api/user/{user_id}/risk-summary` | Risk dashboard data |
| GET | `/api/user/{user_id}/stress-test` | Stress test `?scenario=2008_CRISIS` |
| GET | `/api/recommendations/{user_id}` | AI portfolio recommendations |

## Risk Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/user/{user_id}/risk-limits/daily` | Set daily loss limit |
| POST | `/api/user/{user_id}/risk-limits/monthly` | Set monthly loss limit |
| GET | `/api/user/{user_id}/risk-limits` | Get risk limits |
| POST | `/api/stop-loss-rules` | Create stop-loss rule |
| GET | `/api/stop-loss-rules/{user_id}` | Get stop-loss rules |
| POST | `/api/position-size` | Calculate position size |

## Advanced Orders (Phase D)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orders/oco` | Create OCO order `?user_id` |
| POST | `/api/orders/bracket` | Create bracket order `?user_id` |
| POST | `/api/orders/scale` | Create scale in/out order `?user_id` |
| GET | `/api/orders/advanced/{user_id}` | Get all active advanced orders |
| GET | `/api/advanced-orders/{user_id}` | Same (frontend alias) |
| DELETE | `/api/orders/oco/{oco_id}` | Cancel OCO order |
| DELETE | `/api/orders/bracket/{bracket_id}` | Cancel bracket order |
| DELETE | `/api/orders/conditional/{condition_id}` | Cancel conditional order |
| PUT | `/api/orders/oco/{oco_id}` | Modify OCO prices |
| GET | `/api/orders/recommendations/{symbol}` | Order strategy recommendations |
| POST | `/api/conditional-orders` | Create conditional order |
| GET | `/api/conditional-orders/{user_id}` | Get conditional orders |

## Auto Trading
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auto-trades` | Create auto trade rule |
| GET | `/api/auto-trades/{user_id}` | Get auto trade rules |
| POST | `/api/auto-trades/{trade_id}/execute` | Execute now |
| DELETE | `/api/auto-trades/{trade_id}` | Delete rule |
| GET | `/api/auto-trades/{user_id}/execution-history` | Execution history |
| GET | `/api/auto-trades/{user_id}/performance` | Auto trade performance |
| POST | `/api/simulate-trade` | Simulate trade outcome |

## Paper Trading
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/paper-trade` | Place paper trade |
| GET | `/api/paper-trades` | List paper trades |

## Screener (Phase A)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/screener/gainers` | Top gainers `?limit` |
| GET | `/api/screener/losers` | Top losers `?limit` |
| GET | `/api/screener/rsi` | Screen by RSI `?min_rsi&max_rsi` |
| GET | `/api/screener/macd` | Bullish/bearish MACD crossovers |
| GET | `/api/screener/ma-cross` | Moving average crossovers |
| GET | `/api/screener/bollinger` | Bollinger band breakouts |
| GET | `/api/screener/volume` | Unusual volume `?min_volume` |
| GET | `/api/screener/price` | Price range `?min_price&max_price` |
| GET | `/api/market/stats` | VIX, advance/decline, breadth |

## Backtesting (Phase A)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/backtest` | Run strategy backtest |
| POST | `/api/backtest/compare` | Compare strategies |
| POST | `/api/backtest/monte-carlo` | Monte Carlo simulation |
| POST | `/api/backtest/optimize` | Parameter optimization |
| POST | `/api/backtest/portfolio` | Portfolio backtest |
| GET | `/api/backtest/results` | Saved results `?symbol&limit` |

## Options (Phase B)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/options/chain/{symbol}` | Options chain with Greeks (frontend format) |
| GET | `/api/options/expirations/{symbol}` | Available expiration dates |
| POST | `/api/options/greeks` | Calculate Greeks for specific option |
| GET | `/api/options/strategies` | List option strategies |

## Alerts (Phase A)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/alerts/price` | Price alert `?user_id` |
| POST | `/api/alerts/indicator` | Indicator alert `?user_id` |
| POST | `/api/alerts/volume` | Volume alert `?user_id` |
| POST | `/api/alerts/portfolio` | Portfolio alert `?user_id` |
| POST | `/api/alerts/news` | News keyword alert `?user_id` |
| POST | `/api/alerts/time` | Time-based alert `?user_id` |
| POST | `/api/alerts/composite` | Composite (AND/OR) alert `?user_id` |
| GET | `/api/alerts` | Get all alerts `?user_id` |
| PUT | `/api/alerts/{alert_id}/toggle` | Enable/disable alert |
| DELETE | `/api/alerts/{alert_id}` | Delete alert |
| GET | `/api/alerts/history` | Alert trigger history |
| POST | `/api/alerts/settings` | Notification channel settings |
| POST | `/api/notification-settings` | Notification preferences |
| GET | `/api/notification-settings` | Get notification settings |

## Market Data (Phase E)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/market/crypto` | Crypto prices `?symbols=BTC,ETH` |
| GET | `/api/market/crypto/chart/{symbol}` | Crypto OHLCV `?timeframe&limit` |
| GET | `/api/market/crypto/portfolio/{user_id}` | User crypto portfolio |
| GET | `/api/market/futures` | Futures contracts `?asset_class=INDEX` |
| GET | `/api/market/futures/chain/{symbol}` | Futures expiration chain |
| GET | `/api/market/forex` | Forex rates `?pairs=EURUSD,GBPUSD` |
| GET | `/api/market/forex/chart/{pair}` | Forex OHLCV `?timeframe&limit` |
| GET | `/api/market/bonds` | Bond data (Treasuries + ETFs) |
| GET | `/api/market/bonds/analysis/{symbol}` | Duration/convexity analysis |
| GET | `/api/market/bonds/yield-curve` | Yield curve (2Y/5Y/10Y/30Y) |
| GET | `/api/market/bonds/price-calculator` | Bond price calc `?coupon_rate&yield_rate&years` |

## News & Events
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/news-feed` | Latest news |
| GET | `/api/earnings-calendar` | Upcoming earnings |
| GET | `/api/economic-calendar` | Economic events |
| GET | `/api/market-sentiment` | Overall market sentiment |
| GET | `/api/news-impact/{symbol}` | News impact for symbol |
| GET | `/api/sector-sentiment/{sector}` | Sector sentiment |
| GET | `/api/related-assets` | Correlated assets |

## AI & Analytics
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/predictions/{symbol}` | AI price prediction |
| POST | `/api/sentiment/analyze` | Sentiment analysis `{text}` |
| GET | `/api/patterns/{symbol}` | Chart pattern detection |
| GET | `/api/anomalies/{symbol}` | Anomaly detection |
| GET | `/api/sector-heatmap` | Sector performance heatmap |
| GET | `/api/correlation-matrix` | Asset correlation matrix |

## Export & Reports (Phase G)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/portfolio` | Portfolio export `?format=csv\|excel\|pdf` (uses auth header) |
| GET | `/api/export/alerts` | Alerts CSV (uses auth header) |
| GET | `/api/export/transactions` | Transactions CSV `?start_date` |
| GET | `/api/export/backtest` | Backtest CSV `?symbol&strategy` |
| GET | `/api/export/monthly-report` | Monthly report `?year&month&format` |
| GET | `/api/export/annual-report` | Annual report `?year&format` |
| GET | `/api/export/portfolio/csv/{user_id}` | Portfolio CSV (user_id path) |
| GET | `/api/export/portfolio/excel/{user_id}` | Portfolio Excel |
| GET | `/api/export/portfolio/pdf/{user_id}` | Portfolio PDF |
| GET | `/api/export/summary/{user_id}` | Available export formats |
| GET | `/api/report/monthly/{user_id}` | Monthly report JSON |
| GET | `/api/report/annual/{user_id}` | Annual report JSON |

## Real-time (Phase B)
| Method | Path | Description |
|--------|------|-------------|
| WS | `/ws/realtime/{symbol}` | WebSocket price/chart/indicator stream |
| GET | `/api/realtime/market-status` | Market open/closed status |
| GET | `/api/realtime/price/{symbol}` | Latest price (no WebSocket) |

## Community
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/community/posts` | Create post |
| GET | `/api/community/feed` | Community feed |
| POST | `/api/community/posts/{post_id}/like` | Like post |
| POST | `/api/community/posts/{post_id}/comments` | Add comment |
| GET | `/api/community/posts/{post_id}/comments` | Get comments |
| POST | `/api/users/{following_id}/follow` | Follow user |
| GET | `/api/user/{user_id}/followers` | Followers |
| GET | `/api/user/{user_id}/following` | Following |
| GET | `/api/user/{user_id}/investor-matches` | Similar investor profiles |

## Education
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/courses` | All courses |
| GET | `/api/courses/{course_id}` | Course detail |
| POST | `/api/courses/{course_id}/enroll` | Enroll |
| GET | `/api/user/{user_id}/courses` | User enrolled courses |
| PUT | `/api/user/{user_id}/courses/{course_id}/progress` | Update progress |
| GET | `/api/case-studies` | Trading case studies |
| GET | `/api/user/{user_id}/learning-progress` | Learning stats |

## Gamification
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboard` | Leaderboard |
| GET | `/api/user/{user_id}/leaderboard-rank` | User rank |
| GET | `/api/challenges` | Active challenges |
| GET | `/api/badges/available` | All available badges |
| POST | `/api/user/{user_id}/referral` | Create referral |
| GET | `/api/user/{user_id}/referral-stats` | Referral stats |
| GET | `/api/user/{user_id}/premium-advisor` | Premium advisor access |

## Mirror Trading
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/{user_id}/mirror-traders` | Available traders to copy |
| POST | `/api/user/{user_id}/mirror/{trader_id}` | Start mirroring `?allocation_percent` |

## Calculator
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/calculate` | Run financial calculation |
| GET | `/api/user/{user_id}/calculations` | Saved calculations |

## Utility
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/etf/{symbol}` | ETF analysis |
| GET | `/api/export-stats` | Export statistics |
