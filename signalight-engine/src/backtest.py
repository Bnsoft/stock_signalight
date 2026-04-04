"""Simple backtest engine for signal performance validation."""

import logging
from datetime import datetime, timedelta
import pandas as pd
from src.market import fetch_daily_data
from src.pulse import get_all_indicators
from src.trigger import evaluate_all_signals

logger = logging.getLogger(__name__)


def simple_backtest(symbol: str, days: int = 90) -> dict:
    """Run a simple backtest on recent signals."""
    try:
        # Fetch historical data
        df = fetch_daily_data(symbol, period="1y")
        if df.empty:
            return {"error": f"No data for {symbol}"}

        # Simulate scan: every day, check signals
        trades = []
        entry_price = None
        entry_date = None
        total_trades = 0
        winning_trades = 0

        for i in range(1, len(df)):
            prev_df = df.iloc[:i]
            curr_df = df.iloc[:i+1]

            indicators = get_all_indicators(curr_df)
            prev_indicators = get_all_indicators(prev_df) if len(prev_df) > 0 else {}

            signals = evaluate_all_signals(symbol, indicators, prev_indicators)

            # Simple entry: on first ACTION signal
            if signals and not entry_price:
                for sig in signals:
                    if sig.get("severity") == "ACTION":
                        entry_price = float(curr_df["close"].iloc[-1])
                        entry_date = curr_df.index[-1]
                        break

            # Exit: after 5 days OR on price movement
            if entry_price:
                curr_price = float(curr_df["close"].iloc[-1])
                days_held = (curr_df.index[-1] - entry_date).days

                # Exit conditions
                exit_reason = None
                if curr_price > entry_price * 1.05:  # 5% gain
                    exit_reason = "PROFIT_TARGET"
                elif curr_price < entry_price * 0.97:  # 3% loss
                    exit_reason = "STOP_LOSS"
                elif days_held >= 5:
                    exit_reason = "TIME_EXIT"

                if exit_reason:
                    pnl = curr_price - entry_price
                    roi_percent = (pnl / entry_price) * 100
                    total_trades += 1
                    if roi_percent > 0:
                        winning_trades += 1

                    trades.append({
                        "entry_date": entry_date.isoformat(),
                        "exit_date": curr_df.index[-1].isoformat(),
                        "entry_price": round(entry_price, 2),
                        "exit_price": round(curr_price, 2),
                        "pnl": round(pnl, 2),
                        "roi_percent": round(roi_percent, 2),
                        "exit_reason": exit_reason,
                    })

                    entry_price = None
                    entry_date = None

        # Calculate metrics
        start_date = df.index[0].strftime("%Y-%m-%d")
        end_date = df.index[-1].strftime("%Y-%m-%d")
        initial_capital = 10000
        final_capital = initial_capital + sum(t["pnl"] for t in trades)
        roi_percent = ((final_capital - initial_capital) / initial_capital) * 100
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

        # Max drawdown
        max_drawdown = 0
        cumulative_pnl = 0
        peak = 0
        for trade in trades:
            cumulative_pnl += trade["pnl"]
            if cumulative_pnl > peak:
                peak = cumulative_pnl
            drawdown = peak - cumulative_pnl
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        return {
            "symbol": symbol,
            "start_date": start_date,
            "end_date": end_date,
            "initial_capital": initial_capital,
            "final_capital": round(final_capital, 2),
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": total_trades - winning_trades,
            "win_rate_percent": round(win_rate, 2),
            "total_roi_percent": round(roi_percent, 2),
            "max_drawdown": round(max_drawdown, 2),
            "trades": trades[:20],  # Last 20 trades
        }

    except Exception as e:
        logger.error(f"Backtest failed for {symbol}: {e}")
        return {"error": str(e)}
