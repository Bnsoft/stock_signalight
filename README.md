# Signalight

> Signal + Light — When the signal fires, you see the light.

A personal stock signal scanner and dashboard that monitors ETFs and stocks using technical indicators, sends real-time alerts via Telegram, and provides an AI-powered web dashboard for analysis.

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

## Features

### Signal Detection
- **Moving Averages** — MA20, MA60 crossover detection (Golden Cross / Death Cross)
- **RSI** — Oversold (< 30) and overbought (> 70) alerts
- **MACD** — Momentum shift detection
- **Bollinger Bands** — Price breakout alerts
- **Drawdown Levels** — QQQ drawdown-based staged entry signals for leveraged ETFs

### Telegram Bot (Bidirectional)
| Command | Description |
|---------|-------------|
| `/scan` | Trigger immediate scan |
| `/status` | Scanner health check |
| `/price QQQ` | Price + all indicators |
| `/signals` | Recent signal history |
| `/watchlist` | Current watchlist |
| `/add AAPL` | Add symbol |
| `/remove AAPL` | Remove symbol |
| `/report` | Full daily report |
| `/news QQQ` | AI news analysis (Phase 3) |

### Web Dashboard (Phase 2+)
- Real-time signal feed (Supabase Realtime)
- TradingView candlestick charts with indicator overlays
- Watchlist management UI
- Signal threshold configuration
- PWA — installable on mobile

### AI Analysis (Phase 3)
- Automated news sentiment analysis via Claude API
- Combined technical + sentiment signal scoring
- Per-symbol AI summary and risk assessment

## Default Watchlist

| Symbol | Name | Category |
|--------|------|----------|
| QQQ | Invesco QQQ | Index ETF |
| SPY | SPDR S&P 500 | Index ETF |
| TQQQ | ProShares UltraPro QQQ | 3x Leveraged |
| QLD | ProShares Ultra QQQ | 2x Leveraged |
| SPYI | NEOS S&P 500 High Income | Covered Call |
| QQQI | NEOS Nasdaq-100 High Income | Covered Call |
| JEPQ | JPMorgan Nasdaq Equity Premium Income | Covered Call |

## Drawdown Entry Strategy

Staged entry levels triggered by QQQ drawdown from all-time high:

| QQQ Drawdown | Action |
|--------------|--------|
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
