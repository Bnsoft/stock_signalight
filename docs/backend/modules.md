# Backend Modules

Entry point: `signalight-engine/src/api.py` (FastAPI app, 174 routes)

## Core

| File | Purpose | Key Functions |
|------|---------|---------------|
| `api.py` | All FastAPI routes (174 endpoints) | Route handlers only — delegates to modules |
| `store.py` | SQLite DB init + raw queries | `_connect()`, `_init_db()`, `get_signals()`, `add_to_watchlist()` |
| `main.py` | CLI entry + additional route handlers | Signal scan loop, health routes |
| `app.py` | App factory / startup | `create_app()` |
| `config.py` | Env vars, constants | `Settings` dataclass |
| `auth.py` | JWT auth | `create_access_token()`, `verify_access_token()`, `hash_password()` |
| `error_handlers.py` | FastAPI exception handlers | `validation_error_handler()`, `general_error_handler()` |

## Signal Engine

| File | Purpose | Key Functions |
|------|---------|---------------|
| `trigger.py` | Signal detection rules | `check_rsi_signal()`, `check_macd_signal()`, `check_bollinger_signal()`, `check_volume_signal()` |
| `pulse.py` | Technical indicator calculations | `calc_rsi()`, `calc_macd()`, `calc_bollinger()`, `calc_moving_averages()` |
| `command.py` | CLI scan commands | `run_scan()`, `scan_symbol()` |
| `alert.py` | Basic alert storage | `save_alert()`, `get_alerts()` |
| `ai_signals.py` | AI/ML signal enhancement | `get_ai_prediction()`, `analyze_sentiment()`, `detect_patterns()` |

## Trading

| File | Purpose | Key Functions |
|------|---------|---------------|
| `advanced_trading.py` | OCO/Bracket/Scale orders | `create_oco_order()`, `create_bracket_order()`, `create_scale_order()`, `get_active_advanced_orders()`, `cancel_oco_order()`, `get_order_recommendations()` |
| `auto_trade_service.py` | Automated trade execution | `create_auto_trade()`, `execute_auto_trade()`, `get_auto_trade_performance()` |
| `broker_integrations.py` | Broker API connections | `connect_broker()`, `place_order()`, `get_account_info()`, `sync_positions()` |
| `backtest.py` | Simple backtest runner | `run_backtest()` |
| `backtesting.py` | Full backtest engine | `run_strategy_backtest()`, `compare_strategies()`, `backtest_with_monte_carlo()`, `parameter_optimization()` |

## Analysis

| File | Purpose | Key Functions |
|------|---------|---------------|
| `portfolio.py` | Portfolio CRUD | `add_position()`, `get_portfolio()`, `update_position_price()` |
| `portfolio_analyzer.py` | Deep portfolio analytics | `calculate_portfolio_metrics()`, `get_asset_allocation()`, `get_sector_analysis()`, `calculate_efficient_frontier()`, `get_risk_metrics()`, `get_rebalance_recommendations()` |
| `risk_management.py` | Risk limits + VaR | `set_daily_risk_limit()`, `calculate_var()`, `calculate_position_size()`, `run_stress_test()` |
| `options_analysis.py` | Options pricing + Greeks | `get_options_chain()`, `calculate_option_Greeks()`, `calculate_implied_volatility()`, `get_option_strategies()` |
| `stock_screener.py` | Stock screening | `screen_gainers()`, `screen_losers()`, `screen_by_rsi()`, `screen_by_macd()`, `get_market_stats()` |

## Market Data

| File | Purpose | Key Functions |
|------|---------|---------------|
| `market.py` | Basic market data | `get_market_data()` |
| `market_data.py` | Crypto/Futures/Forex/Bonds | `get_crypto_prices()`, `get_futures_contracts()`, `get_forex_rates()`, `get_bond_data()`, `get_yield_curve()` |
| `news_data.py` | News + calendars | `get_latest_news()`, `get_earnings_calendar()`, `get_economic_calendar()`, `analyze_sentiment()` |
| `news_service.py` | News aggregation | `fetch_news()`, `filter_news()` |

## Features

| File | Purpose | Key Functions |
|------|---------|---------------|
| `alerts_advanced.py` | Advanced multi-channel alerts | `create_price_alert()`, `create_indicator_alert()`, `create_composite_alert()`, `configure_notification_settings()` |
| `realtime_updates.py` | WebSocket streaming | `RealtimeUpdateManager`, `StreamTask`, `get_mock_price_update()` |
| `data_export.py` | CSV/Excel/PDF export | `export_portfolio_to_csv()`, `export_portfolio_to_excel()`, `export_portfolio_to_pdf()`, `generate_monthly_report()` |
| `community.py` | Social features | `create_post()`, `get_community_feed()`, `follow_user()` |
| `courses.py` | Education system | `get_courses()`, `enroll_course()`, `update_progress()` |
| `advanced_features.py` | Gamification + premium | `get_user_badges()`, `track_net_worth()`, `get_etf_analysis()`, `start_mirror_trading()` |
| `notifier.py` | Notification delivery | `send_email()`, `send_push()`, `send_telegram()` |

## Routes (sub-routers)

| File | Handles |
|------|---------|
| `routes_broker.py` | Broker connect/account/orders/positions |
| `routes_dashboard.py` | Dashboard layout config |
| `routes_export.py` | Export file downloads |
| `routes_settings.py` | Profile/notifications/preferences |
