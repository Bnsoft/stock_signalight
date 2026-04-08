"""Broker Integration Routes - Broker integration API routes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from . import broker_integrations
from . import data_export

router = APIRouter(prefix="/api/broker", tags=["broker"])


@router.get("/connections/{user_id}")
async def get_broker_connections(user_id: str):
    """Retrieve list of broker connections"""
    try:
        from . import store
        with store._connect() as conn:
            connections = conn.execute(
                """SELECT id, broker_type, account_id, is_active, connected_at
                   FROM broker_connections
                   WHERE user_id = ?""",
                (user_id,),
            ).fetchall()

        return {
            "connections": [
                {
                    "id": c[0],
                    "broker": c[1],
                    "account_id": c[2],
                    "status": "CONNECTED" if c[3] else "DISCONNECTED",
                    "connected_at": c[4],
                }
                for c in connections
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect")
async def connect_broker(data: dict):
    """Create a new broker connection"""
    try:
        result = broker_integrations.connect_broker(
            user_id=data.get("user_id"),
            broker_type=data.get("broker_type"),
            api_key=data.get("api_key"),
            api_secret=data.get("api_secret"),
            account_id=data.get("account_id"),
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/accounts/{user_id}")
async def get_broker_accounts(user_id: str):
    """Retrieve broker account information"""
    try:
        # Mock data for now - in production, fetch from actual brokers
        accounts = [
            broker_integrations.get_broker_account(user_id, "INTERACTIVE_BROKERS"),
            broker_integrations.get_broker_account(user_id, "ALPACA"),
            broker_integrations.get_broker_account(user_id, "TD_AMERITRADE"),
        ]
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/{user_id}")
async def get_positions(user_id: str, broker_type: Optional[str] = Query(None)):
    """Retrieve broker positions"""
    try:
        if broker_type:
            positions = broker_integrations.get_live_positions(user_id, broker_type)
        else:
            positions = broker_integrations.get_live_positions(user_id, "ALPACA")
        return {"positions": positions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/{user_id}")
async def get_orders(user_id: str, broker_type: Optional[str] = Query(None), status: Optional[str] = Query(None)):
    """Retrieve broker orders"""
    try:
        if broker_type:
            orders = broker_integrations.get_live_orders(user_id, broker_type, status)
        else:
            orders = broker_integrations.get_live_orders(user_id, "ALPACA", status)
        return {"orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades/{user_id}")
async def get_trades(user_id: str, broker_type: Optional[str] = Query(None)):
    """Retrieve broker trade history"""
    try:
        if broker_type:
            trades = broker_integrations.get_live_trades(user_id, broker_type)
        else:
            trades = broker_integrations.get_live_trades(user_id, "ALPACA")
        return {"trades": trades}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/place")
async def place_order(data: dict):
    """Place a new order"""
    try:
        result = broker_integrations.place_live_order(
            user_id=data.get("user_id"),
            broker_type=data.get("broker_type"),
            symbol=data.get("symbol"),
            order_type=data.get("order_type"),
            quantity=data.get("quantity"),
            price=data.get("price"),
            stop_price=data.get("stop_price"),
            order_side=data.get("order_side", "BUY"),
            time_in_force=data.get("time_in_force", "DAY"),
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/{broker_order_id}/cancel")
async def cancel_order(broker_order_id: str, data: dict):
    """Cancel an existing order"""
    try:
        result = broker_integrations.cancel_live_order(
            user_id=data.get("user_id"),
            broker_type=data.get("broker_type"),
            broker_order_id=broker_order_id,
        )
        return {"success": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance/{user_id}")
async def get_performance(user_id: str, broker_type: Optional[str] = Query(None)):
    """Calculate portfolio performance"""
    try:
        if broker_type:
            performance = broker_integrations.calculate_portfolio_performance(user_id, broker_type)
        else:
            performance = broker_integrations.calculate_portfolio_performance(user_id, "ALPACA")
        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/{user_id}")
async def sync_broker_data(user_id: str, broker_type: Optional[str] = Query(None)):
    """Synchronize broker data"""
    try:
        if broker_type:
            result = broker_integrations.sync_broker_data(user_id, broker_type)
        else:
            result = broker_integrations.sync_broker_data(user_id, "ALPACA")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
