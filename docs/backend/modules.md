# Backend Modules

Entry point: `signalight-engine/src/main.py` (FastAPI lifespan + background scanner)
API routes: `signalight-engine/src/api.py`

## Core Modules

| File | Role |
|------|------|
| `main.py` | FastAPI app, background scanner (`_background_scanner`), `_run_scan()` |
| `api.py` | All HTTP endpoints (auth, alerts, calculator, backtest, export) |
| `store.py` | SQLite DB layer — `init_db()`, all CRUD functions |
| `config.py` | Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SIGNAL_CONFIG` |
| `auth.py` | JWT create/verify, register/login/guest/google |

## Signal Engine

| File | Role |
|------|------|
| `pulse.py` | Indicator calculation: MA, EMA, RSI, MACD, Bollinger, VWAP, Stochastic, ATR, ADX, OBV, Ichimoku |
| `trigger.py` | Signal detection: `evaluate_all_signals()` — checks all indicators, returns triggered signals |
| `market.py` | yfinance wrappers: `fetch_daily_data()`, `fetch_current_price()` |
| `backtest.py` | `simple_backtest(symbol, days)` — MA crossover backtest |

## Alerts

| File | Role |
|------|------|
| `alerts_advanced.py` | Create/get/toggle/delete price, indicator, volume alerts |
| `alerts_checker.py` | `check_user_alerts()` — called per-symbol in scan loop, fires Telegram if condition met |

## Telegram Bot

| File | Role |
|------|------|
| `app.py` | Bot entry point (`python -m src.app`), scanner loop |
| `alert.py` | `send_alert()`, `send_message()` — Telegram via python-telegram-bot |
| `command.py` | Slash commands: `/price`, `/scan`, `/watchlist`, `/report` |
| `notifier.py` | Email (Resend), Discord, Slack, Web Push helpers |

## Routes (legacy, kept for compatibility)
| File | Role |
|------|------|
| `routes_export.py` | Export route helpers |
| `routes_settings.py` | Settings route helpers |
| `error_handlers.py` | Global exception handlers |
