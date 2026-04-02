---
name: review-signal
description: Review signal detection logic in trigger.py and related tests. Use when adding, modifying, or debugging signal rules (RSI, MA crossover, Bollinger, drawdown, volume).
argument-hint: "[signal type or description]"
---

Review the signal engine for the Signalight project.

Steps:
1. Read `signalight-engine/src/trigger.py` — understand all existing signal checks
2. Read `signalight-engine/src/pulse.py` — check what indicators are available
3. Read `signalight-engine/tests/test_trigger.py` — review current test coverage
4. Read `signalight-engine/src/config.py` — check current thresholds

If $ARGUMENTS is provided, focus the review on that specific signal type or area.

Then report:
- What signals are currently implemented and how they work
- Any edge cases or logic gaps
- Whether test coverage is sufficient
- Specific suggestions for improvement if $ARGUMENTS describes a change
