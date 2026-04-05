"""Advanced Trading - 고급 거래"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from enum import Enum
from . import store
import json


class OrderType(Enum):
    """주문 타입"""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"
    TRAILING_STOP = "TRAILING_STOP"
    OCO = "OCO"  # One Cancels Other
    CONDITIONAL = "CONDITIONAL"
    BRACKET = "BRACKET"


class OrderStatus(Enum):
    """주문 상태"""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


def create_oco_order(
    user_id: str,
    symbol: str,
    quantity: int,
    primary_price: float,
    secondary_price: float,
    order_side: str = "BUY",  # BUY or SELL
    primary_type: str = "LIMIT",
    secondary_type: str = "STOP",
) -> Dict:
    """OCO (One Cancels Other) 주문 생성

    한 주문이 체결되면 다른 주문은 자동으로 취소됨
    예: 매수 후 이익 실현(LIMIT)이나 손절(STOP) 중 먼저 되는 것 체결
    """
    oco_id = f"OCO_{user_id}_{symbol}_{int(datetime.utcnow().timestamp())}"

    with store._connect() as conn:
        # Primary order (예: 이익 실현)
        conn.execute(
            """INSERT INTO orders
               (user_id, symbol, quantity, order_type, order_side, price, status,
                oco_id, parent_order_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                quantity,
                primary_type,
                order_side,
                primary_price,
                "ACTIVE",
                oco_id,
                None,
                datetime.utcnow().isoformat(),
            ),
        )

        # Secondary order (예: 손절)
        conn.execute(
            """INSERT INTO orders
               (user_id, symbol, quantity, order_type, order_side, price, status,
                oco_id, parent_order_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                quantity,
                secondary_type,
                order_side,
                secondary_price,
                "ACTIVE",
                oco_id,
                None,
                datetime.utcnow().isoformat(),
            ),
        )

        conn.commit()

    return {
        "oco_id": oco_id,
        "symbol": symbol,
        "quantity": quantity,
        "primary_order": {
            "type": primary_type,
            "price": primary_price,
            "description": "Take Profit",
        },
        "secondary_order": {
            "type": secondary_type,
            "price": secondary_price,
            "description": "Stop Loss",
        },
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    }


def create_conditional_order(
    user_id: str,
    symbol: str,
    quantity: int,
    order_price: float,
    trigger_symbol: str,
    trigger_price: float,
    trigger_condition: str = "ABOVE",  # ABOVE, BELOW, EQUALS
    order_side: str = "BUY",
    order_type: str = "LIMIT",
) -> Dict:
    """조건부 주문 생성

    특정 조건이 만족되면 주문 실행
    예: SPY가 450 이상이면 AAPL 매수
    """
    condition_id = f"COND_{user_id}_{symbol}_{int(datetime.utcnow().timestamp())}"

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO conditional_orders
               (user_id, symbol, quantity, order_price, order_type, order_side,
                trigger_symbol, trigger_price, trigger_condition, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                quantity,
                order_price,
                order_type,
                order_side,
                trigger_symbol.upper(),
                trigger_price,
                trigger_condition,
                "PENDING",
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    return {
        "condition_id": condition_id,
        "symbol": symbol,
        "quantity": quantity,
        "order_price": order_price,
        "order_type": order_type,
        "trigger_symbol": trigger_symbol,
        "trigger_price": trigger_price,
        "trigger_condition": trigger_condition,
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
    }


def create_bracket_order(
    user_id: str,
    symbol: str,
    quantity: int,
    entry_price: float,
    take_profit_price: float,
    stop_loss_price: float,
    order_side: str = "BUY",
) -> Dict:
    """괄호 주문 (Bracket Order)

    진입, 이익실현, 손절을 한 세트로 관리
    진입 후 이익실현이나 손절 중 하나 체결되면 나머지 자동 취소
    """
    bracket_id = f"BRACKET_{user_id}_{symbol}_{int(datetime.utcnow().timestamp())}"

    with store._connect() as conn:
        # Entry order
        conn.execute(
            """INSERT INTO orders
               (user_id, symbol, quantity, order_type, order_side, price, status,
                bracket_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                quantity,
                "LIMIT",
                order_side,
                entry_price,
                "ACTIVE",
                bracket_id,
                datetime.utcnow().isoformat(),
            ),
        )

        # Take profit order
        opposite_side = "SELL" if order_side == "BUY" else "BUY"
        conn.execute(
            """INSERT INTO orders
               (user_id, symbol, quantity, order_type, order_side, price, status,
                bracket_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                quantity,
                "LIMIT",
                opposite_side,
                take_profit_price,
                "PENDING",
                bracket_id,
                datetime.utcnow().isoformat(),
            ),
        )

        # Stop loss order
        conn.execute(
            """INSERT INTO orders
               (user_id, symbol, quantity, order_type, order_side, price, status,
                bracket_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                quantity,
                "STOP",
                opposite_side,
                stop_loss_price,
                "PENDING",
                bracket_id,
                datetime.utcnow().isoformat(),
            ),
        )

        conn.commit()

    return {
        "bracket_id": bracket_id,
        "symbol": symbol,
        "quantity": quantity,
        "entry_order": {
            "type": "LIMIT",
            "price": entry_price,
            "side": order_side,
        },
        "take_profit_order": {
            "type": "LIMIT",
            "price": take_profit_price,
            "side": opposite_side,
        },
        "stop_loss_order": {
            "type": "STOP",
            "price": stop_loss_price,
            "side": opposite_side,
        },
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    }


def create_scale_order(
    user_id: str,
    symbol: str,
    total_quantity: int,
    entry_prices: List[float],
    order_side: str = "BUY",
) -> Dict:
    """스케일 인/아웃 주문

    여러 단계에서 주문 실행
    예: 500주를 4단계로 나누어 매수
    """
    scale_id = f"SCALE_{user_id}_{symbol}_{int(datetime.utcnow().timestamp())}"
    qty_per_order = total_quantity // len(entry_prices)

    orders = []
    with store._connect() as conn:
        for i, price in enumerate(entry_prices):
            order_qty = qty_per_order if i < len(entry_prices) - 1 else (
                total_quantity - (qty_per_order * (len(entry_prices) - 1))
            )

            conn.execute(
                """INSERT INTO orders
                   (user_id, symbol, quantity, order_type, order_side, price, status,
                    scale_id, scale_step, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id,
                    symbol.upper(),
                    order_qty,
                    "LIMIT",
                    order_side,
                    price,
                    "PENDING" if i > 0 else "ACTIVE",
                    scale_id,
                    i + 1,
                    datetime.utcnow().isoformat(),
                ),
            )

            orders.append(
                {
                    "step": i + 1,
                    "quantity": order_qty,
                    "price": price,
                    "status": "PENDING" if i > 0 else "ACTIVE",
                }
            )

        conn.commit()

    return {
        "scale_id": scale_id,
        "symbol": symbol,
        "total_quantity": total_quantity,
        "num_steps": len(entry_prices),
        "orders": orders,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    }


def get_active_advanced_orders(user_id: str) -> Dict:
    """활성 고급 주문 조회"""
    with store._connect() as conn:
        # OCO orders
        oco_orders = conn.execute(
            """SELECT oco_id, symbol, quantity, price, status, created_at
               FROM orders
               WHERE user_id = ? AND oco_id IS NOT NULL AND status IN ('ACTIVE', 'PARTIALLY_FILLED')
               GROUP BY oco_id
               ORDER BY created_at DESC""",
            (user_id,),
        ).fetchall()

        # Conditional orders
        conditional_orders = conn.execute(
            """SELECT condition_id, symbol, quantity, trigger_symbol, trigger_price,
                      trigger_condition, status, created_at
               FROM conditional_orders
               WHERE user_id = ? AND status = 'PENDING'
               ORDER BY created_at DESC""",
            (user_id,),
        ).fetchall()

        # Bracket orders
        bracket_orders = conn.execute(
            """SELECT bracket_id, symbol, quantity, price, status, created_at
               FROM orders
               WHERE user_id = ? AND bracket_id IS NOT NULL
               GROUP BY bracket_id
               ORDER BY created_at DESC""",
            (user_id,),
        ).fetchall()

        # Scale orders
        scale_orders = conn.execute(
            """SELECT scale_id, symbol, SUM(quantity) as total_quantity,
                      COUNT(*) as num_steps, status, created_at
               FROM orders
               WHERE user_id = ? AND scale_id IS NOT NULL
               GROUP BY scale_id
               ORDER BY created_at DESC""",
            (user_id,),
        ).fetchall()

    return {
        "oco_orders": [
            {
                "oco_id": o[0],
                "symbol": o[1],
                "quantity": o[2],
                "price": o[3],
                "status": o[4],
                "created_at": o[5],
            }
            for o in oco_orders
        ],
        "conditional_orders": [
            {
                "condition_id": c[0],
                "symbol": c[1],
                "quantity": c[2],
                "trigger_symbol": c[3],
                "trigger_price": c[4],
                "trigger_condition": c[5],
                "status": c[6],
                "created_at": c[7],
            }
            for c in conditional_orders
        ],
        "bracket_orders": [
            {
                "bracket_id": b[0],
                "symbol": b[1],
                "quantity": b[2],
                "price": b[3],
                "status": b[4],
                "created_at": b[5],
            }
            for b in bracket_orders
        ],
        "scale_orders": [
            {
                "scale_id": s[0],
                "symbol": s[1],
                "total_quantity": s[2],
                "num_steps": s[3],
                "status": s[4],
                "created_at": s[5],
            }
            for s in scale_orders
        ],
    }


def cancel_oco_order(oco_id: str) -> bool:
    """OCO 주문 취소"""
    with store._connect() as conn:
        conn.execute(
            "UPDATE orders SET status = ? WHERE oco_id = ?",
            ("CANCELLED", oco_id),
        )
        conn.commit()

    return True


def cancel_conditional_order(condition_id: str) -> bool:
    """조건부 주문 취소"""
    with store._connect() as conn:
        conn.execute(
            "UPDATE conditional_orders SET status = ? WHERE condition_id = ?",
            ("CANCELLED", condition_id),
        )
        conn.commit()

    return True


def cancel_bracket_order(bracket_id: str) -> bool:
    """괄호 주문 취소"""
    with store._connect() as conn:
        conn.execute(
            "UPDATE orders SET status = ? WHERE bracket_id = ?",
            ("CANCELLED", bracket_id),
        )
        conn.commit()

    return True


def modify_oco_order(
    oco_id: str,
    new_primary_price: Optional[float] = None,
    new_secondary_price: Optional[float] = None,
) -> bool:
    """OCO 주문 수정"""
    with store._connect() as conn:
        if new_primary_price:
            conn.execute(
                "UPDATE orders SET price = ? WHERE oco_id = ? LIMIT 1",
                (new_primary_price, oco_id),
            )

        if new_secondary_price:
            # 두 번째 주문 수정 (OFFSET 1)
            conn.execute(
                """UPDATE orders SET price = ?
                   WHERE oco_id = ? AND rowid !=
                   (SELECT MIN(rowid) FROM orders WHERE oco_id = ?)""",
                (new_secondary_price, oco_id, oco_id),
            )

        conn.commit()

    return True


def get_order_recommendations(
    symbol: str,
    current_price: float,
    volatility: float,
    risk_tolerance: str = "MEDIUM",
) -> Dict:
    """고급 주문 전략 추천"""
    # 변동성 기반 가격 계산
    price_range = current_price * volatility

    if risk_tolerance == "CONSERVATIVE":
        tp_offset = price_range * 0.8
        sl_offset = price_range * 0.3
    elif risk_tolerance == "AGGRESSIVE":
        tp_offset = price_range * 1.5
        sl_offset = price_range * 0.15
    else:  # MEDIUM
        tp_offset = price_range * 1.0
        sl_offset = price_range * 0.25

    return {
        "symbol": symbol,
        "current_price": round(current_price, 2),
        "volatility": round(volatility * 100, 2),
        "recommendations": {
            "bracket_order": {
                "entry_price": round(current_price, 2),
                "take_profit": round(current_price + tp_offset, 2),
                "stop_loss": round(current_price - sl_offset, 2),
                "risk_reward_ratio": round((tp_offset / sl_offset), 2),
                "description": "균형잡힌 위험/수익 비율",
            },
            "oco_order": {
                "primary_price": round(current_price + tp_offset, 2),
                "secondary_price": round(current_price - sl_offset, 2),
                "description": "이익실현 또는 손절 자동 실행",
            },
            "scale_order": {
                "total_quantity": 100,
                "steps": 4,
                "prices": [
                    round(current_price - (price_range / 3) * i, 2) for i in range(1, 5)
                ],
                "description": "단계적 진입으로 리스크 분산",
            },
        },
        "risk_tolerance": risk_tolerance,
    }
