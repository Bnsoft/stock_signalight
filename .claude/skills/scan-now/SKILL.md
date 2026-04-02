---
name: scan-now
description: Run a single dry-run scan of the Signalight engine and show results in the terminal. Useful for quickly checking current signal state without starting the full bot.
argument-hint: "[symbol] — optional, show indicators for a specific symbol"
---

Run a quick scan of the Signalight engine.

Steps:
1. `cd signalight-engine`
2. If $ARGUMENTS is a symbol (e.g. QQQ, SPY), run:
   ```
   uv run python -c "
   from src.store import init_db
   from src.market import fetch_daily_data
   from src.pulse import get_all_indicators
   init_db()
   df = fetch_daily_data('$ARGUMENTS', period='6mo')
   ind = get_all_indicators(df)
   for k, v in ind.items(): print(f'{k}: {v}')
   "
   ```
3. Otherwise run the full dry-run scan:
   ```
   uv run python -m src.app --once --dry-run
   ```
4. Show the output clearly to the user with a summary of any signals found.
