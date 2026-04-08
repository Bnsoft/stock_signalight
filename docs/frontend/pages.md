# Dashboard Pages

Base path: `signalight-web/signalight-landing/src/app/dashboard/`
All pages: `"use client"`, use `useAuth()` for `token` + `user?.user_id`.

## Page Inventory

| Route | File | Purpose | Key API Calls |
|-------|------|---------|---------------|
| `/dashboard` | `page.tsx` | Main dashboard overview | `/api/signals`, `/api/portfolio/{user_id}` |
| `/dashboard/alerts` | `alerts/page.tsx` | Alert management (3 tabs) | `/api/alerts`, `/api/alerts/price`, `/api/alerts/indicator` |
| `/dashboard/screener` | `screener/page.tsx` | Stock screener (8 tabs) | `/api/screener/gainers`, `/api/screener/rsi`, `/api/market/stats` |
| `/dashboard/backtesting` | `backtesting/page.tsx` | Backtest engine (7 tabs) | `/api/backtest`, `/api/backtest/compare`, `/api/backtest/monte-carlo` |
| `/dashboard/charts` | `charts/page.tsx` | Real candlestick chart (lightweight-charts) | `/api/chart/{symbol}?interval=&period=`, `/api/quote/{symbol}` |
| `/dashboard/options` | `options/page.tsx` | Options chain + Greeks | `/api/options/chain/{symbol}` |
| `/dashboard/portfolio-analysis` | `portfolio-analysis/page.tsx` | Deep portfolio analysis (9 tabs) | `/api/user/{user_id}/risk-profile`, `/api/user/{user_id}/var` |
| `/dashboard/news-events` | `news-events/page.tsx` | News + calendars (5 tabs) | `/api/news-feed`, `/api/earnings-calendar`, `/api/economic-calendar` |
| `/dashboard/market-overview` | `market-overview/page.tsx` | Multi-asset market view | `/api/market/stats`, `/api/market/crypto`, `/api/market/futures`, `/api/market/forex`, `/api/market/bonds` |
| `/dashboard/advanced-trading` | `advanced-trading/page.tsx` | OCO/Bracket/Scale orders | `/api/advanced-orders/{user_id}`, `/api/orders/oco`, `/api/orders/bracket`, `/api/orders/scale` |
| `/dashboard/auto-trade` | `auto-trade/page.tsx` | Auto trade rules | `/api/auto-trades/{user_id}`, `/api/auto-trades` |
| `/dashboard/broker-integration` | `broker-integration/page.tsx` | Broker connect + sync | `/api/user/{user_id}/broker-connections` |
| `/dashboard/portfolio` | `portfolio/page.tsx` | Portfolio positions | `/api/portfolio/{user_id}`, `/api/portfolio/positions` |
| `/dashboard/data-export` | `data-export/page.tsx` | Export data files | `/api/export/portfolio?format=`, `/api/export/monthly-report`, `/api/export/annual-report` |
| `/dashboard/ai-signals` | `ai-signals/page.tsx` | Real signal feed from DB + manual scan trigger | `/api/signals/recent`, `POST /api/scan/run` |
| `/dashboard/news` | `news/page.tsx` | News feed | `/api/news-feed`, `/api/market-sentiment` |
| `/dashboard/analytics` | `analytics/page.tsx` | Performance analytics | `/api/performance/{user_id}/metrics` |
| `/dashboard/performance` | `performance/page.tsx` | Return metrics | `/api/performance/{user_id}/metrics` |
| `/dashboard/watchlist` | `watchlist/page.tsx` | Watchlist with real prices, add/remove, 30s auto-refresh | `GET/POST/DELETE /api/watchlist` |
| `/dashboard/positions` | `positions/page.tsx` | Open positions | `/api/portfolio/{user_id}` |
| `/dashboard/community` | `community/page.tsx` | Social feed | `/api/community/feed`, `/api/community/posts` |
| `/dashboard/education` | `education/page.tsx` | Courses + learning | `/api/courses`, `/api/user/{user_id}/courses` |
| `/dashboard/settings` | `settings/page.tsx` | App settings | `/api/user-settings`, `/api/notification-settings` |
| `/dashboard/profile` | `profile/page.tsx` | User profile | `/api/user/{user_id}`, `/api/user/{user_id}/badges` |
| `/dashboard/goals` | `goals/page.tsx` | Investment goals | `/api/goals/{user_id}`, `/api/goals` |
| `/dashboard/rebalance` | `rebalance/page.tsx` | Portfolio rebalancing | `/api/portfolio/{user_id}/rebalance-suggestion` |
| `/dashboard/sectors` | `sectors/page.tsx` | Sector analysis | `/api/sector-heatmap`, `/api/sector-sentiment/{sector}` |
| `/dashboard/compare` | `compare/page.tsx` | Symbol comparison | `/api/candles`, `/api/indicators` |
| `/dashboard/search` | `search/page.tsx` | Symbol search | `/api/signals?symbol=` |
| `/dashboard/calculator` | `calculator/page.tsx` | Financial calculator | `/api/calculate` |
| `/dashboard/calculations` | `calculations/page.tsx` | Saved calculations | `/api/user/{user_id}/calculations` |
| `/dashboard/backtest` | `backtest/page.tsx` | Simple backtest | `/api/backtest-run` |
| `/dashboard/backtest-calculator` | `backtest-calculator/page.tsx` | Backtest calculator | `/api/backtest` |
| `/dashboard/notifications-settings` | `notifications-settings/page.tsx` | Notification config | `/api/notification-settings` |
| `/dashboard/shared-calculation/[id]` | `shared-calculation/[id]/page.tsx` | Shared calc view | `/api/user/{user_id}/calculations` |
