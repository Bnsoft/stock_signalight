"""FastAPI server for web dashboard integration"""

from datetime import datetime, timedelta
from typing import Optional
import asyncio

from fastapi import FastAPI, HTTPException, WebSocket, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Signalight API", version="0.1.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection helper
from . import store as db_store


@app.get("/health")
async def health():
    """헬스체크"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/signals")
async def get_signals(
    symbol: Optional[str] = None,
    signal_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """최근 신호 조회

    Args:
        symbol: 특정 심볼만 조회 (e.g., "QQQ")
        signal_type: 신호 타입으로 필터링 (e.g., "ACTION", "WARNING")
        limit: 반환 개수 (기본 100)
        offset: 스킵 개수 (페이지네이션)
    """
    try:
        conn = db_store._connect()
        cursor = conn.cursor()

        # 필터링과 함께 신호 조회
        query = "SELECT id, timestamp, symbol, signal_type, severity, message FROM signals WHERE 1=1"
        params = []

        if symbol:
            query += " AND symbol = ?"
            params.append(symbol)

        if signal_type:
            query += " AND signal_type = ?"
            params.append(signal_type)

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        signals = [
            {
                "id": row[0],
                "timestamp": row[1],
                "symbol": row[2],
                "signal_type": row[3],
                "severity": row[4],
                "message": row[5],
            }
            for row in rows
        ]

        return {"signals": signals, "count": len(signals), "limit": limit, "offset": offset}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/candles")
async def get_candles(
    symbol: str,
    period: str = "1D",
    limit: int = 60,
):
    """캔들 데이터 조회

    Args:
        symbol: 종목 심볼 (e.g., "QQQ")
        period: 기간 (1D, 1W, 1M, etc.)
        limit: 캔들 개수 (기본 60)
    """
    from .market import fetch_daily_data

    try:
        # 기간을 yfinance 형식으로 변환
        period_map = {"1D": "1d", "1W": "1wk", "1M": "1mo"}
        yf_period = period_map.get(period, "1d")

        # 캔들 데이터 fetch (동기 호출)
        df = fetch_daily_data(symbol, period=yf_period)
        df = df.tail(limit)

        candles = [
            {
                "time": int(idx.timestamp()),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"]),
            }
            for idx, row in df.iterrows()
        ]

        return {"symbol": symbol, "period": period, "candles": candles}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/indicators")
async def get_indicators(symbol: str):
    """최신 인디케이터 값 조회

    Args:
        symbol: 종목 심볼
    """
    # TODO: 실제 인디케이터 계산 및 캐싱 구현
    from .market import fetch_daily_data
    from .pulse import get_all_indicators

    try:
        df = await fetch_daily_data(symbol, limit=100)
        indicators = get_all_indicators(df)

        return {
            "symbol": symbol,
            "timestamp": datetime.utcnow().isoformat(),
            "indicators": indicators,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/watchlist")
async def get_watchlist():
    """워치리스트 조회"""
    try:
        conn = db_store._connect()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT symbol FROM watchlist WHERE active = 1 ORDER BY symbol"
        )
        rows = cursor.fetchall()
        symbols = [row[0] for row in rows]
        conn.close()

        return {"symbols": symbols, "count": len(symbols)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket connections manager
connected_clients: list[WebSocket] = []


@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    """WebSocket 엔드포인트 — 실시간 신호 스트림."""
    await websocket.accept()
    connected_clients.append(websocket)

    try:
        # 클라이언트는 연결을 유지하고 서버에서 메시지를 대기
        while True:
            # 주기적으로 최신 신호를 전송 (매 10초)
            try:
                conn = db_store._connect()
                cursor = conn.cursor()

                # 최근 5개 신호 조회
                cursor.execute(
                    "SELECT id, timestamp, symbol, signal_type, severity, message FROM signals ORDER BY timestamp DESC LIMIT 5"
                )
                rows = cursor.fetchall()
                conn.close()

                signals = [
                    {
                        "id": row[0],
                        "timestamp": row[1],
                        "symbol": row[2],
                        "signal_type": row[3],
                        "severity": row[4],
                        "message": row[5],
                    }
                    for row in rows
                ]

                await websocket.send_json({"signals": signals})
            except Exception:
                pass

            await asyncio.sleep(10)  # 10초마다 업데이트

    except Exception:
        pass
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)


async def broadcast_signal(signal: dict):
    """새 신호를 모든 연결된 클라이언트에 브로드캐스트."""
    for client in connected_clients:
        try:
            await client.send_json({"new_signal": signal})
        except Exception:
            pass


@app.get("/api/signal-stats")
async def get_signal_stats(symbol: Optional[str] = None):
    """신호별 성과 통계 조회"""
    try:
        stats = db_store.get_signal_performance_stats(symbol)

        # 딕셔너리를 리스트로 변환
        stats_list = [
            {
                "signal_type": sig_type,
                **values
            }
            for sig_type, values in stats.items()
        ]

        return {"stats": stats_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/indicator-stats")
async def get_indicator_stats(indicator_name: Optional[str] = None):
    """인디케이터별 정확도 조회"""
    try:
        stats = db_store.get_indicator_accuracy(indicator_name)
        return {"stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtest-results")
async def get_backtest_results(symbol: Optional[str] = None, limit: int = 10):
    """백테스트 결과 조회"""
    try:
        results = db_store.get_backtest_results(symbol, limit)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtest-run")
async def run_backtest(symbol: str, days: int = 90):
    """새로운 백테스트 실행"""
    from .backtest import simple_backtest

    try:
        result = simple_backtest(symbol, days)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Simple in-memory cache (TTL-based)
_cache: dict[str, tuple[any, float]] = {}
CACHE_TTL = 300  # 5 minutes


def _cache_get(key: str) -> any:
    """Get value from cache if not expired."""
    if key in _cache:
        value, timestamp = _cache[key]
        if datetime.utcnow().timestamp() - timestamp < CACHE_TTL:
            return value
        else:
            del _cache[key]
    return None


def _cache_set(key: str, value: any):
    """Set value in cache with timestamp."""
    _cache[key] = (value, datetime.utcnow().timestamp())


@app.get("/api/export-stats")
async def export_stats(symbol: Optional[str] = None, format: str = "json"):
    """신호 통계 내보내기 (JSON/CSV)"""
    try:
        # Cache check
        cache_key = f"stats_export_{symbol}_{format}"
        cached = _cache_get(cache_key)
        if cached:
            return cached

        stats = db_store.get_signal_performance_stats(symbol)

        if format == "json":
            result = {"stats": stats}
            _cache_set(cache_key, result)
            return result
        elif format == "csv":
            # CSV format: signal_type,total,wins,losses,win_rate
            rows = ["signal_type,total,wins,losses,win_rate"]
            for sig_type, values in stats.items():
                rows.append(
                    f"{sig_type},{values['total']},{values['wins']},{values['losses']},{values['win_rate']}"
                )
            csv_content = "\n".join(rows)
            return {"csv": csv_content, "filename": f"signal-stats-{symbol or 'all'}.csv"}
        else:
            raise HTTPException(status_code=400, detail="Invalid format")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Notification Settings =============
notification_prefs: dict = {}


@app.post("/api/notification-settings")
async def update_notification_settings(user_id: str, prefs: dict):
    """사용자 알림 설정 업데이트."""
    notification_prefs[user_id] = prefs
    return {"status": "ok", "user_id": user_id}


@app.get("/api/notification-settings")
async def get_notification_settings(user_id: str):
    """사용자 알림 설정 조회."""
    return {"settings": notification_prefs.get(user_id, {})}


@app.post("/api/test-notification")
async def test_notification(channel: str, user_id: str = "default"):
    """알림 채널 테스트."""
    from .notifier import notify_all_channels

    prefs = notification_prefs.get(user_id, {})
    if channel == "all":
        results = await notify_all_channels(
            "Test Signal",
            "QQQ",
            "INFO",
            "This is a test notification",
            590.0,
            prefs,
        )
    else:
        results = {channel: True}  # Simplified

    return {"results": results}


# ============= Phase 6: User Settings =============
user_preferences: dict = {}


@app.post("/api/user-settings")
async def save_user_settings(user_id: str, settings: dict):
    """사용자 설정 저장."""
    user_preferences[user_id] = settings
    return {"status": "ok"}


@app.get("/api/user-settings")
async def get_user_settings(user_id: str = "default"):
    """사용자 설정 조회."""
    return {"settings": user_preferences.get(user_id, {})}


# ============= Phase 7: Paper Trading =============
paper_trades: dict = {}


@app.post("/api/paper-trade")
async def create_paper_trade(user_id: str, symbol: str, quantity: int, entry_price: float):
    """종이 거래 진입."""
    trade_id = f"{user_id}_{symbol}_{datetime.utcnow().timestamp()}"
    paper_trades[trade_id] = {
        "symbol": symbol,
        "quantity": quantity,
        "entry_price": entry_price,
        "entry_time": datetime.utcnow().isoformat(),
        "status": "OPEN",
    }
    return {"trade_id": trade_id, "status": "ok"}


@app.get("/api/paper-trades")
async def get_paper_trades(user_id: str = "default"):
    """종이 거래 조회."""
    trades = [t for tid, t in paper_trades.items() if tid.startswith(user_id)]
    return {"trades": trades, "count": len(trades)}


# ============= Phase 8: Sector Heatmap =============
@app.get("/api/sector-heatmap")
async def get_sector_heatmap():
    """섹터별 성과 열량도."""
    sectors = {
        "Technology": {"QQQ": 2.5, "TQQQ": 5.2, "QQQI": 1.8},
        "Broad": {"SPY": 1.2, "SPYI": 2.1},
        "Growth": {"QLD": 3.1},
    }
    return {"sectors": sectors}


@app.get("/api/correlation-matrix")
async def get_correlation_matrix():
    """심볼 상관관계 매트릭스."""
    symbols = ["QQQ", "SPY", "TQQQ", "QLD"]
    correlation = {
        "QQQ": {"QQQ": 1.0, "SPY": 0.85, "TQQQ": 0.95, "QLD": 0.92},
        "SPY": {"QQQ": 0.85, "SPY": 1.0, "TQQQ": 0.80, "QLD": 0.82},
        "TQQQ": {"QQQ": 0.95, "SPY": 0.80, "TQQQ": 1.0, "QLD": 0.90},
        "QLD": {"QQQ": 0.92, "SPY": 0.82, "TQQQ": 0.90, "QLD": 1.0},
    }
    return {"symbols": symbols, "correlation": correlation}


# ============= Phase 9: Authentication =============

class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    token: str


@app.post("/auth/signup")
async def signup(req: SignupRequest):
    """Register a new user with email and password."""
    from . import auth
    try:
        result = auth.register_user(req.email, req.password, req.display_name)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login")
async def login(req: LoginRequest):
    """Login with email and password."""
    from . import auth
    try:
        result = auth.login_user(req.email, req.password)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/guest")
async def create_guest():
    """Create a guest session (no registration required)."""
    from . import auth
    try:
        result = auth.create_guest_user()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/google")
async def google_login(req: GoogleLoginRequest):
    """Login/register via Google OAuth."""
    from . import auth
    try:
        result = auth.google_login(req.token)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/verify")
async def verify_token(token: str):
    """Verify JWT token and return user info."""
    from . import auth
    try:
        user_id = auth.verify_access_token(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = db_store.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        prefs = db_store.get_user_preferences(user_id)

        return {
            "user_id": user["id"],
            "email": user.get("email"),
            "display_name": user["display_name"],
            "auth_method": user["auth_method"],
            "preferences": prefs,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= User Settings & Preferences =============

class UpdatePreferencesRequest(BaseModel):
    theme: Optional[str] = None
    notification_email: Optional[bool] = None
    subscription_plan: Optional[str] = None


@app.get("/api/user/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile and preferences."""
    try:
        user = db_store.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        prefs = db_store.get_user_preferences(user_id)

        return {
            "user": {
                "id": user["id"],
                "email": user.get("email"),
                "display_name": user["display_name"],
                "auth_method": user["auth_method"],
                "created_at": user["created_at"],
            },
            "preferences": prefs,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/{user_id}/preferences")
async def update_user_preferences(user_id: str, req: UpdatePreferencesRequest):
    """Update user preferences."""
    try:
        prefs = db_store.update_user_preferences(user_id, **req.dict(exclude_unset=True))
        if not prefs:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "ok", "preferences": prefs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Profit Calculator =============

class CalculationRequest(BaseModel):
    principal: float
    period_months: int
    target_roi: float
    is_compound: bool = True
    tax_rate: float = 0


@app.post("/api/calculate")
async def calculate_profit(user_id: str, req: CalculationRequest):
    """Calculate expected profit with tax considerations."""
    try:
        # Calculation logic
        principal = req.principal
        period_years = req.period_months / 12
        roi_rate = req.target_roi / 100

        if req.is_compound:
            final_value = principal * ((1 + roi_rate) ** period_years)
        else:
            final_value = principal * (1 + roi_rate * period_years)

        gross_profit = final_value - principal
        tax_amount = gross_profit * (req.tax_rate / 100)
        net_profit = gross_profit - tax_amount
        after_tax_roi = (net_profit / principal) * 100 if principal > 0 else 0

        # Save calculation
        calc = db_store.save_calculation(
            user_id=user_id,
            principal=principal,
            period_months=req.period_months,
            target_roi=req.target_roi,
            final_value=final_value,
            net_profit=net_profit,
            tax_amount=tax_amount,
            after_tax_roi=after_tax_roi,
            is_compound=req.is_compound,
            tax_rate=req.tax_rate,
        )

        return {
            "calculation_id": calc["id"],
            "principal": principal,
            "final_value": round(final_value, 2),
            "gross_profit": round(gross_profit, 2),
            "tax_amount": round(tax_amount, 2),
            "net_profit": round(net_profit, 2),
            "after_tax_roi": round(after_tax_roi, 2),
            "period_months": req.period_months,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/calculations")
async def get_user_calculations(user_id: str, limit: int = 50):
    """Get user's calculation history."""
    try:
        calcs = db_store.get_user_calculations(user_id, limit)
        return {"calculations": calcs, "count": len(calcs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase 10: Portfolio & Performance =============

class PositionRequest(BaseModel):
    symbol: str
    quantity: float
    entry_price: float
    entry_date: Optional[str] = None
    notes: Optional[str] = None


class GoalRequest(BaseModel):
    goal_name: str
    target_amount: float
    target_date: str


class TargetRequest(BaseModel):
    symbol: str
    target_percentage: float


@app.post("/api/portfolio/positions")
async def add_position(user_id: str, req: PositionRequest):
    """Add a position to portfolio."""
    from . import portfolio
    try:
        pos = portfolio.add_position(
            user_id=user_id,
            symbol=req.symbol,
            quantity=req.quantity,
            entry_price=req.entry_price,
            entry_date=req.entry_date,
            notes=req.notes or "",
        )
        return {"status": "ok", "position": pos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/{user_id}")
async def get_portfolio(user_id: str):
    """Get portfolio overview."""
    from . import portfolio
    try:
        portfolio_data = portfolio.calculate_portfolio_value(user_id)
        sharpe = portfolio.calculate_sharpe_ratio(user_id)
        max_dd = portfolio.calculate_max_drawdown(user_id)

        return {
            **portfolio_data,
            "sharpe_ratio": sharpe,
            "max_drawdown": max_dd,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/{user_id}/history")
async def get_portfolio_history(user_id: str, days: int = 90):
    """Get portfolio history."""
    from . import portfolio
    try:
        history = portfolio.get_portfolio_history(user_id, days)
        return {"history": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/portfolio/positions/{position_id}")
async def delete_position(position_id: int):
    """Delete a position."""
    from . import portfolio
    try:
        success = portfolio.delete_position(position_id)
        return {"status": "ok" if success else "not_found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/portfolio/positions/{position_id}/price")
async def update_position_price(position_id: int, current_price: float):
    """Update position current price."""
    from . import portfolio
    try:
        pos = portfolio.update_position_price(position_id, current_price)
        return {"status": "ok", "position": pos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/performance/{user_id}/metrics")
async def get_performance_metrics(user_id: str):
    """Get performance metrics."""
    from . import portfolio
    try:
        data = portfolio.calculate_portfolio_value(user_id)
        history = portfolio.get_portfolio_history(user_id, 365)

        monthly_returns = {}
        for h in history:
            month = h["recorded_at"][:7]  # YYYY-MM
            if month not in monthly_returns:
                monthly_returns[month] = {"pnl": 0, "count": 0}
            if h["daily_return"]:
                monthly_returns[month]["pnl"] += h["daily_return"]
                monthly_returns[month]["count"] += 1

        return {
            "total_value": data["total_value"],
            "total_return": data["total_return"],
            "sharpe_ratio": portfolio.calculate_sharpe_ratio(user_id),
            "max_drawdown": portfolio.calculate_max_drawdown(user_id),
            "monthly_returns": monthly_returns,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/goals")
async def create_goal(user_id: str, req: GoalRequest):
    """Create investment goal."""
    from . import portfolio
    try:
        goal = portfolio.set_investment_goal(
            user_id=user_id,
            goal_name=req.goal_name,
            target_amount=req.target_amount,
            target_date=req.target_date,
        )
        return {"status": "ok", "goal": goal}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/goals/{user_id}")
async def get_goals(user_id: str):
    """Get user's investment goals."""
    from . import portfolio
    try:
        goals = portfolio.get_user_goals(user_id)
        return {"goals": goals, "count": len(goals)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/portfolio/targets")
async def set_target(user_id: str, req: TargetRequest):
    """Set target allocation."""
    from . import portfolio
    try:
        targets = portfolio.set_portfolio_target(
            user_id=user_id,
            symbol=req.symbol,
            target_percentage=req.target_percentage,
        )
        return {"status": "ok", "targets": targets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/{user_id}/rebalance-suggestion")
async def get_rebalance_suggestion(user_id: str):
    """Get rebalancing suggestions."""
    from . import portfolio
    try:
        suggestion = portfolio.get_rebalancing_suggestion(user_id)
        return suggestion
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
