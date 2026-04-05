"""Risk management and VaR analysis module"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
import math
from . import store


# ============= Risk Limits =============

def set_daily_loss_limit(user_id: str, daily_loss_amount: float) -> Dict:
    """Set maximum daily loss limit"""

    with store._connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO risk_limits
               (user_id, limit_type, limit_value, created_at)
               VALUES (?, 'DAILY_LOSS', ?, ?)""",
            (user_id, daily_loss_amount, datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "limit_type": "DAILY_LOSS",
        "limit_value": daily_loss_amount
    }


def set_monthly_loss_limit(user_id: str, monthly_loss_amount: float) -> Dict:
    """Set maximum monthly loss limit"""

    with store._connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO risk_limits
               (user_id, limit_type, limit_value, created_at)
               VALUES (?, 'MONTHLY_LOSS', ?, ?)""",
            (user_id, monthly_loss_amount, datetime.utcnow().isoformat())
        )
        conn.commit()

    return {
        "user_id": user_id,
        "limit_type": "MONTHLY_LOSS",
        "limit_value": monthly_loss_amount
    }


def get_risk_limits(user_id: str) -> Dict:
    """Get user's risk limits"""

    with store._connect() as conn:
        limits = conn.execute(
            """SELECT limit_type, limit_value FROM risk_limits WHERE user_id = ?""",
            (user_id,)
        ).fetchall()

    return {
        "daily_loss": next((l[1] for l in limits if l[0] == "DAILY_LOSS"), None),
        "monthly_loss": next((l[1] for l in limits if l[0] == "MONTHLY_LOSS"), None)
    }


# ============= VaR (Value at Risk) Analysis =============

def calculate_var(user_id: str, confidence_level: float = 0.95) -> Dict:
    """Calculate Value at Risk for user's portfolio"""

    with store._connect() as conn:
        # Get portfolio value and historical returns
        history = conn.execute(
            """SELECT daily_return FROM portfolio_history
               WHERE user_id = ?
               ORDER BY recorded_at DESC
               LIMIT 100""",
            (user_id,)
        ).fetchall()

    if not history or len(history) < 10:
        return {"error": "Insufficient historical data"}

    returns = [h[0] for h in history if h[0] is not None]
    if not returns:
        return {"error": "No return data"}

    # Simple VaR calculation (historical method)
    returns.sort()
    var_index = max(0, int(len(returns) * (1 - confidence_level)) - 1)
    var_value = returns[var_index]

    # Get portfolio value
    portfolio = conn.execute(
        "SELECT total_value FROM portfolio_history WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1",
        (user_id,)
    ).fetchone()

    portfolio_value = portfolio[0] if portfolio else 10000

    return {
        "user_id": user_id,
        "confidence_level": confidence_level * 100,
        "var_percent": round(var_value * 100, 2),
        "var_amount": round(portfolio_value * var_value, 2),
        "portfolio_value": round(portfolio_value, 2),
        "interpretation": f"95% 신뢰도에서 포트폴리오는 다음 1일 동안 ${abs(round(portfolio_value * var_value, 2))} 이상 손실될 수 있습니다"
    }


def calculate_expected_shortfall(user_id: str, confidence_level: float = 0.95) -> Dict:
    """Calculate Expected Shortfall (Conditional VaR)"""

    with store._connect() as conn:
        history = conn.execute(
            """SELECT daily_return FROM portfolio_history
               WHERE user_id = ?
               ORDER BY recorded_at DESC
               LIMIT 100""",
            (user_id,)
        ).fetchall()

    if not history or len(history) < 10:
        return {"error": "Insufficient historical data"}

    returns = [h[0] for h in history if h[0] is not None]
    returns.sort()

    var_index = max(0, int(len(returns) * (1 - confidence_level)) - 1)
    worst_returns = returns[:var_index + 1]
    expected_shortfall = sum(worst_returns) / len(worst_returns) if worst_returns else returns[0]

    portfolio = conn.execute(
        "SELECT total_value FROM portfolio_history WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1",
        (user_id,)
    ).fetchone()

    portfolio_value = portfolio[0] if portfolio else 10000

    return {
        "user_id": user_id,
        "confidence_level": confidence_level * 100,
        "expected_shortfall_percent": round(expected_shortfall * 100, 2),
        "expected_shortfall_amount": round(portfolio_value * expected_shortfall, 2),
        "portfolio_value": round(portfolio_value, 2)
    }


# ============= Stop Loss Rules =============

def create_stop_loss_rule(
    user_id: str,
    symbol: str,
    stop_loss_percent: float,  # e.g., -5 for 5% loss
    take_profit_percent: float = None,  # e.g., 10 for 10% gain
    is_trailing: bool = False  # Trailing stop
) -> Dict:
    """Create stop loss rule for a position"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO stop_loss_rules
               (user_id, symbol, stop_loss_percent, take_profit_percent, is_trailing, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, 1, ?)""",
            (user_id, symbol.upper(), stop_loss_percent, take_profit_percent, 1 if is_trailing else 0,
             datetime.utcnow().isoformat())
        )
        conn.commit()

        rule = conn.execute(
            "SELECT id FROM stop_loss_rules ORDER BY id DESC LIMIT 1"
        ).fetchone()

    return {
        "id": rule[0],
        "symbol": symbol.upper(),
        "stop_loss_percent": stop_loss_percent,
        "take_profit_percent": take_profit_percent,
        "is_trailing": is_trailing
    }


def get_stop_loss_rules(user_id: str) -> List[Dict]:
    """Get stop loss rules for user"""

    with store._connect() as conn:
        rules = conn.execute(
            """SELECT id, symbol, stop_loss_percent, take_profit_percent, is_trailing, is_active
               FROM stop_loss_rules
               WHERE user_id = ?
               ORDER BY created_at DESC""",
            (user_id,)
        ).fetchall()

    return [
        {
            "id": r[0],
            "symbol": r[1],
            "stop_loss_percent": r[2],
            "take_profit_percent": r[3],
            "is_trailing": bool(r[4]),
            "is_active": bool(r[5])
        }
        for r in rules
    ]


def trigger_stop_loss(rule_id: int, current_price: float) -> Dict:
    """Trigger a stop loss order"""

    with store._connect() as conn:
        rule = conn.execute(
            "SELECT user_id, symbol, stop_loss_percent FROM stop_loss_rules WHERE id = ?",
            (rule_id,)
        ).fetchone()

        if not rule:
            return {"error": "Rule not found"}

        user_id, symbol, stop_loss_percent = rule

        # Log execution
        conn.execute(
            """INSERT INTO stop_loss_executions
               (rule_id, symbol, execution_price, executed_at)
               VALUES (?, ?, ?, ?)""",
            (rule_id, symbol, current_price, datetime.utcnow().isoformat())
        )

        # Update rule as inactive
        conn.execute("UPDATE stop_loss_rules SET is_active = 0 WHERE id = ?", (rule_id,))
        conn.commit()

    return {
        "rule_id": rule_id,
        "symbol": symbol,
        "execution_price": current_price,
        "executed_at": datetime.utcnow().isoformat()
    }


# ============= Position Sizing =============

def calculate_position_size(
    account_size: float,
    risk_percent: float,  # Risk percentage per trade (e.g., 2%)
    entry_price: float,
    stop_loss_price: float
) -> Dict:
    """Calculate optimal position size based on risk management"""

    risk_amount = account_size * (risk_percent / 100)
    price_difference = abs(entry_price - stop_loss_price)

    if price_difference == 0:
        return {"error": "Entry and stop loss prices cannot be equal"}

    shares = int(risk_amount / price_difference)
    position_cost = shares * entry_price

    return {
        "account_size": account_size,
        "risk_percent": risk_percent,
        "risk_amount": round(risk_amount, 2),
        "entry_price": entry_price,
        "stop_loss_price": stop_loss_price,
        "shares": shares,
        "position_cost": round(position_cost, 2),
        "risk_reward_ratio": round((entry_price - stop_loss_price) / price_difference, 2)
    }


# ============= Portfolio Risk Analysis =============

def analyze_portfolio_risk(user_id: str) -> Dict:
    """Analyze overall portfolio risk"""

    with store._connect() as conn:
        # Get positions
        positions = conn.execute(
            """SELECT symbol, quantity, entry_price FROM positions
               WHERE user_id = ? AND status = 'OPEN'""",
            (user_id,)
        ).fetchall()

        # Get portfolio value
        portfolio = conn.execute(
            """SELECT total_value, total_pnl FROM portfolio_history
               WHERE user_id = ?
               ORDER BY recorded_at DESC LIMIT 1""",
            (user_id,)
        ).fetchone()

    if not portfolio:
        return {"error": "No portfolio data"}

    portfolio_value, total_pnl = portfolio

    # Calculate concentration risk
    position_concentrations = []
    for symbol, quantity, entry_price in positions:
        position_value = quantity * entry_price
        concentration = (position_value / portfolio_value) * 100 if portfolio_value > 0 else 0
        position_concentrations.append({
            "symbol": symbol,
            "concentration_percent": round(concentration, 2)
        })

    max_concentration = max([p["concentration_percent"] for p in position_concentrations], default=0)

    # Risk score (0-100)
    risk_score = min(100, max_concentration * 2 + abs(total_pnl / portfolio_value * 100) if portfolio_value > 0 else 0)

    return {
        "user_id": user_id,
        "portfolio_value": round(portfolio_value, 2),
        "total_pnl": round(total_pnl, 2),
        "position_count": len(positions),
        "max_concentration": round(max_concentration, 2),
        "risk_score": round(risk_score, 1),
        "risk_level": "HIGH" if risk_score > 70 else "MEDIUM" if risk_score > 40 else "LOW",
        "concentration_by_position": position_concentrations[:5]  # Top 5
    }


def get_risk_summary(user_id: str) -> Dict:
    """Get comprehensive risk summary"""

    var_data = calculate_var(user_id)
    portfolio_risk = analyze_portfolio_risk(user_id)
    limits = get_risk_limits(user_id)

    return {
        "user_id": user_id,
        "var_percent": var_data.get("var_percent", "N/A"),
        "var_amount": var_data.get("var_amount", "N/A"),
        "portfolio_risk_level": portfolio_risk.get("risk_level", "UNKNOWN"),
        "portfolio_risk_score": portfolio_risk.get("risk_score", 0),
        "daily_loss_limit": limits.get("daily_loss"),
        "monthly_loss_limit": limits.get("monthly_loss"),
        "max_concentration": portfolio_risk.get("max_concentration", 0),
        "timestamp": datetime.utcnow().isoformat()
    }
