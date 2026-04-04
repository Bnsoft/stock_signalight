"""Portfolio management and analysis module"""

import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import numpy as np

from . import store


def add_position(
    user_id: str,
    symbol: str,
    quantity: float,
    entry_price: float,
    entry_date: Optional[str] = None,
    notes: str = "",
) -> dict:
    """Add a new position to portfolio."""
    with store._connect() as conn:
        cursor = conn.execute(
            """INSERT INTO positions
               (user_id, symbol, quantity, entry_price, current_price, entry_date, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                quantity,
                entry_price,
                entry_price,  # Initially same as entry
                entry_date or datetime.utcnow().isoformat(),
                notes,
            ),
        )
        pos_id = cursor.lastrowid

    return get_position(pos_id)


def get_position(position_id: int) -> dict:
    """Get position by ID."""
    with store._connect() as conn:
        row = conn.execute(
            "SELECT * FROM positions WHERE id = ?",
            (position_id,),
        ).fetchone()
        if row:
            return dict(row)
    return None


def get_user_positions(user_id: str) -> List[dict]:
    """Get all positions for a user."""
    with store._connect() as conn:
        rows = conn.execute(
            "SELECT * FROM positions WHERE user_id = ? ORDER BY symbol",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def update_position_price(position_id: int, current_price: float) -> dict:
    """Update current price of a position."""
    with store._connect() as conn:
        conn.execute(
            "UPDATE positions SET current_price = ?, updated_at = ? WHERE id = ?",
            (current_price, datetime.utcnow().isoformat(), position_id),
        )
    return get_position(position_id)


def delete_position(position_id: int) -> bool:
    """Delete a position."""
    with store._connect() as conn:
        result = conn.execute(
            "DELETE FROM positions WHERE id = ?",
            (position_id,),
        )
    return result.rowcount > 0


def calculate_portfolio_value(user_id: str) -> dict:
    """Calculate total portfolio value and metrics."""
    positions = get_user_positions(user_id)

    total_value = 0
    total_cost = 0
    positions_data = []

    for pos in positions:
        position_value = pos["quantity"] * pos["current_price"]
        position_cost = pos["quantity"] * pos["entry_price"]
        position_pnl = position_value - position_cost
        position_return = (position_pnl / position_cost * 100) if position_cost > 0 else 0

        total_value += position_value
        total_cost += position_cost

        positions_data.append({
            "id": pos["id"],
            "symbol": pos["symbol"],
            "quantity": pos["quantity"],
            "entry_price": pos["entry_price"],
            "current_price": pos["current_price"],
            "position_value": round(position_value, 2),
            "position_cost": round(position_cost, 2),
            "position_pnl": round(position_pnl, 2),
            "position_return": round(position_return, 2),
        })

    total_pnl = total_value - total_cost
    total_return = (total_pnl / total_cost * 100) if total_cost > 0 else 0

    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_pnl, 2),
        "total_return": round(total_return, 2),
        "positions_count": len(positions),
        "positions": positions_data,
    }


def save_portfolio_history(user_id: str, cash_balance: float = 0) -> dict:
    """Save daily portfolio snapshot."""
    portfolio = calculate_portfolio_value(user_id)

    # Get previous day's value for daily P&L
    with store._connect() as conn:
        prev = conn.execute(
            "SELECT total_value FROM portfolio_history WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()

        daily_pnl = 0
        daily_return = 0

        if prev:
            prev_value = prev[0]
            daily_pnl = portfolio["total_value"] - prev_value
            daily_return = (daily_pnl / prev_value * 100) if prev_value > 0 else 0

        conn.execute(
            """INSERT INTO portfolio_history
               (user_id, total_value, cash_balance, daily_pnl, daily_return)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, portfolio["total_value"], cash_balance, daily_pnl, daily_return),
        )

    return {
        "total_value": portfolio["total_value"],
        "daily_pnl": round(daily_pnl, 2),
        "daily_return": round(daily_return, 2),
    }


def get_portfolio_history(user_id: str, days: int = 90) -> List[dict]:
    """Get portfolio history for the last N days."""
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()

    with store._connect() as conn:
        rows = conn.execute(
            """SELECT * FROM portfolio_history
               WHERE user_id = ? AND recorded_at >= ?
               ORDER BY recorded_at ASC""",
            (user_id, since),
        ).fetchall()

    return [dict(row) for row in rows]


def calculate_sharpe_ratio(user_id: str, risk_free_rate: float = 0.02) -> float:
    """Calculate Sharpe Ratio."""
    history = get_portfolio_history(user_id, 365)

    if len(history) < 2:
        return 0

    returns = []
    for h in history:
        if h["daily_return"]:
            returns.append(h["daily_return"])

    if not returns:
        return 0

    mean_return = np.mean(returns)
    std_return = np.std(returns)

    if std_return == 0:
        return 0

    sharpe = (mean_return - (risk_free_rate * 100 / 252)) / std_return
    return round(sharpe, 2)


def calculate_max_drawdown(user_id: str) -> float:
    """Calculate maximum drawdown."""
    history = get_portfolio_history(user_id, 365)

    if not history:
        return 0

    values = [h["total_value"] for h in history]
    max_value = values[0]
    max_dd = 0

    for value in values:
        if value > max_value:
            max_value = value
        dd = (max_value - value) / max_value * 100
        if dd > max_dd:
            max_dd = dd

    return round(max_dd, 2)


def set_investment_goal(
    user_id: str,
    goal_name: str,
    target_amount: float,
    target_date: str,
) -> dict:
    """Create or update investment goal."""
    with store._connect() as conn:
        existing = conn.execute(
            "SELECT id FROM investment_goals WHERE user_id = ? AND goal_name = ?",
            (user_id, goal_name),
        ).fetchone()

        if existing:
            conn.execute(
                """UPDATE investment_goals
                   SET target_amount = ?, target_date = ?
                   WHERE user_id = ? AND goal_name = ?""",
                (target_amount, target_date, user_id, goal_name),
            )
            goal_id = existing[0]
        else:
            cursor = conn.execute(
                """INSERT INTO investment_goals
                   (user_id, goal_name, target_amount, target_date)
                   VALUES (?, ?, ?, ?)""",
                (user_id, goal_name, target_amount, target_date),
            )
            goal_id = cursor.lastrowid

    return get_investment_goal(goal_id)


def get_investment_goal(goal_id: int) -> dict:
    """Get goal by ID."""
    with store._connect() as conn:
        row = conn.execute(
            "SELECT * FROM investment_goals WHERE id = ?",
            (goal_id,),
        ).fetchone()
        if row:
            return dict(row)
    return None


def get_user_goals(user_id: str) -> List[dict]:
    """Get all goals for a user with progress."""
    portfolio = calculate_portfolio_value(user_id)
    current_value = portfolio["total_value"]

    with store._connect() as conn:
        rows = conn.execute(
            "SELECT * FROM investment_goals WHERE user_id = ? ORDER BY target_date",
            (user_id,),
        ).fetchall()

    goals = []
    for row in rows:
        goal = dict(row)
        progress = (current_value / goal["target_amount"] * 100) if goal["target_amount"] > 0 else 0
        goal["progress_percent"] = round(min(100, progress), 2)
        goal["days_remaining"] = (
            (datetime.fromisoformat(goal["target_date"]) - datetime.utcnow()).days
            if goal["target_date"]
            else 0
        )
        goals.append(goal)

    return goals


def get_required_roi_for_goal(user_id: str, goal_id: int) -> float:
    """Calculate required ROI to reach goal."""
    goal = get_investment_goal(goal_id)
    if not goal:
        return 0

    portfolio = calculate_portfolio_value(user_id)
    current = portfolio["total_value"]
    target = goal["target_amount"]

    if current <= 0 or target <= current:
        return 0

    days_remaining = max(1, goal["days_remaining"])
    years = days_remaining / 365

    if years <= 0:
        return 0

    required_roi = (pow(target / current, 1 / years) - 1) * 100
    return round(required_roi, 2)


def set_portfolio_target(
    user_id: str,
    symbol: str,
    target_percentage: float,
) -> dict:
    """Set target allocation for a symbol."""
    with store._connect() as conn:
        existing = conn.execute(
            "SELECT id FROM portfolio_targets WHERE user_id = ? AND symbol = ?",
            (user_id, symbol.upper()),
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE portfolio_targets SET target_percentage = ? WHERE id = ?",
                (target_percentage, existing[0]),
            )
        else:
            conn.execute(
                """INSERT INTO portfolio_targets
                   (user_id, symbol, target_percentage)
                   VALUES (?, ?, ?)""",
                (user_id, symbol.upper(), target_percentage),
            )

    return get_portfolio_targets(user_id)


def get_portfolio_targets(user_id: str) -> List[dict]:
    """Get target allocation."""
    with store._connect() as conn:
        rows = conn.execute(
            "SELECT * FROM portfolio_targets WHERE user_id = ? ORDER BY symbol",
            (user_id,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_rebalancing_suggestion(user_id: str) -> dict:
    """Get rebalancing suggestions based on targets."""
    portfolio = calculate_portfolio_value(user_id)
    targets = get_portfolio_targets(user_id)

    if not targets or portfolio["total_value"] == 0:
        return {"suggestion": None, "trades": []}

    total_value = portfolio["total_value"]
    current_allocation = {pos["symbol"]: (pos["position_value"] / total_value * 100) for pos in portfolio["positions"]}

    trades = []
    for target in targets:
        symbol = target["symbol"]
        target_pct = target["target_percentage"]
        current_pct = current_allocation.get(symbol, 0)
        diff_pct = target_pct - current_pct

        if abs(diff_pct) > 1:  # Only suggest if difference > 1%
            # Find current position to get price
            pos = next((p for p in portfolio["positions"] if p["symbol"] == symbol), None)
            if pos:
                current_price = pos["current_price"]
                target_value = total_value * (target_pct / 100)
                current_value = total_value * (current_pct / 100)
                value_diff = target_value - current_value
                quantity_diff = value_diff / current_price

                trades.append({
                    "symbol": symbol,
                    "current_pct": round(current_pct, 2),
                    "target_pct": target_pct,
                    "diff_pct": round(diff_pct, 2),
                    "action": "buy" if quantity_diff > 0 else "sell",
                    "quantity": round(abs(quantity_diff), 2),
                    "estimated_value": round(abs(value_diff), 2),
                })

    return {
        "total_value": total_value,
        "trades": trades,
        "total_trades": len(trades),
        "estimated_cost": round(sum(t["estimated_value"] for t in trades), 2),
    }


def record_rebalance(
    user_id: str,
    before_allocation: dict,
    after_allocation: dict,
    trades_executed: int,
    total_cost: float,
) -> dict:
    """Record a rebalancing action."""
    import json

    with store._connect() as conn:
        cursor = conn.execute(
            """INSERT INTO rebalance_history
               (user_id, rebalance_date, before_allocation, after_allocation, trades_executed, total_cost)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                datetime.utcnow().isoformat(),
                json.dumps(before_allocation),
                json.dumps(after_allocation),
                trades_executed,
                total_cost,
            ),
        )
        rebalance_id = cursor.lastrowid

    row = conn.execute(
        "SELECT * FROM rebalance_history WHERE id = ?",
        (rebalance_id,),
    ).fetchone()

    return dict(row) if row else None
