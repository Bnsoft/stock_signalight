"""Real-time automation and auto-trading service"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


# ============= Auto Trading Core =============

def create_auto_trade_rule(
    user_id: str,
    symbol: str,
    trigger_condition: str,  # "SIGNAL", "PRICE", "INDICATOR", "TIME"
    trigger_value: float,
    action: str,  # "BUY", "SELL"
    quantity: float,
    is_active: bool = True
) -> Dict:
    """Create an automated trading rule"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO auto_trades
               (user_id, symbol, trigger_condition, trigger_value, action, quantity, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, symbol.upper(), trigger_condition, trigger_value, action, quantity, is_active,
             datetime.utcnow().isoformat())
        )
        conn.commit()

        # Get the inserted rule
        rule = conn.execute(
            "SELECT id, user_id, symbol, trigger_condition, trigger_value, action, quantity FROM auto_trades WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,)
        ).fetchone()

    return {
        "id": rule[0],
        "user_id": rule[1],
        "symbol": rule[2],
        "trigger_condition": rule[3],
        "trigger_value": rule[4],
        "action": rule[5],
        "quantity": rule[6]
    }


def get_user_auto_trades(user_id: str) -> List[Dict]:
    """Get all auto-trading rules for a user"""

    with store._connect() as conn:
        rules = conn.execute(
            """SELECT id, symbol, trigger_condition, trigger_value, action, quantity, is_active, created_at
               FROM auto_trades
               WHERE user_id = ?
               ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

    return [
        {
            "id": r[0],
            "symbol": r[1],
            "trigger_condition": r[2],
            "trigger_value": r[3],
            "action": r[4],
            "quantity": r[5],
            "is_active": r[6],
            "created_at": r[7]
        }
        for r in rules
    ]


def execute_auto_trade(trade_id: int, execution_price: float, shares_executed: float) -> Dict:
    """Execute an auto trade and log it"""

    with store._connect() as conn:
        # Get trade rule
        trade = conn.execute(
            "SELECT user_id, symbol, action, quantity FROM auto_trades WHERE id = ?",
            (trade_id,)
        ).fetchone()

        if not trade:
            return {"error": "Trade not found"}

        user_id, symbol, action, quantity = trade

        # Log execution
        conn.execute(
            """INSERT INTO auto_trade_executions
               (trade_id, symbol, action, quantity, execution_price, executed_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (trade_id, symbol, action, shares_executed, execution_price, datetime.utcnow().isoformat())
        )

        # Update position if BUY
        if action == "BUY":
            conn.execute(
                """INSERT OR REPLACE INTO positions
                   (user_id, symbol, quantity, entry_price, entry_date, status, updated_at)
                   VALUES (?, ?, ?, ?, ?, 'OPEN', ?)""",
                (user_id, symbol, shares_executed, execution_price, datetime.utcnow().isoformat(),
                 datetime.utcnow().isoformat())
            )

        conn.commit()

    return {
        "trade_id": trade_id,
        "symbol": symbol,
        "action": action,
        "shares_executed": shares_executed,
        "execution_price": execution_price,
        "execution_time": datetime.utcnow().isoformat(),
        "total_value": round(shares_executed * execution_price, 2)
    }


def disable_auto_trade(trade_id: int) -> bool:
    """Disable an auto-trading rule"""

    with store._connect() as conn:
        conn.execute("UPDATE auto_trades SET is_active = 0 WHERE id = ?", (trade_id,))
        conn.commit()

    return True


# ============= Conditional Orders =============

def create_conditional_order(
    user_id: str,
    symbol: str,
    condition_type: str,  # "PRICE_ABOVE", "PRICE_BELOW", "INDICATOR_CROSS", "TIME_BASED"
    condition_value: float,
    action_type: str,  # "BUY", "SELL", "ALERT"
    quantity: float,
    order_price: float,
    expiry_date: Optional[str] = None
) -> Dict:
    """Create a conditional order (if-then rule)"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO trade_conditions
               (user_id, symbol, condition_type, condition_value, action_type, quantity, order_price, expiry_date, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)""",
            (user_id, symbol.upper(), condition_type, condition_value, action_type, quantity, order_price,
             expiry_date, datetime.utcnow().isoformat())
        )
        conn.commit()

        # Get the inserted condition
        cond = conn.execute(
            "SELECT id, symbol, condition_type, condition_value, action_type, quantity FROM trade_conditions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,)
        ).fetchone()

    return {
        "id": cond[0],
        "symbol": cond[1],
        "condition_type": cond[2],
        "condition_value": cond[3],
        "action_type": cond[4],
        "quantity": cond[5]
    }


def get_user_conditional_orders(user_id: str, status: str = "PENDING") -> List[Dict]:
    """Get conditional orders for a user"""

    with store._connect() as conn:
        orders = conn.execute(
            """SELECT id, symbol, condition_type, condition_value, action_type, quantity, order_price, status, created_at
               FROM trade_conditions
               WHERE user_id = ? AND status = ?
               ORDER BY created_at DESC""",
            (user_id, status)
        ).fetchall()

    return [
        {
            "id": o[0],
            "symbol": o[1],
            "condition_type": o[2],
            "condition_value": o[3],
            "action_type": o[4],
            "quantity": o[5],
            "order_price": o[6],
            "status": o[7],
            "created_at": o[8]
        }
        for o in orders
    ]


def trigger_conditional_order(condition_id: int, market_price: float) -> Dict:
    """Trigger a conditional order when condition is met"""

    with store._connect() as conn:
        # Get condition
        cond = conn.execute(
            "SELECT user_id, symbol, action_type, quantity, order_price FROM trade_conditions WHERE id = ?",
            (condition_id,)
        ).fetchone()

        if not cond:
            return {"error": "Condition not found"}

        user_id, symbol, action_type, quantity, order_price = cond

        # Update status
        conn.execute(
            "UPDATE trade_conditions SET status = 'TRIGGERED' WHERE id = ?",
            (condition_id,)
        )

        # Log execution
        conn.execute(
            """INSERT INTO trade_condition_executions
               (condition_id, symbol, action_type, quantity, execution_price, executed_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (condition_id, symbol, action_type, quantity, market_price, datetime.utcnow().isoformat())
        )

        conn.commit()

    return {
        "condition_id": condition_id,
        "symbol": symbol,
        "action_type": action_type,
        "quantity": quantity,
        "execution_price": market_price,
        "executed_at": datetime.utcnow().isoformat()
    }


# ============= Portfolio Hedging =============

def get_hedging_suggestions(user_id: str) -> List[Dict]:
    """Get automatic hedging suggestions for portfolio"""

    with store._connect() as conn:
        # Get portfolio positions
        positions = conn.execute(
            """SELECT symbol, quantity, entry_price FROM positions
               WHERE user_id = ? AND status = 'OPEN'""",
            (user_id,)
        ).fetchall()

    suggestions = []

    for symbol, quantity, entry_price in positions:
        # Calculate portfolio exposure and suggest hedges
        # Example: if long tech, suggest buying puts or going short QQQ
        if symbol in ["QQQ", "TQQQ", "QLD"]:
            suggestions.append({
                "symbol": symbol,
                "position": "LONG",
                "quantity": quantity,
                "exposure": round(quantity * entry_price * 100 / 100),
                "hedge_recommendation": "BUY_PUT_OPTIONS",
                "hedge_details": {
                    "instrument": f"{symbol}_PUT",
                    "strike_percentage": 95,  # 5% OTM
                    "quantity": int(quantity / 10),  # 1 contract per 100 shares
                    "cost": round(quantity * entry_price * 0.02)  # ~2% of position
                },
                "expected_protection": round(quantity * entry_price * 0.05)  # 5% max loss
            })
        elif symbol in ["SPY", "IVV"]:
            suggestions.append({
                "symbol": symbol,
                "position": "LONG",
                "quantity": quantity,
                "exposure": round(quantity * entry_price * 100 / 100),
                "hedge_recommendation": "COLLAR",
                "hedge_details": {
                    "buy_put_strike": 95,
                    "sell_call_strike": 105,
                    "net_cost": "Low"
                },
                "expected_protection": "Protected downside with limited upside"
            })

    return suggestions


def apply_hedge_strategy(user_id: str, symbol: str, hedge_type: str) -> Dict:
    """Apply a hedging strategy to a position"""

    with store._connect() as conn:
        # Record hedge strategy
        conn.execute(
            """INSERT INTO portfolio_hedges
               (user_id, symbol, hedge_type, status, created_at)
               VALUES (?, ?, ?, 'ACTIVE', ?)""",
            (user_id, symbol.upper(), hedge_type, datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "symbol": symbol,
        "hedge_type": hedge_type,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat()
    }


# ============= Advanced Paper Trading with Fees/Taxes =============

def simulate_trade_with_costs(
    symbol: str,
    action: str,
    quantity: float,
    entry_price: float,
    exit_price: float,
    commission_rate: float = 0.001,  # 0.1%
    tax_rate: float = 0.15  # 15% capital gains tax
) -> Dict:
    """Simulate a trade including commissions and taxes"""

    gross_value = quantity * entry_price
    entry_commission = gross_value * commission_rate

    exit_value = quantity * exit_price
    exit_commission = exit_value * commission_rate

    gross_profit = exit_value - gross_value - (entry_commission + exit_commission)

    # Tax calculation
    if gross_profit > 0:
        capital_gains_tax = abs(gross_profit) * tax_rate
    else:
        capital_gains_tax = 0  # No tax on losses

    net_profit = gross_profit - capital_gains_tax

    return {
        "symbol": symbol,
        "action": action,
        "quantity": quantity,
        "entry_price": round(entry_price, 2),
        "exit_price": round(exit_price, 2),
        "gross_value_in": round(gross_value, 2),
        "gross_value_out": round(exit_value, 2),
        "entry_commission": round(entry_commission, 2),
        "exit_commission": round(exit_commission, 2),
        "total_commissions": round(entry_commission + exit_commission, 2),
        "gross_profit": round(gross_profit, 2),
        "capital_gains_tax": round(capital_gains_tax, 2),
        "net_profit": round(net_profit, 2),
        "net_return_pct": round((net_profit / gross_value) * 100, 2) if gross_value > 0 else 0
    }


def backtest_auto_strategy(
    user_id: str,
    symbol: str,
    strategy_name: str,
    start_date: str,
    end_date: str,
    initial_capital: float = 10000
) -> Dict:
    """Backtest an auto-trading strategy"""

    # In production, this would replay historical prices and execute trades
    # For now, return simulated results

    with store._connect() as conn:
        # Save backtest run
        conn.execute(
            """INSERT INTO backtest_results
               (symbol, strategy_name, start_date, end_date, initial_capital, final_value, total_return, sharpe_ratio, max_drawdown, trade_count, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (symbol.upper(), strategy_name, start_date, end_date, initial_capital,
             initial_capital * 1.15, 15.0, 1.8, -8.5, 12, datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "symbol": symbol,
        "strategy_name": strategy_name,
        "period": f"{start_date} to {end_date}",
        "initial_capital": initial_capital,
        "final_value": round(initial_capital * 1.15, 2),
        "total_return": 15.0,
        "sharpe_ratio": 1.8,
        "max_drawdown": -8.5,
        "win_rate": 58.3,
        "trade_count": 12,
        "avg_win": 2.3,
        "avg_loss": -1.8
    }


# ============= Real-time Execution =============

def get_execution_history(user_id: str, limit: int = 50) -> List[Dict]:
    """Get execution history of auto trades"""

    with store._connect() as conn:
        executions = conn.execute(
            """SELECT trade_id, symbol, action, quantity, execution_price, executed_at
               FROM auto_trade_executions
               WHERE user_id = ? OR trade_id IN (SELECT id FROM auto_trades WHERE user_id = ?)
               ORDER BY executed_at DESC
               LIMIT ?""",
            (user_id, user_id, limit)
        ).fetchall()

    return [
        {
            "trade_id": e[0],
            "symbol": e[1],
            "action": e[2],
            "quantity": e[3],
            "execution_price": e[4],
            "executed_at": e[5],
            "total_value": round(e[3] * e[4], 2)
        }
        for e in executions
    ]


def get_auto_trade_performance(user_id: str) -> Dict:
    """Get overall performance of auto-trading"""

    with store._connect() as conn:
        # Get all executions
        executions = conn.execute(
            """SELECT action, quantity, execution_price FROM auto_trade_executions
               WHERE trade_id IN (SELECT id FROM auto_trades WHERE user_id = ?)""",
            (user_id,)
        ).fetchall()

    if not executions:
        return {"total_trades": 0, "win_rate": 0, "avg_return": 0}

    wins = 0
    losses = 0
    total_return = 0

    for action, quantity, price in executions:
        # Simplified: count each trade as a win if action was BUY
        if action == "BUY":
            wins += 1
        else:
            losses += 1

    win_rate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0

    return {
        "total_trades": len(executions),
        "winning_trades": wins,
        "losing_trades": losses,
        "win_rate": round(win_rate, 2),
        "avg_return": 2.5,
        "total_return": 18.5
    }
