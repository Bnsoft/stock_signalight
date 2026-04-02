# Stock Signal Scanner — Phase 1 Tasks

## Project Overview
Build a Python-based stock signal scanner that runs locally on WSL, monitors ETFs/stocks for custom buy/sell signals using technical indicators (MA, RSI), and sends alerts via Telegram.

## Tech Stack
- **Runtime**: Python 3.12+ (managed via `uv`)
- **Data**: yfinance (free, no API key)
- **Indicators**: `ta` library (RSI, MA, MACD, etc.)
- **DB**: SQLite (local, zero config)
- **Alerts + Control**: Telegram Bot API (`python-telegram-bot`) — bidirectional
- **Scheduler**: `python-telegram-bot` built-in JobQueue (no extra library needed)
- **AI Tools**: Claude Code CLI for development

---

## Step 1: Project Setup

- [ ] Install `uv` on WSL
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- [ ] Initialize project
  ```bash
  uv init stock-signal-scanner
  cd stock-signal-scanner
  ```
- [ ] Add core dependencies
  ```bash
  uv add yfinance pandas ta python-telegram-bot python-dotenv aiosqlite
  ```
- [ ] Add dev dependencies
  ```bash
  uv add --dev pytest jupyter ruff
  ```
- [ ] Create project folder structure
  ```
  stock-signal-scanner/
  ├── pyproject.toml
  ├── .env                  # Telegram bot token, chat ID
  ├── .gitignore
  ├── src/
  │   ├── __init__.py
  │   ├── main.py           # Entry point + scheduler loop
  │   ├── config.py          # Watchlist, thresholds, settings
  │   ├── fetcher.py         # yfinance data fetcher
  │   ├── indicators.py      # RSI, MA, MACD calculations
  │   ├── signals.py         # Buy/sell signal logic
  │   ├── notifier.py        # Telegram alert sender (outbound)
  │   ├── bot_commands.py    # Telegram command handler (inbound)
  │   └── db.py              # SQLite signal history
  ├── data/
  │   └── signals.db         # Auto-created by db.py
  └── tests/
      ├── test_indicators.py
      ├── test_signals.py
      └── test_fetcher.py
  ```
- [ ] Initialize Git repo and commit

---

## Step 2: Config Module (`src/config.py`)

- [ ] Define watchlist with default ETFs
  ```python
  # Example structure:
  WATCHLIST = [
      {"symbol": "QQQ",  "name": "Invesco QQQ"},
      {"symbol": "TQQQ", "name": "ProShares UltraPro QQQ"},
      {"symbol": "QLD",  "name": "ProShares Ultra QQQ"},
      {"symbol": "SPYI", "name": "NEOS S&P 500 High Income"},
      {"symbol": "QQQI", "name": "NEOS Nasdaq-100 High Income"},
      {"symbol": "JEPQ", "name": "JPMorgan Nasdaq Equity Premium Income"},
      {"symbol": "SPY",  "name": "SPDR S&P 500"},
  ]
  ```
- [ ] Define signal thresholds (editable)
  ```python
  SIGNAL_CONFIG = {
      "ma_short": 20,        # Short-term MA period
      "ma_long": 60,         # Long-term MA period
      "rsi_period": 14,
      "rsi_oversold": 30,    # Buy signal threshold
      "rsi_overbought": 70,  # Sell signal threshold
      "scan_interval_minutes": 5,
  }
  ```
- [ ] Define QQQ drawdown-based entry levels
  ```python
  # Based on existing rebalancing strategy
  DRAWDOWN_LEVELS = [
      {"drawdown_pct": -10, "action": "Start buying QLD"},
      {"drawdown_pct": -15, "action": "Add TQQQ small position"},
      {"drawdown_pct": -20, "action": "Increase TQQQ allocation"},
      {"drawdown_pct": -25, "action": "Aggressive TQQQ entry"},
      {"drawdown_pct": -30, "action": "Max TQQQ allocation"},
  ]
  ```
- [ ] Load Telegram credentials from `.env`
- [ ] Add `.env.example` with placeholder values

---

## Step 3: Data Fetcher (`src/fetcher.py`)

- [ ] Implement `fetch_daily_data(symbol, period="6mo")` using yfinance
  - Returns DataFrame with OHLCV data
- [ ] Implement `fetch_current_price(symbol)` for latest price
- [ ] Implement `fetch_all_watchlist()` to batch-fetch all symbols
- [ ] Add error handling for network failures and invalid symbols
- [ ] Add retry logic (max 3 retries with backoff)
- [ ] Write unit tests (`tests/test_fetcher.py`)
  - Test with valid symbol (SPY)
  - Test with invalid symbol
  - Test DataFrame column structure

---

## Step 4: Technical Indicators (`src/indicators.py`)

- [ ] Implement `calculate_ma(df, period)` — Simple Moving Average
- [ ] Implement `calculate_ema(df, period)` — Exponential Moving Average
- [ ] Implement `calculate_rsi(df, period=14)` — Relative Strength Index
- [ ] Implement `calculate_macd(df)` — MACD + Signal line
- [ ] Implement `calculate_bollinger_bands(df, period=20)` — Bollinger Bands
- [ ] Implement `calculate_drawdown(df)` — Current drawdown from ATH
- [ ] Implement `get_all_indicators(df)` — Returns dict with all indicators
  ```python
  # Expected output:
  {
      "ma_20": 450.23,
      "ma_60": 445.10,
      "rsi_14": 32.5,
      "macd": -2.3,
      "macd_signal": -1.8,
      "bollinger_upper": 460.0,
      "bollinger_lower": 440.0,
      "drawdown_pct": -12.5,
      "current_price": 442.50,
      "ath": 505.70,
  }
  ```
- [ ] Write unit tests (`tests/test_indicators.py`)
  - Test RSI range (0-100)
  - Test MA calculation with known data
  - Test drawdown calculation accuracy

---

## Step 5: Signal Engine (`src/signals.py`)

- [ ] Define signal types enum
  ```python
  class SignalType(Enum):
      RSI_OVERSOLD = "RSI Oversold"
      RSI_OVERBOUGHT = "RSI Overbought"
      MA_GOLDEN_CROSS = "MA Golden Cross (20 > 60)"
      MA_DEATH_CROSS = "MA Death Cross (20 < 60)"
      DRAWDOWN_ENTRY = "QQQ Drawdown Entry Level"
      PRICE_BELOW_BOLLINGER = "Price Below Lower Bollinger"
  ```
- [ ] Implement `check_rsi_signals(indicators)` — Oversold/Overbought
- [ ] Implement `check_ma_crossover(indicators, prev_indicators)` — Golden/Death Cross
- [ ] Implement `check_drawdown_levels(indicators)` — QQQ drawdown-based entry
- [ ] Implement `check_bollinger_signals(indicators)` — Price outside bands
- [ ] Implement `evaluate_all_signals(symbol, indicators, prev_indicators)` — Master function
  - Returns list of triggered signals with severity (INFO / WARNING / ACTION)
- [ ] Add cooldown logic — Don't repeat same signal within 24 hours
- [ ] Write unit tests (`tests/test_signals.py`)
  - Test RSI oversold triggers at threshold
  - Test MA crossover detection
  - Test drawdown level matching
  - Test cooldown prevents duplicate alerts

---

## Step 6: SQLite Database (`src/db.py`)

- [ ] Create `signals` table
  ```sql
  CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT,
      indicator_snapshot JSON,   -- Store all indicator values at trigger time
      price_at_signal REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] Create `watchlist` table (supports /add and /remove from Telegram)
  ```sql
  CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      name TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      active INTEGER DEFAULT 1
  );
  ```
- [ ] Create `scan_log` table (track each scan run)
  ```sql
  CREATE TABLE IF NOT EXISTS scan_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      symbols_scanned INTEGER,
      signals_found INTEGER,
      errors TEXT
  );
  ```
- [ ] Implement `save_signal(signal_data)`
- [ ] Implement `get_recent_signals(hours=24)` — For cooldown check
- [ ] Implement `get_signal_history(symbol=None, days=30)` — For review
- [ ] Implement `log_scan(summary)` — Record each scan run
- [ ] Implement `add_to_watchlist(symbol, name)` — For /add command
- [ ] Implement `remove_from_watchlist(symbol)` — For /remove command
- [ ] Implement `get_watchlist()` — Returns active symbols
- [ ] Seed default watchlist from `config.py` on first run
- [ ] Initialize DB on first run (auto-create tables)

---

## Step 7: Telegram Bot — Outbound Alerts (`src/notifier.py`)

- [ ] Create Telegram Bot via @BotFather
  - Save bot token to `.env`
  - Get chat ID (send message to bot, then check updates API)
  - Document steps in README
- [ ] Implement `send_alert(signal)` — Single signal notification
  ```
  🚨 BUY SIGNAL: TQQQ
  ─────────────────
  Signal: RSI Oversold (28.3)
  Price: $42.15
  QQQ Drawdown: -18.2%
  MA20: $43.50 | MA60: $46.20
  RSI: 28.3
  ─────────────────
  🕐 2026-04-02 14:30 AEST
  ```
- [ ] Implement `send_summary(scan_results)` — Post-scan summary
  ```
  📊 Scan Complete — 7 symbols
  ✅ No signals triggered
  Next scan: 5 min
  ```
- [ ] Implement `send_daily_report(all_indicators)` — EOD summary of all watchlist
- [ ] Add message formatting with emojis and clean layout
- [ ] Handle Telegram API rate limits (max 30 msg/sec)
- [ ] Test with a real message to your Telegram

---

## Step 7b: Telegram Bot — Inbound Commands (`src/bot_commands.py`)

This module turns the Telegram bot into a two-way control interface.
You can send commands from your phone to control the scanner remotely.

- [ ] Set up `python-telegram-bot` Application with command handlers
  ```python
  from telegram.ext import Application, CommandHandler

  app = Application.builder().token(BOT_TOKEN).build()
  app.add_handler(CommandHandler("scan", cmd_scan))
  app.add_handler(CommandHandler("price", cmd_price))
  # ... register all handlers
  ```

- [ ] Implement `/scan` — Trigger immediate full scan
  ```
  User: /scan
  Bot:
  ⏳ Running scan...

  📊 Scan Complete — 7 symbols
  🚨 1 signal found:
  • TQQQ — RSI Oversold (28.3)
  ✅ 6 symbols clear
  ```

- [ ] Implement `/status` — Show scanner health
  ```
  User: /status
  Bot:
  🟢 Scanner Running
  ─────────────────
  Uptime: 4h 23m
  Last scan: 2 min ago
  Next scan: 3 min
  Symbols: 7
  Signals today: 2
  Errors today: 0
  ```

- [ ] Implement `/price <SYMBOL>` — Get current price + indicator snapshot
  ```
  User: /price QQQ
  Bot:
  📈 QQQ — Invesco QQQ
  ─────────────────
  Price: $442.50
  Change: -1.2% today
  ─────────────────
  MA20:  $450.23
  MA60:  $445.10
  RSI:   32.5 ⚠️ Near oversold
  MACD:  -2.3 (Signal: -1.8)
  ─────────────────
  Drawdown: -12.5% from ATH ($505.70)
  Bollinger: $440.00 — $460.00
  ```

- [ ] Implement `/signals` — Show recent signal history
  ```
  User: /signals
  Bot:
  📋 Signals — Last 24 Hours
  ─────────────────
  1. 🚨 TQQQ — RSI Oversold (28.3) @ $42.15
     → 14:30 AEST
  2. ⚠️ QQQ — Drawdown -15% entry level
     → 10:15 AEST
  ─────────────────
  Total: 2 signals
  ```

- [ ] Implement `/signals <SYMBOL>` — Filter signals by symbol
  ```
  User: /signals TQQQ
  Bot:
  📋 TQQQ Signals — Last 7 Days
  ─────────────────
  1. 🚨 RSI Oversold (28.3) @ $42.15 — Apr 2
  2. ⚠️ Price Below Bollinger @ $41.80 — Mar 30
  ─────────────────
  Total: 2 signals
  ```

- [ ] Implement `/watchlist` — Show current watchlist with status
  ```
  User: /watchlist
  Bot:
  👀 Watchlist (7 symbols)
  ─────────────────
  QQQ   $442.50  RSI 32.5 ⚠️
  TQQQ  $42.15   RSI 28.3 🔴
  QLD   $78.40   RSI 31.2 ⚠️
  SPYI  $51.20   RSI 45.1 ✅
  QQQI  $48.30   RSI 44.8 ✅
  JEPQ  $52.10   RSI 46.2 ✅
  SPY   $520.30  RSI 38.7 ✅
  ```

- [ ] Implement `/add <SYMBOL>` — Add symbol to watchlist
  ```
  User: /add AAPL
  Bot:
  ✅ Added AAPL (Apple Inc.) to watchlist
  Watchlist: 8 symbols
  ```

- [ ] Implement `/remove <SYMBOL>` — Remove symbol from watchlist
  ```
  User: /remove AAPL
  Bot:
  🗑️ Removed AAPL from watchlist
  Watchlist: 7 symbols
  ```

- [ ] Implement `/report` — Generate and send full daily report immediately
  ```
  User: /report
  Bot:
  📊 Full Report — 2026-04-02
  ─────────────────
  [Full indicator table for all symbols]
  [Active signals summary]
  [Drawdown levels status]
  ```

- [ ] Implement `/help` — Show all available commands
  ```
  User: /help
  Bot:
  🤖 Stock Signal Scanner
  ─────────────────
  /scan      — Run scan now
  /status    — Scanner health
  /price SYM — Price + indicators
  /signals   — Recent signals
  /watchlist — Current watchlist
  /add SYM   — Add symbol
  /remove SYM — Remove symbol
  /report    — Full daily report
  /help      — This message
  ```

- [ ] Add security: Only respond to your own chat ID (ignore strangers)
  ```python
  ALLOWED_CHAT_IDS = [int(os.getenv("TELEGRAM_CHAT_ID"))]

  async def check_auth(update):
      if update.effective_chat.id not in ALLOWED_CHAT_IDS:
          await update.message.reply_text("⛔ Unauthorized")
          return False
      return True
  ```

- [ ] Add error handling for invalid symbols in `/add` and `/price`
- [ ] Add confirmation prompt for `/remove`
- [ ] Test all commands from your phone

---

## Step 8: Main Scanner Loop (`src/main.py`)

- [ ] Implement main scan cycle
  ```python
  def run_scan():
      for symbol in WATCHLIST:
          data = fetch_daily_data(symbol)
          indicators = get_all_indicators(data)
          prev_indicators = get_previous_indicators(symbol)  # From last scan
          signals = evaluate_all_signals(symbol, indicators, prev_indicators)
          for signal in signals:
              save_signal(signal)
              send_alert(signal)
      log_scan(summary)
  ```
- [ ] Integrate Telegram bot + scheduler in one event loop
  ```python
  # The bot runs async (polling for commands),
  # while the scanner runs on a scheduled interval.
  # Use python-telegram-bot's JobQueue to combine both:

  app = Application.builder().token(BOT_TOKEN).build()

  # Register command handlers (from bot_commands.py)
  register_commands(app)

  # Register scheduled jobs
  app.job_queue.run_repeating(run_scan, interval=300)          # Every 5 min
  app.job_queue.run_daily(send_daily_report, time=time(16,30)) # 4:30 PM AEST

  # Single entry point — handles both commands and scheduled scans
  app.run_polling()
  ```
- [ ] Add graceful shutdown (Ctrl+C handler)
- [ ] Add startup message to Telegram ("Scanner started, monitoring X symbols")
- [ ] Add logging (file + console) with rotation
- [ ] Handle market hours awareness (skip scans on weekends / outside trading hours)

---

## Step 9: Testing & Validation

- [ ] Run all unit tests: `uv run pytest`
- [ ] Manual test: Run scanner once and verify Telegram alert arrives
- [ ] Test with forced signal (temporarily set RSI threshold to 50 to trigger)
- [ ] Verify SQLite data is being saved correctly
- [ ] Test error recovery (disconnect WiFi briefly, verify scanner resumes)
- [ ] Test all Telegram commands from your phone:
  - [ ] `/help` — Shows command list
  - [ ] `/scan` — Triggers scan and returns results
  - [ ] `/status` — Shows uptime and health
  - [ ] `/price QQQ` — Returns price + indicators
  - [ ] `/price INVALIDXYZ` — Returns error gracefully
  - [ ] `/signals` — Shows recent signal history
  - [ ] `/watchlist` — Shows all symbols with status
  - [ ] `/add AAPL` — Adds symbol, confirm with `/watchlist`
  - [ ] `/remove AAPL` — Removes symbol, confirm with `/watchlist`
  - [ ] `/report` — Generates full report
- [ ] Test auth: Send command from a different Telegram account → should be rejected
- [ ] Run scanner for 1 full trading day and review logs

---

## Step 10: Polish & Documentation

- [ ] Write `README.md`
  - Project overview
  - Setup instructions (uv install, Telegram bot setup)
  - Configuration guide (how to add symbols, change thresholds)
  - How to run
- [ ] Add `--once` flag to run single scan (useful for testing)
- [ ] Add `--dry-run` flag (calculate signals but don't send alerts)
- [ ] Clean up code: run `uv run ruff check --fix .`
- [ ] Final Git commit

---

## Claude Code Workflow Tips

When working with Claude Code on each step:

1. **Start each step** by telling Claude Code the current task:
   ```
   "Read Tasks.md Step 3 and implement the data fetcher module"
   ```

2. **Test incrementally** — Ask Claude Code to run tests after each module:
   ```
   "Run the tests for the fetcher module and fix any failures"
   ```

3. **Use Jupyter for prototyping** — Before coding a module, try the logic interactively:
   ```
   "Open a Jupyter notebook and test fetching QQQ data with yfinance, then calculate RSI"
   ```

4. **Iterate on signal logic** — The signal rules are the core value. Refine them:
   ```
   "Add a new signal: alert when TQQQ RSI < 30 AND QQQ drawdown > 15%"
   ```

---

## Success Criteria for Phase 1

- [ ] Scanner runs continuously on WSL without crashes
- [ ] Correctly calculates MA20, MA60, RSI for all watchlist symbols
- [ ] Sends Telegram alert within 1 minute of signal trigger
- [ ] No duplicate alerts for same signal within 24 hours
- [ ] QQQ drawdown-based entry levels match existing rebalancing strategy
- [ ] Signal history is queryable from SQLite
- [ ] Can add/remove symbols via Telegram (`/add`, `/remove`) without touching code
- [ ] Can check any symbol's price and indicators from phone (`/price`)
- [ ] Can trigger on-demand scan from phone (`/scan`)
- [ ] Only authorized user (your chat ID) can control the bot
- [ ] Scanner + bot run as a single process (no separate services to manage)
