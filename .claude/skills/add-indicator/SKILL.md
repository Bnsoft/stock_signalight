---
name: add-indicator
description: Add a new technical indicator to pulse.py (the indicator calculation module). Use when the user wants to add a new indicator like OBV, VWAP, ATR, Stochastic, volume-based signals, etc.
argument-hint: "<indicator name and description>"
---

Add a new technical indicator to the Signalight engine.

The user wants to add: $ARGUMENTS

Steps:
1. Read `signalight-engine/src/pulse.py` — understand the existing pattern for indicators
2. Read `signalight-engine/src/config.py` — check if new config params are needed
3. Read `signalight-engine/tests/test_pulse.py` — understand the test pattern

Then:
1. Implement the new indicator function in `signalight-engine/src/pulse.py`
   - Follow the existing pattern: accept a DataFrame, return float | None or dict | None
   - Use the `ta` library where possible
   - Add the new indicator to `get_all_indicators()` return dict
2. Add the new config parameter to `signalight-engine/src/config.py` if needed
3. Write tests in `signalight-engine/tests/test_pulse.py`
4. Run tests: `cd signalight-engine && uv run pytest tests/test_pulse.py -v`

If the indicator should also trigger signals, ask the user before modifying `trigger.py`.
