# Trading Features

## Advanced Orders (`advanced_trading.py`)

### Order Types
| Type | Description | Key Fields |
|------|-------------|-----------|
| **OCO** | One Cancels Other — take profit OR stop loss | `primary_price` (limit), `secondary_price` (stop) |
| **Bracket** | Entry + take profit + stop loss as one unit | `entry_price`, `take_profit_price`, `stop_loss_price` |
| **Scale** | Split total quantity across multiple price levels | `total_quantity`, `entry_prices[]` |
| **Conditional** | Trigger based on another symbol's price | `trigger_symbol`, `trigger_price`, `trigger_condition` |

### DB Storage
Table: `orders` — `oco_id`, `bracket_id`, `scale_id`, `scale_step`, `status` columns differentiate types.
Table: `conditional_orders` — separate table for conditional triggers.

### API Endpoints
| Method | Path | Body |
|--------|------|------|
| POST | `/api/orders/oco?user_id=` | `{symbol, quantity, primary_price, secondary_price, order_side, primary_type, secondary_type}` |
| POST | `/api/orders/bracket?user_id=` | `{symbol, quantity, entry_price, take_profit_price, stop_loss_price, order_side}` |
| POST | `/api/orders/scale?user_id=` | `{symbol, total_quantity, entry_prices[], order_side}` |
| GET | `/api/advanced-orders/{user_id}` | Returns `{oco_orders, conditional_orders, bracket_orders, scale_orders}` |
| DELETE | `/api/orders/oco/{oco_id}` | Cancel OCO |
| DELETE | `/api/orders/bracket/{bracket_id}` | Cancel bracket |
| PUT | `/api/orders/oco/{oco_id}` | `{new_primary_price, new_secondary_price}` |
| GET | `/api/orders/recommendations/{symbol}` | `?current_price&volatility&risk_tolerance` |

### Order Recommendations (`get_order_recommendations`)
Based on price + volatility → suggests bracket, OCO, scale prices.
Risk tolerances: `CONSERVATIVE`, `MEDIUM`, `AGGRESSIVE`

---

## Auto Trading (`auto_trade_service.py`)

Rules-based automated order execution.

| API | Description |
|-----|-------------|
| POST `/api/auto-trades` | Create rule `{symbol, strategy, quantity, conditions[]}` |
| GET `/api/auto-trades/{user_id}` | List rules |
| POST `/api/auto-trades/{trade_id}/execute` | Manual trigger |
| DELETE `/api/auto-trades/{trade_id}` | Delete rule |
| GET `/api/auto-trades/{user_id}/execution-history` | Past executions |
| GET `/api/auto-trades/{user_id}/performance` | P&L from auto trades |
| POST `/api/simulate-trade` | Simulate without executing |

DB Tables: `auto_trades`, `trade_conditions`

---

## Broker Integration (`broker_integrations.py`)

### Supported Brokers (simulated)
`ALPACA`, `INTERACTIVE_BROKERS`, `TD_AMERITRADE`, `ETRADE`, `ROBINHOOD`, `PAPER`

### Key Functions
| Function | Description |
|----------|-------------|
| `connect_broker(user_id, broker_type, api_key, secret)` | Store credentials (encrypted) |
| `place_order(user_id, symbol, quantity, order_type, price)` | Execute order via broker |
| `get_account_info(user_id)` | Balance + buying power |
| `get_positions(user_id)` | Current broker positions |
| `sync_positions(user_id)` | Sync broker positions to local DB |

DB: `broker_accounts`, `broker_orders`

---

## Paper Trading

Simulated trading without real money.

| API | Description |
|-----|-------------|
| POST `/api/paper-trade` | `{symbol, quantity, order_type, price}` |
| GET `/api/paper-trades` | History of paper trades |

---

## Mirror Trading (`advanced_features.py`)

Copy trades from top performers.

| API | Description |
|-----|-------------|
| GET `/api/user/{user_id}/mirror-traders` | Available traders to copy |
| POST `/api/user/{user_id}/mirror/{trader_id}` | Start copying `?allocation_percent` |

DB: `mirror_trades`

---

## Trading Journal

DB: `trading_journal` — `user_id, symbol, entry_note, exit_note, pnl, created_at`
