# Signalight - Professional Stock Trading Platform

> Signal + Light — When the signal fires, you see the light.

A comprehensive, professional-grade stock trading platform for US stocks and crypto monitoring. Features real-time alerts, technical analysis, backtesting, portfolio management, and broker integrations with a modern web-based interface.

## Architecture

```
signalight/
├── signalight-engine/      Python — Scanner, signals, Telegram bot
├── signalight-web/         Next.js — Dashboard, charts, settings
└── README.md
```

```
┌─────────────────────────────────────────────────────────────────┐
│                        SIGNALIGHT                               │
│                                                                 │
│  ┌──────────────────────┐          ┌──────────────────────┐     │
│  │  signalight-engine   │          │   signalight-web     │     │
│  │  (Python Worker)     │          │   (Next.js PWA)      │     │
│  │                      │          │                      │     │
│  │  • Market data fetch │          │  • Dashboard         │     │
│  │  • Indicator calc    │          │  • Charts            │     │
│  │  • Signal detection  │          │  • Signal history    │     │
│  │  • Telegram bot      │          │  • Watchlist mgmt    │     │
│  │  • AI news analysis  │          │  • Settings UI       │     │
│  │                      │          │                      │     │
│  └──────────┬───────────┘          └──────────┬───────────┘     │
│             │                                 │                 │
│             │        ┌──────────────┐         │                 │
│             └───────►│   Supabase   │◄────────┘                 │
│                      │  (PostgreSQL)│                           │
│                      │              │                           │
│                      │  • Watchlist  │                           │
│                      │  • Signals   │                           │
│                      │  • Config    │                           │
│                      │  • News      │                           │
│                      └──────────────┘                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Notifications                         │   │
│  │  📱 Telegram Bot  •  📧 Email (Resend)  •  🔔 Web Push  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Features

### 🚨 Alert System (7 Types)
- **Price Alerts** — Monitor specific price levels with above/below conditions
- **Indicator Alerts** — RSI, MACD, Bollinger Bands, ATR, Stochastic signals
- **Volume Alerts** — Track unusual trading volume spikes
- **Portfolio Alerts** — Monitor overall portfolio performance metrics
- **News Alerts** — Symbol-specific news event tracking
- **Time-Based Alerts** — Scheduled notifications at specific times
- **Composite Alerts** — Multi-condition alerts with AND/OR logic
- **Multi-Channel Notifications** — Push, Email, SMS, Telegram, Discord

### 📊 Technical Analysis & Screener
- **Stock Screener** — 8 preset screens (Gainers, Losers, RSI, MACD, Volume, MA Cross, Bollinger)
- **Real-time Indicators** — SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic
- **Chart Analysis** — Multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d, 1w)
- **Market Statistics** — Advancing/Declining stocks, sector performance, VIX

### 🔬 Advanced Analysis Tools
- **Backtesting** — Strategy testing with historical data, parameter optimization, Monte Carlo simulation
- **Portfolio Analysis** — Asset allocation, sector analysis, correlation matrix, efficient frontier
- **Options Analysis** — Options chain, Greeks (Delta, Gamma, Theta, Vega, Rho), implied volatility
- **Performance Attribution** — Contribution analysis by position, dividend tracking

### 📰 News & Events
- **News Feed** — Latest market news with sentiment analysis
- **Earnings Calendar** — Earnings dates with forecasts and surprises
- **Economic Calendar** — Major economic events with impact indicators
- **IPO Calendar** — Upcoming IPOs and company announcements
- **Sector News** — Industry-specific news aggregation

### 🔗 Broker Integration
- **Multiple Brokers** — Interactive Brokers, Alpaca, TD Ameritrade
- **Account Management** — Real-time account info, balances, buying power
- **Position Tracking** — Current positions with unrealized gains/losses
- **Order Management** — View, place, and cancel orders
- **Trade History** — Complete trade history with commission tracking

### 📈 Market Data
- **US Stocks** — Real-time quotes and fundamentals (Primary focus)
- **Crypto Monitoring** — BTC, ETH, and major cryptocurrencies (View-only)
- **Futures** — Index and commodity futures data
- **Forex** — Major currency pairs with bid/ask spreads
- **Bonds** — Treasury and corporate bond analysis with yield curves

### 💾 Data Export
- **Multiple Formats** — CSV, Excel, PDF, JSON exports
- **Portfolio Export** — Current holdings with formatting
- **Reports** — Monthly and annual performance reports
- **Backtest Results** — Export strategy results for external analysis
- **Transaction History** — Complete trade and transaction records

### 🌐 Real-time Updates
- **WebSocket Streaming** — Real-time price updates and indicators
- **Portfolio Updates** — Live watchlist and position tracking
- **Alert Triggers** — Instant notifications when conditions met
- **Multi-symbol Support** — Track multiple symbols simultaneously

## Dashboard Pages

### 📱 Available Pages
1. **Overview** — Portfolio summary and key metrics
2. **Alerts** — Alert management with 7 types and multi-channel notifications
3. **Screener** — Stock screening with 8 preset filters
4. **Backtesting** — Strategy testing and optimization
5. **Charts** — Advanced technical analysis with multiple indicators
6. **Options** — Options chain, Greeks, and strategy analysis
7. **Portfolio Analysis** — Detailed portfolio metrics and rebalancing
8. **News & Events** — News feed, earnings, economic calendar
9. **Market Overview** — Market indices, sectors, crypto, futures
10. **Broker Integration** — Broker account management and trading
11. **Data Export** — Export portfolio and reports in multiple formats
12. **Advanced Trading** — Order creation and management

## Technology Stack

### Backend
- **Framework** — FastAPI with async/await
- **Database** — SQLite with optimized queries
- **Real-time** — WebSocket for live updates
- **APIs** — Broker integrations (Interactive Brokers, Alpaca, TD Ameritrade)

### Frontend
- **Framework** — Next.js 16 with React 18
- **Language** — TypeScript
- **Styling** — Tailwind CSS with dark mode
- **Charts** — Lightweight Charts library
- **State Management** — React hooks and Context API

### Data Processing
- **Technical Analysis** — pandas-ta, NumPy, SciPy
- **Options Pricing** — Black-Scholes model, Newton-Raphson IV
- **Portfolio Analysis** — Modern Portfolio Theory, correlation matrices

## Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup
```bash
cd signalight-engine
pip install -r requirements.txt
python -m src.main
# API runs on http://localhost:8000
```

### Frontend Setup
```bash
cd signalight-web/signalight-landing
npm install
npm run dev
# Web runs on http://localhost:3000
```

## Default Watchlist

| Symbol | Name | Category |
|--------|------|----------|
| QQQ | Invesco QQQ | Index ETF |
| SPY | SPDR S&P 500 | Index ETF |
| TQQQ | ProShares UltraPro QQQ | 3x Leveraged |
| QLD | ProShares Ultra QQQ | 2x Leveraged |
| AAPL | Apple Inc. | Technology |
| MSFT | Microsoft Corporation | Technology |
| TSLA | Tesla Inc. | Automotive |
| NVDA | NVIDIA Corporation | Semiconductors |
| -10% | Start buying QLD |
| -15% | Add TQQQ small position |
| -20% | Increase TQQQ allocation |
| -25% | Aggressive TQQQ entry |
| -30% | Max TQQQ allocation |

## Roadmap

### Phase 1 — Engine (Python) ✦ Current
> Local scanner + Telegram bot on WSL. Zero cost.

- [x] Project setup with `uv`
- [ ] Market data fetcher (yfinance)
- [ ] Technical indicator calculations
- [ ] Signal detection engine
- [ ] SQLite storage
- [ ] Telegram alerts (outbound)
- [ ] Telegram commands (inbound)
- [ ] Scanner loop with scheduling

### Phase 2 — Web Dashboard (Next.js)
> Visual dashboard + charts. Deploy on Vercel.

- [ ] Supabase DB migration
- [ ] Dashboard with real-time signal feed
- [ ] TradingView charts with indicator overlays
- [ ] Watchlist and settings management
- [ ] PWA setup for mobile

### Phase 3 — AI & Notifications
> Claude-powered news analysis + multi-channel alerts.

- [ ] Finnhub news integration
- [ ] Claude API sentiment analysis
- [ ] Email alerts (Resend)
- [ ] Web Push notifications

### Phase 4 — Multi-User & Launch
> Authentication, cloud deployment, public release.

- [ ] Supabase Auth + Row Level Security
- [ ] Multi-user engine
- [ ] Cloud deployment (Railway / Fly.io)
- [ ] Landing page + onboarding
- [ ] Free and premium tiers

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Engine | Python 3.12+, uv | Free |
| Data | yfinance | Free |
| Indicators | ta (Python) | Free |
| DB (Phase 1) | SQLite | Free |
| DB (Phase 2+) | Supabase PostgreSQL | Free tier |
| Bot | Telegram Bot API | Free |
| Web | Next.js, Tailwind, shadcn/ui | Free |
| Charts | TradingView Lightweight Charts | Free |
| Hosting (Web) | Vercel | Free tier |
| Hosting (Engine) | WSL (local) → Railway/Fly.io | Free → $5/mo |
| AI | Claude API | ~$3-10/mo |
| Email | Resend | Free tier |

## Getting Started

### Prerequisites
- WSL (Ubuntu) or Linux
- uv (Python package manager)
- Telegram account

### Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/signalight.git
cd signalight/signalight-engine

# Install dependencies
uv sync

# Configure
cp .env.example .env
# Edit .env with your Telegram bot token and chat ID

# Run
uv run python -m src.app
```

### Telegram Bot Setup

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the bot token to `.env` as `TELEGRAM_BOT_TOKEN`
4. Send any message to your new bot
5. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` to find your chat ID
6. Copy the chat ID to `.env` as `TELEGRAM_CHAT_ID`

## Project Structure

```
signalight/
├── signalight-engine/
│   ├── src/
│   │   ├── app.py           # Entry point + event loop
│   │   ├── config.py        # Watchlist, thresholds, settings
│   │   ├── market.py        # yfinance data fetcher
│   │   ├── pulse.py         # Technical indicator calculations
│   │   ├── trigger.py       # Signal condition engine
│   │   ├── store.py         # SQLite / Supabase storage
│   │   ├── alert.py         # Telegram alert sender
│   │   └── command.py       # Telegram command handler
│   ├── data/
│   │   └── signalight.db
│   ├── tests/
│   ├── pyproject.toml
│   └── Tasks.md
│
├── signalight-web/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Supabase client, utilities
│   │   └── hooks/           # Custom React hooks
│   ├── package.json
│   └── Tasks.md
│
└── README.md
```

## License

MIT

## Disclaimer

This tool is for personal use and educational purposes only. It does not constitute financial advice. Always do your own research before making investment decisions.
