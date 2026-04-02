# Signalight Web — Tasks

## Project Overview
Build a Next.js web dashboard (PWA) that connects to the same database as `signalight-engine`, providing real-time charts, signal history, watchlist management, and AI-powered news analysis.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: TradingView Lightweight Charts
- **DB**: Supabase (PostgreSQL + Realtime)
- **Auth**: Supabase Auth
- **AI**: Claude API (news analysis)
- **Hosting**: Vercel (free tier)
- **PWA**: next-pwa (mobile install + push notifications)
- **AI Tools**: Claude Code CLI for development

---

## Phase 2: Web Dashboard

### Step 1: Project Setup

- [ ] Initialize Next.js project
  ```bash
  npx create-next-app@latest signalight-web --typescript --tailwind --app --src-dir
  ```
- [ ] Install core dependencies
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  npm install lightweight-charts
  npm install lucide-react
  npm install date-fns
  ```
- [ ] Install shadcn/ui
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button card table badge tabs dialog input toast
  ```
- [ ] Set up project structure
  ```
  signalight-web/
  ├── src/
  │   ├── app/
  │   │   ├── layout.tsx              # Root layout + Supabase provider
  │   │   ├── page.tsx                # Dashboard home
  │   │   ├── signals/
  │   │   │   └── page.tsx            # Signal history
  │   │   ├── watchlist/
  │   │   │   └── page.tsx            # Watchlist management
  │   │   ├── chart/
  │   │   │   └── [symbol]/
  │   │   │       └── page.tsx        # Per-symbol chart view
  │   │   └── settings/
  │   │       └── page.tsx            # Signal thresholds config
  │   ├── components/
  │   │   ├── layout/
  │   │   │   ├── Sidebar.tsx
  │   │   │   ├── Header.tsx
  │   │   │   └── MobileNav.tsx
  │   │   ├── dashboard/
  │   │   │   ├── MarketOverview.tsx   # Watchlist summary cards
  │   │   │   ├── SignalFeed.tsx       # Recent signals live feed
  │   │   │   ├── DrawdownGauge.tsx    # QQQ drawdown visual
  │   │   │   └── ScanStatus.tsx      # Engine health indicator
  │   │   ├── charts/
  │   │   │   ├── PriceChart.tsx       # TradingView Lightweight Chart
  │   │   │   ├── RSIChart.tsx         # RSI sub-chart
  │   │   │   └── IndicatorOverlay.tsx # MA, Bollinger overlays
  │   │   ├── signals/
  │   │   │   ├── SignalTable.tsx      # Signal history table
  │   │   │   ├── SignalCard.tsx       # Individual signal card
  │   │   │   └── SignalFilter.tsx     # Filter by symbol, type, date
  │   │   └── watchlist/
  │   │       ├── WatchlistTable.tsx   # Editable watchlist
  │   │       └── AddSymbolDialog.tsx  # Add symbol modal
  │   ├── lib/
  │   │   ├── supabase/
  │   │   │   ├── client.ts           # Browser client
  │   │   │   ├── server.ts           # Server client
  │   │   │   └── types.ts            # Generated DB types
  │   │   ├── tradingview.ts          # Chart config helpers
  │   │   └── utils.ts                # Formatters, helpers
  │   ├── hooks/
  │   │   ├── useSignals.ts           # Realtime signal subscription
  │   │   ├── useWatchlist.ts         # Watchlist CRUD
  │   │   └── useMarketData.ts        # Price + indicator data
  │   └── types/
  │       └── index.ts                # Shared TypeScript types
  ├── public/
  │   ├── manifest.json               # PWA manifest
  │   └── icons/                      # PWA icons
  ├── .env.local                      # Supabase URL + anon key
  └── package.json
  ```
- [ ] Configure environment variables (`.env.local`)
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  ```
- [ ] Initialize Git repo and commit

---

### Step 2: Supabase Setup (DB Migration from SQLite)

- [ ] Create Supabase project (free tier)
- [ ] Create tables matching signalight-engine schema
  ```sql
  -- Watchlist
  CREATE TABLE watchlist (
      id SERIAL PRIMARY KEY,
      symbol TEXT UNIQUE NOT NULL,
      name TEXT,
      added_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE,
      user_id UUID REFERENCES auth.users(id)
  );

  -- Signals
  CREATE TABLE signals (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT,
      indicator_snapshot JSONB,
      price_at_signal REAL,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Scan Log
  CREATE TABLE scan_log (
      id SERIAL PRIMARY KEY,
      scanned_at TIMESTAMPTZ DEFAULT NOW(),
      symbols_scanned INTEGER,
      signals_found INTEGER,
      errors TEXT
  );

  -- Signal Thresholds (user-configurable)
  CREATE TABLE signal_config (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      user_id UUID REFERENCES auth.users(id)
  );

  -- Indicator Snapshots (latest per symbol for dashboard)
  CREATE TABLE indicator_snapshots (
      id SERIAL PRIMARY KEY,
      symbol TEXT UNIQUE NOT NULL,
      indicators JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Enable Supabase Realtime on `signals` and `indicator_snapshots` tables
- [ ] Generate TypeScript types from Supabase schema
  ```bash
  npx supabase gen types typescript --project-id YOUR_PROJECT > src/lib/supabase/types.ts
  ```
- [ ] Update `signalight-engine` to write to Supabase instead of SQLite
  - Create `store_supabase.py` as a drop-in replacement for `store.py`
  - Switch via config flag: `DB_BACKEND=supabase` or `DB_BACKEND=sqlite`
- [ ] Seed initial watchlist data
- [ ] Test engine → Supabase → web data flow end-to-end

---

### Step 3: Dashboard Home Page

- [ ] Build `MarketOverview.tsx` — Watchlist summary cards
  ```
  ┌──────────────────────────────────────────────┐
  │  QQQ        $442.50   -1.2%   RSI 32.5 ⚠️    │
  │  TQQQ       $42.15    -3.8%   RSI 28.3 🔴    │
  │  QLD        $78.40    -2.1%   RSI 31.2 ⚠️    │
  │  SPYI       $51.20    +0.3%   RSI 45.1 ✅    │
  └──────────────────────────────────────────────┘
  ```
- [ ] Build `DrawdownGauge.tsx` — Visual QQQ drawdown meter
  - Show current drawdown percentage
  - Mark entry levels (-10%, -15%, -20%, -25%, -30%)
  - Highlight which levels have been hit
- [ ] Build `SignalFeed.tsx` — Live signal feed (Supabase Realtime)
  - New signals appear instantly without page refresh
  - Show timestamp, symbol, type, severity
  - Click to expand full indicator snapshot
- [ ] Build `ScanStatus.tsx` — Engine health check
  - Last scan time, next scan countdown
  - Error count, uptime
  - Green/yellow/red status indicator
- [ ] Implement responsive layout (desktop sidebar + mobile bottom nav)
- [ ] Add dark mode support (default dark, trader-friendly)

---

### Step 4: Chart Page (`/chart/[symbol]`)

- [ ] Integrate TradingView Lightweight Charts
  ```typescript
  import { createChart, CandlestickSeries } from 'lightweight-charts';
  ```
- [ ] Build `PriceChart.tsx` — Candlestick chart with:
  - [ ] Candlestick data from yfinance (via API route or Supabase)
  - [ ] MA20 line overlay (blue)
  - [ ] MA60 line overlay (orange)
  - [ ] Bollinger Bands overlay (gray area)
  - [ ] Volume bars at bottom
- [ ] Build `RSIChart.tsx` — RSI sub-chart
  - RSI line
  - Oversold (30) / Overbought (70) horizontal lines
  - Color zones (green below 30, red above 70)
- [ ] Build `IndicatorOverlay.tsx` — Indicator summary panel
  ```
  Price: $442.50          MA20: $450.23
  Change: -1.2%           MA60: $445.10
  Drawdown: -12.5%        RSI: 32.5
  ATH: $505.70            MACD: -2.3
  ```
- [ ] Add time range selector (1W, 1M, 3M, 6M, 1Y)
- [ ] Mark signal events on chart (vertical lines or markers)
- [ ] Make chart responsive (touch-friendly for mobile)

---

### Step 5: Signal History Page (`/signals`)

- [ ] Build `SignalTable.tsx` — Paginated signal history
  - Columns: Time, Symbol, Signal Type, Severity, Price, RSI, Drawdown
  - Sort by any column
  - Click row to expand full indicator snapshot
- [ ] Build `SignalFilter.tsx` — Filter controls
  - Filter by symbol (dropdown)
  - Filter by signal type (multi-select)
  - Filter by severity (INFO / WARNING / ACTION)
  - Date range picker
- [ ] Add export to CSV functionality
- [ ] Show signal statistics
  - Total signals by type (pie chart)
  - Signals per day (bar chart)
  - Most active symbols

---

### Step 6: Watchlist Management (`/watchlist`)

- [ ] Build `WatchlistTable.tsx` — Editable watchlist
  - Symbol, Name, Current Price, RSI, Status, Added Date
  - Toggle active/inactive
  - Delete with confirmation
- [ ] Build `AddSymbolDialog.tsx` — Add symbol modal
  - Search by ticker or company name
  - Validate symbol exists (yfinance lookup via API route)
  - Show preview (current price, basic info) before adding
- [ ] Sync watchlist changes with signalight-engine
  - Engine reads watchlist from Supabase on each scan cycle

---

### Step 7: Settings Page (`/settings`)

- [ ] Build signal threshold editor
  - MA periods (short, long)
  - RSI thresholds (oversold, overbought)
  - Scan interval
  - Cooldown period
- [ ] Build drawdown level editor
  - Add/edit/remove drawdown entry levels
  - Visual preview of levels on a drawdown scale
- [ ] Build notification preferences
  - Toggle Telegram alerts on/off
  - Toggle email alerts on/off (Phase 3)
  - Toggle Web Push on/off (Phase 3)
  - Quiet hours setting
- [ ] Save settings to Supabase `signal_config` table
- [ ] Engine reads config from Supabase (live config updates without restart)

---

### Step 8: API Routes

- [ ] `GET /api/market/[symbol]` — Fetch fresh price + indicators
  - Calls yfinance server-side, returns JSON
  - Cache with 1-minute TTL
- [ ] `GET /api/market/[symbol]/history` — OHLCV history for charts
  - Parameters: period (1M, 3M, 6M, 1Y)
  - Returns TradingView-compatible format
- [ ] `POST /api/scan` — Trigger manual scan (calls engine or runs inline)
- [ ] `GET /api/health` — Engine health check endpoint
- [ ] Add rate limiting to API routes

---

### Step 9: PWA Setup

- [ ] Install and configure `next-pwa`
  ```bash
  npm install next-pwa
  ```
- [ ] Create `manifest.json`
  ```json
  {
    "name": "Signalight",
    "short_name": "Signalight",
    "description": "Stock Signal Scanner",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0a0a0a",
    "theme_color": "#22c55e",
    "icons": [...]
  }
  ```
- [ ] Generate PWA icons (192x192, 512x512)
- [ ] Add install prompt banner for mobile users
- [ ] Test PWA install on Android and iOS
- [ ] Verify offline fallback page works

---

### Step 10: Deploy to Vercel

- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables in Vercel dashboard
- [ ] Set up custom domain (optional)
- [ ] Verify build and deploy succeeds
- [ ] Test on mobile (PWA install, responsiveness)
- [ ] Performance audit (Lighthouse score > 90)

---

## Phase 2 Success Criteria

- [ ] Dashboard loads in < 2 seconds
- [ ] New signals appear on dashboard within 3 seconds (Supabase Realtime)
- [ ] Charts render with MA, RSI, Bollinger overlays correctly
- [ ] Watchlist changes sync between web and engine
- [ ] Settings changes apply to engine without restart
- [ ] PWA installs on mobile and works like a native app
- [ ] Dark mode by default, responsive on all screen sizes
- [ ] Deployed on Vercel free tier

---
---

## Phase 3: AI News Analysis

### Step 1: News Data Pipeline

- [ ] Set up Finnhub API (free tier) for news feed
  ```
  FINNHUB_API_KEY=
  ```
- [ ] Add news fetcher to `signalight-engine`
  - `news.py` — Fetch news by symbol from Finnhub
  - Store raw articles in Supabase `news` table
  ```sql
  CREATE TABLE news (
      id SERIAL PRIMARY KEY,
      symbol TEXT,
      headline TEXT NOT NULL,
      source TEXT,
      url TEXT,
      published_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Schedule news fetch (every 30 minutes during market hours)

---

### Step 2: AI Analysis with Claude API

- [ ] Add Claude API integration to engine
  ```
  ANTHROPIC_API_KEY=
  ```
- [ ] Implement `analyst.py` — AI news analyzer
  - Send batch of recent news for a symbol to Claude API
  - Prompt for: sentiment (bullish/bearish/neutral), key themes, risk factors
  - Return structured analysis
- [ ] Store analysis results in Supabase
  ```sql
  CREATE TABLE news_analysis (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      sentiment TEXT,        -- bullish / bearish / neutral
      confidence REAL,       -- 0.0 to 1.0
      summary TEXT,
      key_themes JSONB,
      risk_factors JSONB,
      source_count INTEGER,
      analyzed_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Add combined signal: technical indicators + AI sentiment
  - e.g., RSI oversold + bullish news sentiment = stronger buy signal

---

### Step 3: News UI in Web Dashboard

- [ ] Build `/news` page — AI-analyzed news feed
- [ ] Build `SentimentBadge.tsx` — Bullish/Bearish/Neutral indicator
- [ ] Add sentiment indicator to dashboard `MarketOverview` cards
- [ ] Add news panel to chart page (`/chart/[symbol]`)
- [ ] Add Telegram command: `/news QQQ` — Latest AI analysis

---

### Step 4: Email Alerts

- [ ] Set up Resend (free tier, 3000 emails/month)
  ```
  RESEND_API_KEY=
  ```
- [ ] Implement email alert templates (HTML)
  - Signal alert email
  - Daily summary email
  - Weekly report email
- [ ] Add email preferences to settings page
- [ ] Add Telegram command: `/email on` / `/email off`

---

### Step 5: Web Push Notifications

- [ ] Implement Web Push via service worker (PWA)
- [ ] Add push notification permission prompt
- [ ] Send push for high-severity signals
- [ ] Add push preferences to settings page

---

## Phase 3 Success Criteria

- [ ] AI news analysis runs automatically for all watchlist symbols
- [ ] Sentiment displayed on dashboard and chart pages
- [ ] Combined technical + sentiment signals trigger correctly
- [ ] Email alerts arrive within 2 minutes of signal
- [ ] Web push works on mobile PWA
- [ ] Claude API cost stays under $10/month

---
---

## Phase 4: Multi-User & Distribution

### Step 1: Authentication

- [ ] Implement Supabase Auth (email + Google OAuth)
- [ ] Add login / signup pages
- [ ] Protect all routes with auth middleware
- [ ] Add Row Level Security (RLS) to all Supabase tables
  ```sql
  ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own watchlist"
      ON watchlist FOR SELECT USING (auth.uid() = user_id);
  ```
- [ ] Each user gets their own watchlist, settings, and signal history

---

### Step 2: Multi-User Engine

- [ ] Refactor engine to scan all users' watchlists
  - Deduplicate: if 10 users watch QQQ, fetch data only once
- [ ] Per-user signal evaluation (each user has own thresholds)
- [ ] Per-user notification routing (each user's Telegram/email)
- [ ] Add user management table
  ```sql
  CREATE TABLE user_settings (
      id SERIAL PRIMARY KEY,
      user_id UUID UNIQUE REFERENCES auth.users(id),
      telegram_chat_id TEXT,
      telegram_enabled BOOLEAN DEFAULT TRUE,
      email_enabled BOOLEAN DEFAULT FALSE,
      push_enabled BOOLEAN DEFAULT FALSE,
      scan_interval INTEGER DEFAULT 5,
      timezone TEXT DEFAULT 'Australia/Melbourne',
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

---

### Step 3: Cloud Deployment

- [ ] Migrate `signalight-engine` from WSL to cloud
  - Option A: Railway ($5/month Hobby)
  - Option B: Fly.io (free tier VM)
  - Option C: VPS (Hetzner, $4/month)
- [ ] Set up CI/CD pipeline (GitHub Actions)
  - Auto-deploy engine on push to `main`
  - Auto-deploy web via Vercel (already set up)
- [ ] Add health monitoring (UptimeRobot — free)
- [ ] Set up error alerting (Sentry — free tier)

---

### Step 4: Landing Page & Onboarding

- [ ] Build marketing landing page
  - Hero section with feature highlights
  - Screenshot / demo of dashboard
  - Pricing (free tier + premium)
  - Sign up CTA
- [ ] Build onboarding flow for new users
  - Connect Telegram bot
  - Add initial watchlist
  - Configure signal preferences
  - First scan tutorial
- [ ] Add usage limits for free tier
  - Max 5 symbols on watchlist
  - Max 10 scans/day
  - No AI news analysis
- [ ] Add premium tier
  - Unlimited symbols
  - Unlimited scans
  - AI news analysis
  - Email alerts
  - Priority support

---

### Step 5: Polish

- [ ] Add terms of service and privacy policy
- [ ] Add disclaimer (not financial advice)
- [ ] Performance optimization (DB indexes, query optimization)
- [ ] Load testing (simulate 100 concurrent users)
- [ ] Security audit (SQL injection, XSS, CSRF)
- [ ] Mobile UX review and polish

---

## Phase 4 Success Criteria

- [ ] Multiple users can sign up and use independently
- [ ] Each user's data is isolated (RLS enforced)
- [ ] Engine runs 24/7 on cloud without manual intervention
- [ ] Landing page converts visitors to signups
- [ ] Free and premium tiers work correctly
- [ ] System handles 100+ users without performance issues

---
---

## Claude Code Workflow Tips

When working with Claude Code on each step:

1. **Start each step** by telling Claude Code the current task:
   ```
   "Read signalight-web/Tasks.md Step 3 and build the dashboard home page"
   ```

2. **Component by component** — Build and test one component at a time:
   ```
   "Build the MarketOverview component with mock data first"
   ```

3. **Connect data last** — Build UI with mock data, then wire up Supabase:
   ```
   "Replace mock data in MarketOverview with real Supabase query"
   ```

4. **Mobile first** — Always check mobile layout:
   ```
   "Make the dashboard responsive, test at 375px width"
   ```
