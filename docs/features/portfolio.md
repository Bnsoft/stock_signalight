# Portfolio & Analysis

Modules: `portfolio.py` (CRUD), `portfolio_analyzer.py` (analytics), `risk_management.py` (risk)

## Portfolio CRUD

| API | Description |
|-----|-------------|
| POST `/api/portfolio/positions` | Add position `{user_id, symbol, quantity, entry_price}` |
| GET `/api/portfolio/{user_id}` | All positions with P&L |
| GET `/api/portfolio/{user_id}/history` | Value snapshots over time |
| DELETE `/api/portfolio/positions/{position_id}` | Remove position |
| PUT `/api/portfolio/positions/{position_id}/price` | Update current price |

DB: `positions` — `symbol, quantity, entry_price, current_price, position_value, position_pnl, position_return`

## Portfolio Analytics (`portfolio_analyzer.py`)

| Function | API | Returns |
|----------|-----|---------|
| `calculate_portfolio_metrics()` | `GET /api/user/{user_id}/risk-summary` | total_value, total_pnl, roi, diversification_score |
| `get_asset_allocation()` | (via portfolio-analysis page) | Per-position weight % |
| `get_sector_analysis()` | (via portfolio-analysis page) | Sector breakdown |
| `calculate_correlation_matrix()` | `GET /api/correlation-matrix` | Asset correlation grid |
| `get_performance_attribution()` | (via portfolio-analysis page) | Return attribution per position |
| `calculate_efficient_frontier()` | (via portfolio-analysis page) | Risk/return optimization points |
| `get_dividend_analysis()` | (via portfolio-analysis page) | Yield, payout, ex-dividend dates |
| `get_risk_metrics()` | `GET /api/user/{user_id}/portfolio-risk` | VaR, max drawdown, beta |
| `get_rebalance_recommendations()` | `GET /api/portfolio/{user_id}/rebalance-suggestion` | Over/underweight suggestions |

## Risk Management (`risk_management.py`)

| API | Description |
|-----|-------------|
| GET `/api/user/{user_id}/var` | Value at Risk (95% confidence) |
| GET `/api/user/{user_id}/expected-shortfall` | CVaR / Expected Shortfall |
| GET `/api/user/{user_id}/risk-profile` | User risk tolerance profile |
| POST `/api/user/{user_id}/risk-limits/daily` | Set max daily loss `{limit_amount}` |
| POST `/api/user/{user_id}/risk-limits/monthly` | Set max monthly loss |
| GET `/api/user/{user_id}/risk-limits` | Current limits + usage |
| POST `/api/stop-loss-rules` | Auto stop-loss rule `{symbol, stop_price, trailing_percent}` |
| GET `/api/stop-loss-rules/{user_id}` | Active stop-loss rules |
| POST `/api/position-size` | Kelly criterion position sizing `{symbol, capital, risk_percent}` |
| GET `/api/user/{user_id}/stress-test` | Scenario analysis `?scenario=2008_CRISIS\|COVID_CRASH\|TECH_BUBBLE` |
| GET `/api/portfolio/{user_id}/hedging-suggestions` | Hedge recommendations |
| POST `/api/portfolio/{user_id}/apply-hedge` | Execute hedge |

DB: `risk_limits`, `stop_loss_rules`

## Goals & Rebalancing

| API | Description |
|-----|-------------|
| POST `/api/goals` | Create goal `{user_id, goal_type, target_amount, target_date}` |
| GET `/api/goals/{user_id}` | Get goals with progress |
| POST `/api/portfolio/targets` | Set target allocation weights |
| GET `/api/portfolio/{user_id}/rebalance-suggestion` | Suggested trades to rebalance |

DB: `investment_goals`, `portfolio_targets`, `rebalance_history`

## Performance Tracking

| API | Description |
|-----|-------------|
| GET `/api/performance/{user_id}/metrics` | Returns: total_return, daily_return, weekly_return, monthly_return, ytd_return, sharpe_ratio, sortino_ratio, max_drawdown |
| GET `/api/user/{user_id}/net-worth` | Total wealth across all assets |

DB: `portfolio_history`

## Options Analysis (`options_analysis.py`)

| API | Body / Query | Returns |
|-----|-------------|---------|
| GET `/api/options/chain/{symbol}` | `?expiration_date` | `{data: {symbol, price, expirationDates[], iv, ivPercentile, chain[]}}` |
| GET `/api/options/expirations/{symbol}` | — | Available expiry dates |
| POST `/api/options/greeks` | `{symbol, strike, expiration_date, option_type, current_price, risk_free_rate, volatility}` | `{delta, gamma, theta, vega, rho}` |
| GET `/api/options/strategies` | — | 6 strategy descriptions |

Chain format: `{strikePrice, callBid, callAsk, callIv, callDelta, putBid, putAsk, putIv, putDelta}`

Pricing model: Black-Scholes. IV: Newton-Raphson iteration.
