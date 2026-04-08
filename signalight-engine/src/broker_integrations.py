"""Broker Integrations - Broker connections (Interactive Brokers, Alpaca, TD Ameritrade)"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from enum import Enum
from . import store
import json


class BrokerType(Enum):
    """Broker type"""
    IB = "INTERACTIVE_BROKERS"  # Interactive Brokers
    ALPACA = "ALPACA"  # Alpaca
    TD = "TD_AMERITRADE"  # TD Ameritrade
    PAPER = "PAPER_TRADING"  # Paper trading


class OrderStatus(Enum):
    """Order status"""
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"


def connect_broker(
    user_id: str,
    broker_type: str,
    api_key: str,
    api_secret: str,
    account_id: Optional[str] = None,
) -> Dict:
    """Connect to broker"""
    connection_id = f"CONN_{user_id}_{broker_type}_{int(datetime.utcnow().timestamp())}"

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO broker_connections
               (user_id, broker_type, connection_id, api_key, api_secret,
                account_id, is_active, connected_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                broker_type,
                connection_id,
                api_key,  # In production this should be stored encrypted
                api_secret,
                account_id,
                1,
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    return {
        "connection_id": connection_id,
        "broker_type": broker_type,
        "status": "CONNECTED",
        "connected_at": datetime.utcnow().isoformat(),
    }


def get_broker_account(user_id: str, broker_type: str) -> Dict:
    """Retrieve broker account information"""
    if broker_type == "INTERACTIVE_BROKERS":
        return {
            "broker": "Interactive Brokers",
            "account_id": "DU123456",
            "account_type": "INDIVIDUAL",
            "buying_power": 50000.00,
            "available_funds": 45000.00,
            "cash_balance": 25000.00,
            "total_equity": 150000.00,
            "margin_requirement": 5000.00,
            "portfolio_value": 125000.00,
            "margin_excess": 44000.00,
        }
    elif broker_type == "ALPACA":
        return {
            "broker": "Alpaca",
            "account_id": "PA123456789",
            "account_type": "INDIVIDUAL",
            "buying_power": 40000.00,
            "available_funds": 35000.00,
            "cash_balance": 20000.00,
            "total_equity": 120000.00,
            "portfolio_value": 100000.00,
            "daytrade_buying_power": 80000.00,
            "daytrade_count": 2,
        }
    else:  # TD AMERITRADE
        return {
            "broker": "TD Ameritrade",
            "account_id": "123456789",
            "account_type": "MARGIN",
            "buying_power": 60000.00,
            "available_funds": 55000.00,
            "cash_balance": 30000.00,
            "total_equity": 180000.00,
            "margin_balance": 0,
            "margin_requirement": 0,
            "portfolio_value": 150000.00,
        }


def place_live_order(
    user_id: str,
    broker_type: str,
    symbol: str,
    order_type: str,
    quantity: int,
    price: Optional[float] = None,
    stop_price: Optional[float] = None,
    order_side: str = "BUY",
    time_in_force: str = "DAY",
) -> Dict:
    """Submit an order to the live exchange"""
    broker_order_id = f"{broker_type}_{symbol}_{int(datetime.utcnow().timestamp() * 1000)}"

    # Broker-specific live API call (simulation)
    broker_response = {
        "order_id": broker_order_id,
        "symbol": symbol,
        "quantity": quantity,
        "order_type": order_type,
        "order_side": order_side,
        "price": price,
        "stop_price": stop_price,
        "time_in_force": time_in_force,
        "status": "SUBMITTED",
        "submitted_at": datetime.utcnow().isoformat(),
        "filled_quantity": 0,
        "average_filled_price": 0,
    }

    # Save to DB
    with store._connect() as conn:
        conn.execute(
            """INSERT INTO broker_orders
               (user_id, broker_type, broker_order_id, symbol, quantity, order_type,
                order_side, price, stop_price, status, time_in_force, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                broker_type,
                broker_order_id,
                symbol.upper(),
                quantity,
                order_type,
                order_side,
                price,
                stop_price,
                "SUBMITTED",
                time_in_force,
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    return broker_response


def cancel_live_order(user_id: str, broker_type: str, broker_order_id: str) -> bool:
    """Cancel a live exchange order"""
    with store._connect() as conn:
        conn.execute(
            """UPDATE broker_orders SET status = ?
               WHERE broker_order_id = ? AND user_id = ?""",
            ("CANCELLED", broker_order_id, user_id),
        )
        conn.commit()

    return True


def get_live_positions(user_id: str, broker_type: str) -> List[Dict]:
    """Retrieve live exchange positions"""
    # Simulation data
    positions = [
        {
            "symbol": "SPY",
            "quantity": 100,
            "average_cost": 450.25,
            "current_price": 452.50,
            "market_value": 45250.00,
            "unrealized_gain": 225.00,
            "unrealized_gain_percent": 0.50,
            "account_percentage": 30.2,
        },
        {
            "symbol": "QQQ",
            "quantity": 50,
            "average_cost": 380.00,
            "current_price": 385.50,
            "market_value": 19275.00,
            "unrealized_gain": 275.00,
            "unrealized_gain_percent": 1.45,
            "account_percentage": 12.9,
        },
        {
            "symbol": "AAPL",
            "quantity": 75,
            "average_cost": 170.50,
            "current_price": 175.25,
            "market_value": 13143.75,
            "unrealized_gain": 356.25,
            "unrealized_gain_percent": 2.79,
            "account_percentage": 8.8,
        },
    ]

    return positions


def get_live_orders(user_id: str, broker_type: str, status: Optional[str] = None) -> List[Dict]:
    """Retrieve live exchange orders"""
    with store._connect() as conn:
        query = """SELECT broker_order_id, symbol, quantity, order_type, order_side,
                          price, status, created_at, filled_quantity, average_filled_price
                   FROM broker_orders
                   WHERE user_id = ? AND broker_type = ?"""
        params = [user_id, broker_type]

        if status:
            query += " AND status = ?"
            params.append(status)

        orders = conn.execute(query, params).fetchall()

    return [
        {
            "broker_order_id": o[0],
            "symbol": o[1],
            "quantity": o[2],
            "order_type": o[3],
            "order_side": o[4],
            "price": o[5],
            "status": o[6],
            "created_at": o[7],
            "filled_quantity": o[8],
            "average_filled_price": o[9],
        }
        for o in orders
    ]


def get_order_history(
    user_id: str,
    broker_type: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
) -> List[Dict]:
    """Retrieve order history"""
    with store._connect() as conn:
        query = """SELECT broker_order_id, symbol, quantity, order_type, order_side,
                          price, status, created_at, filled_quantity, average_filled_price
                   FROM broker_orders
                   WHERE user_id = ? AND broker_type = ?"""
        params = [user_id, broker_type]

        if start_date:
            query += " AND created_at >= ?"
            params.append(start_date)

        if end_date:
            query += " AND created_at <= ?"
            params.append(end_date)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        orders = conn.execute(query, params).fetchall()

    return [
        {
            "broker_order_id": o[0],
            "symbol": o[1],
            "quantity": o[2],
            "order_type": o[3],
            "order_side": o[4],
            "price": o[5],
            "status": o[6],
            "created_at": o[7],
            "filled_quantity": o[8],
            "average_filled_price": o[9],
        }
        for o in orders
    ]


def get_live_trades(user_id: str, broker_type: str, limit: int = 50) -> List[Dict]:
    """Retrieve filled trades"""
    trades = [
        {
            "trade_id": "T001",
            "symbol": "SPY",
            "quantity": 50,
            "order_side": "BUY",
            "filled_price": 450.25,
            "filled_quantity": 50,
            "fill_time": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "commission": 0.00,
            "execution_venue": "ISLAND",
        },
        {
            "trade_id": "T002",
            "symbol": "QQQ",
            "quantity": 25,
            "order_side": "BUY",
            "filled_price": 380.00,
            "filled_quantity": 25,
            "fill_time": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "commission": 0.00,
            "execution_venue": "NASDAQ",
        },
        {
            "trade_id": "T003",
            "symbol": "AAPL",
            "quantity": 75,
            "order_side": "BUY",
            "filled_price": 170.50,
            "filled_quantity": 75,
            "fill_time": (datetime.utcnow() - timedelta(minutes=30)).isoformat(),
            "commission": 0.00,
            "execution_venue": "NASDAQ",
        },
    ]

    return trades[:limit]


def sync_broker_data(user_id: str, broker_type: str) -> Dict:
    """Synchronize broker data"""
    account = get_broker_account(user_id, broker_type)
    positions = get_live_positions(user_id, broker_type)
    orders = get_live_orders(user_id, broker_type)
    trades = get_live_trades(user_id, broker_type)

    # Sync to DB
    with store._connect() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO broker_sync_history
               (user_id, broker_type, account_data, positions, orders, trades, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                broker_type,
                json.dumps(account),
                json.dumps(positions),
                json.dumps(orders),
                json.dumps(trades),
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    return {
        "user_id": user_id,
        "broker_type": broker_type,
        "synced_at": datetime.utcnow().isoformat(),
        "account": account,
        "positions_count": len(positions),
        "orders_count": len(orders),
        "trades_count": len(trades),
    }


def get_broker_market_data(broker_type: str, symbol: str) -> Dict:
    """Retrieve market data from broker"""
    # Fetch real-time data via each broker's API
    return {
        "symbol": symbol,
        "broker": broker_type,
        "last_price": 450.25,
        "bid": 450.20,
        "ask": 450.30,
        "bid_size": 1000,
        "ask_size": 1500,
        "volume": 5000000,
        "last_update": datetime.utcnow().isoformat(),
    }


def calculate_portfolio_performance(user_id: str, broker_type: str) -> Dict:
    """Calculate portfolio performance"""
    positions = get_live_positions(user_id, broker_type)
    account = get_broker_account(user_id, broker_type)

    total_value = sum(p["market_value"] for p in positions)
    total_gain = sum(p["unrealized_gain"] for p in positions)
    gain_percent = (total_gain / total_value * 100) if total_value > 0 else 0

    return {
        "broker": broker_type,
        "total_portfolio_value": account["total_equity"],
        "positions_value": total_value,
        "cash_balance": account["cash_balance"],
        "total_unrealized_gain": round(total_gain, 2),
        "total_unrealized_gain_percent": round(gain_percent, 2),
        "buying_power": account["buying_power"],
        "available_funds": account["available_funds"],
        "positions_count": len(positions),
    }


def get_broker_commissions(broker_type: str) -> Dict:
    """Broker commission information"""
    commissions = {
        "INTERACTIVE_BROKERS": {
            "stocks": 0.001,
            "min_per_order": 1.0,
            "options": 0.65,
            "futures": 0.85,
            "forex": 0.00002,
        },
        "ALPACA": {
            "stocks": 0.0,
            "options": 0.0,
            "futures": "not_available",
        },
        "TD_AMERITRADE": {
            "stocks": 0.0,
            "options": 0.0,
            "futures": 0.0,
        },
    }

    return commissions.get(broker_type, {})


def validate_broker_order(
    symbol: str,
    quantity: int,
    price: Optional[float],
    available_buying_power: float,
) -> Tuple[bool, str]:
    """Validate order parameters"""
    if quantity <= 0:
        return False, "수량은 0보다 커야 합니다"

    if price and price <= 0:
        return False, "가격은 0보다 커야 합니다"

    if price:
        required_capital = quantity * price
        if required_capital > available_buying_power:
            return False, f"자금 부족: ${required_capital:.2f} 필요 (가용: ${available_buying_power:.2f})"

    return True, "주문이 유효합니다"
