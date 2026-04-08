# Database Schema

DB: SQLite · File: `signalight-engine/data/signalight.db`
Init: `store._init_db()` · Connection: `store._connect()`

## Signal Engine
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `signals` | Detected trading signals | `id, symbol, signal_type, severity, message, timestamp` |
| `scan_log` | Scan execution history | `id, scanned_at, symbols_count, signals_found` |
| `signal_performance` | Signal win/loss tracking | `signal_id, result, pnl, evaluated_at` |
| `indicator_accuracy` | Per-indicator accuracy stats | `indicator, signal_type, accuracy, sample_count` |
| `signal_confidence` | User-rated signal confidence | `signal_id, user_id, confidence_score` |

## Market Data
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `watchlist` | User watchlist symbols | `user_id, symbol, added_at` |
| `economic_calendar` | Economic events | `id, event, date, impact, actual, forecast` |
| `news_signals` | News-linked signals | `id, symbol, headline, sentiment, signal_type, timestamp` |
| `crypto_assets` | Crypto position data | `user_id, symbol, quantity, entry_price` |

## Users & Auth
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | `user_id, email, password_hash, created_at, is_guest` |
| `user_preferences` | App preferences | `user_id, theme, language, dashboard_layout` |
| `user_profiles` | Extended profile | `user_id, bio, risk_tolerance, trading_style` |
| `language_preferences` | i18n settings | `user_id, language, locale` |

## Portfolio
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `positions` | Open positions | `id, user_id, symbol, quantity, entry_price, current_price, position_value, position_pnl, position_return` |
| `portfolio_history` | Historical snapshots | `user_id, total_value, total_pnl, recorded_at` |
| `portfolio_targets` | Target allocations | `user_id, symbol, target_weight` |
| `investment_goals` | Financial goals | `user_id, goal_type, target_amount, target_date` |
| `rebalance_history` | Rebalance actions | `user_id, action, symbol, quantity, executed_at` |
| `net_worth_tracker` | Total net worth over time | `user_id, total_value, assets_breakdown, recorded_at` |

## Orders & Trading
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `orders` | All order types | `user_id, symbol, quantity, order_type, order_side, price, status, oco_id, bracket_id, scale_id, scale_step, parent_order_id` |
| `conditional_orders` | Conditional trigger orders | `condition_id, user_id, symbol, quantity, order_price, trigger_symbol, trigger_price, trigger_condition, status` |
| `auto_trades` | Auto trade rules | `id, user_id, symbol, strategy, quantity, status, created_at` |
| `trade_conditions` | Conditions for auto trades | `trade_id, indicator, condition, threshold` |
| `trading_journal` | Trade notes/journal | `user_id, symbol, entry_note, exit_note, pnl, created_at` |
| `mirror_trades` | Mirror trading relations | `user_id, trader_id, allocation_percent, active` |

## Broker
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `broker_accounts` | Connected broker accounts | `user_id, broker_type, api_key_encrypted, account_id, connected_at` |
| `broker_orders` | Orders placed via broker | `user_id, symbol, order_type, quantity, price, created_at, status` |

## Alerts
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `price_alerts` | Price-based alerts | `id, user_id, symbol, alert_type, trigger_price, notify_methods, status` |
| `indicator_alerts` | Indicator-based alerts | `id, user_id, symbol, indicator, condition, threshold, status` |
| `alert_history` | Triggered alert log | `alert_id, triggered_at, message` |

## Risk
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `risk_limits` | Daily/monthly loss limits | `user_id, limit_type, limit_amount, current_amount` |
| `stop_loss_rules` | Auto stop-loss rules | `user_id, symbol, stop_price, trailing_percent` |
| `ml_predictions` | ML price predictions | `symbol, predicted_price, confidence, predicted_at` |
| `sentiment_analysis` | Sentiment results | `symbol, sentiment_score, source, analyzed_at` |

## Analytics
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `backtest_results` | Saved backtest runs | `id, symbol, strategy, total_return, sharpe_ratio, max_drawdown, created_at` |
| `calculations` | Saved calculator results | `id, user_id, calc_type, inputs, result, created_at` |

## Education & Community
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `courses` | Available courses | `id, title, level, modules, signal_type` |
| `user_courses` | Enrollment + progress | `user_id, course_id, progress_percent, enrolled_at, completed_at` |
| `community_posts` | Forum posts | `id, user_id, content, likes, symbol, created_at` |
| `community_comments` | Post comments | `id, post_id, user_id, content, created_at` |
| `user_follows` | Social follows | `follower_id, following_id, created_at` |

## Gamification
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_badges` | Earned badges | `user_id, badge_id, earned_at` |
| `leaderboard` | Rankings | `user_id, score, rank, period` |
| `referrals` | Referral tracking | `referrer_id, referred_id, reward_given, created_at` |
| `user_credits` | Platform credits | `user_id, balance, last_updated` |
