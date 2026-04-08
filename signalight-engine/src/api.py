"""FastAPI server for web dashboard integration"""

from datetime import datetime, timedelta
from typing import Optional
import asyncio
import json

from fastapi import FastAPI, HTTPException, WebSocket, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

app = FastAPI(title="Signalight API", version="0.1.0")

# CORS configuration
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
    """Health check"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/signals")
async def get_signals(
    symbol: Optional[str] = None,
    signal_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Retrieve recent signals

    Args:
        symbol: Filter by specific symbol (e.g., "QQQ")
        signal_type: Filter by signal type (e.g., "ACTION", "WARNING")
        limit: Number of results to return (default 100)
        offset: Number of results to skip (pagination)
    """
    try:
        conn = db_store._connect()
        cursor = conn.cursor()

        # Fetch signals with filtering
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
    """Retrieve candle (OHLCV) data

    Args:
        symbol: Stock symbol (e.g., "QQQ")
        period: Time period (1D, 1W, 1M, etc.)
        limit: Number of candles to return (default 60)
    """
    from .market import fetch_daily_data

    try:
        # Convert period to yfinance format
        period_map = {"1D": "1d", "1W": "1wk", "1M": "1mo"}
        yf_period = period_map.get(period, "1d")

        # Fetch candle data (synchronous call)
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
    """Retrieve the latest indicator values

    Args:
        symbol: Stock symbol
    """
    # TODO: Implement actual indicator calculation and caching
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
    """Retrieve watchlist"""
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
    """WebSocket endpoint — real-time signal stream."""
    await websocket.accept()
    connected_clients.append(websocket)

    try:
        # Client keeps the connection alive and waits for messages from the server
        while True:
            # Periodically send the latest signals (every 10 seconds)
            try:
                conn = db_store._connect()
                cursor = conn.cursor()

                # Fetch the 5 most recent signals
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

            await asyncio.sleep(10)  # Update every 10 seconds

    except Exception:
        pass
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)


async def broadcast_signal(signal: dict):
    """Broadcast a new signal to all connected clients."""
    for client in connected_clients:
        try:
            await client.send_json({"new_signal": signal})
        except Exception:
            pass


@app.get("/api/signal-stats")
async def get_signal_stats(symbol: Optional[str] = None):
    """Retrieve performance statistics per signal type"""
    try:
        stats = db_store.get_signal_performance_stats(symbol)

        # Convert dictionary to list
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
    """Retrieve accuracy per indicator"""
    try:
        stats = db_store.get_indicator_accuracy(indicator_name)
        return {"stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtest-results")
async def get_backtest_results(symbol: Optional[str] = None, limit: int = 10):
    """Retrieve backtest results"""
    try:
        results = db_store.get_backtest_results(symbol, limit)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtest-run")
async def run_backtest(symbol: str, days: int = 90):
    """Run a new backtest"""
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
    """Export signal statistics (JSON/CSV)"""
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
    """Update user notification settings."""
    notification_prefs[user_id] = prefs
    return {"status": "ok", "user_id": user_id}


@app.get("/api/notification-settings")
async def get_notification_settings(user_id: str):
    """Retrieve user notification settings."""
    return {"settings": notification_prefs.get(user_id, {})}


@app.post("/api/test-notification")
async def test_notification(channel: str, user_id: str = "default"):
    """Test notification channel."""
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
    """Save user settings."""
    user_preferences[user_id] = settings
    return {"status": "ok"}


@app.get("/api/user-settings")
async def get_user_settings(user_id: str = "default"):
    """Retrieve user settings."""
    return {"settings": user_preferences.get(user_id, {})}


# ============= Phase 7: Paper Trading =============
paper_trades: dict = {}


@app.post("/api/paper-trade")
async def create_paper_trade(user_id: str, symbol: str, quantity: int, entry_price: float):
    """Enter a paper trade."""
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
    """Retrieve paper trades."""
    trades = [t for tid, t in paper_trades.items() if tid.startswith(user_id)]
    return {"trades": trades, "count": len(trades)}


# ============= Phase 8: Sector Heatmap =============
@app.get("/api/sector-heatmap")
async def get_sector_heatmap():
    """Sector performance heatmap."""
    sectors = {
        "Technology": {"QQQ": 2.5, "TQQQ": 5.2, "QQQI": 1.8},
        "Broad": {"SPY": 1.2, "SPYI": 2.1},
        "Growth": {"QLD": 3.1},
    }
    return {"sectors": sectors}


@app.get("/api/correlation-matrix")
async def get_correlation_matrix():
    """Symbol correlation matrix."""
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


# ============= Phase 11: AI & Machine Learning =============

class SentimentAnalysisRequest(BaseModel):
    content: str
    source: str = "news"


class SentimentAnalyzeRequest(BaseModel):
    content: str
    source: Optional[str] = "news"


@app.post("/api/signals/{signal_id}/confidence")
async def get_signal_confidence_score(signal_id: int, symbol: str, signal_type: str):
    """Calculate AI confidence score for a signal (0-100)."""
    from . import ai_signals
    try:
        confidence = ai_signals.calculate_signal_confidence(signal_id, symbol, signal_type)
        ai_signals.save_signal_confidence(signal_id, symbol, signal_type, confidence)

        return {
            "signal_id": signal_id,
            "symbol": symbol,
            "signal_type": signal_type,
            "confidence_score": confidence,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predictions/{symbol}")
async def get_entry_exit_predictions(symbol: str):
    """Get ML-based entry and exit price predictions."""
    from . import ai_signals
    try:
        # Get recent signals
        conn = db_store._connect()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM signals WHERE symbol = ? ORDER BY created_at DESC LIMIT 20",
            (symbol.upper(),)
        )
        recent_signals = [dict(row) for row in cursor.fetchall()]
        conn.close()

        predictions = ai_signals.predict_entry_exit_points(symbol, recent_signals)

        return {
            "symbol": symbol,
            "predictions": predictions,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sentiment/analyze")
async def analyze_sentiment(req: SentimentAnalyzeRequest):
    """Analyze sentiment of content (news/social media)."""
    from . import ai_signals
    try:
        result = ai_signals.analyze_sentiment(req.content, req.source)

        # Save to database
        conn = db_store._connect()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO sentiment_analysis
               (content_source, content_text, sentiment, sentiment_score, positive_count, negative_count, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (req.source, req.content, result['sentiment'], result['score'],
             result['positive_count'], result['negative_count'], datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()

        return {
            "source": req.source,
            "sentiment": result['sentiment'],
            "score": result['score'],
            "positive_count": result['positive_count'],
            "negative_count": result['negative_count'],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/patterns/{symbol}")
async def detect_chart_patterns(symbol: str):
    """Detect chart patterns (head & shoulders, triangles, flags, etc.)."""
    from . import ai_signals
    try:
        patterns = ai_signals.detect_patterns(symbol)

        return {
            "symbol": symbol,
            "patterns": patterns,
            "pattern_count": len(patterns),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/anomalies/{symbol}")
async def detect_market_anomalies(symbol: str):
    """Detect market anomalies (unusual volume, extreme price moves)."""
    from . import ai_signals
    try:
        anomalies = ai_signals.detect_anomalies(symbol)

        return {
            "symbol": symbol,
            "anomalies": anomalies,
            "anomaly_count": len(anomalies),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/risk-profile")
async def get_user_risk_profile(user_id: str):
    """Get user's risk profile based on trading behavior."""
    from . import ai_signals
    try:
        profile = ai_signals.get_user_risk_profile(user_id)

        return {
            "user_id": user_id,
            "risk_profile": profile.get('risk_profile'),
            "experience_level": profile.get('experience_level'),
            "avg_roi": profile.get('avg_roi'),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recommendations/{user_id}")
async def get_signal_recommendations(user_id: str, limit: int = 10):
    """Get personalized signal recommendations based on user's risk profile."""
    from . import ai_signals
    try:
        # Get available signals
        conn = db_store._connect()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, symbol, signal_type, severity, message, created_at
               FROM signals
               ORDER BY created_at DESC LIMIT 50"""
        )
        signals = []
        for row in cursor.fetchall():
            signals.append({
                "id": row[0],
                "symbol": row[1],
                "signal_type": row[2],
                "severity": row[3],
                "message": row[4],
                "created_at": row[5],
                "confidence_score": 50  # Default, would be calculated in production
            })
        conn.close()

        # Get recommendations
        recommendations = ai_signals.recommend_signals_for_user(user_id, signals)

        return {
            "user_id": user_id,
            "recommendations": recommendations[:limit],
            "count": len(recommendations),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase 12: News & Economic Indicators =============

@app.get("/api/news-feed")
async def get_news_feed(symbol: Optional[str] = None, limit: int = 20):
    """Get latest news feed for stocks or market."""
    from . import news_service
    try:
        news = news_service.get_news_feed(symbol, limit)

        return {
            "news": news,
            "count": len(news),
            "symbol": symbol or "market",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/economic-calendar")
async def get_economic_calendar(days_ahead: int = 30):
    """Get upcoming economic events calendar."""
    from . import news_service
    try:
        events = news_service.get_economic_events(days_ahead)

        return {
            "events": events,
            "count": len(events),
            "days_ahead": days_ahead,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/earnings-calendar")
async def get_earnings_calendar(days_ahead: int = 30):
    """Get upcoming earnings calendar."""
    from . import news_service
    try:
        earnings = news_service.get_earnings_calendar(days_ahead)

        return {
            "earnings": earnings,
            "count": len(earnings),
            "days_ahead": days_ahead,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market-sentiment")
async def get_market_sentiment():
    """Get overall market sentiment indicators (VIX, Put/Call ratio, etc.)."""
    from . import news_service
    try:
        sentiment = news_service.get_market_sentiment()

        return {
            "sentiment": sentiment,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/related-assets")
async def get_related_assets():
    """Get correlation and performance of related assets (oil, gold, USD, bonds)."""
    from . import news_service
    try:
        assets = news_service.get_related_assets_correlation()

        return {
            "assets": assets,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/news-impact/{symbol}")
async def get_news_impact(symbol: str, days: int = 7):
    """Analyze news signal impact on price movement."""
    from . import news_service
    try:
        impact = news_service.get_news_signal_impact(symbol, days)

        return {
            **impact,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sector-sentiment/{sector}")
async def get_sector_sentiment(sector: str):
    """Track how sector news affects ETF performance."""
    from . import news_service
    try:
        correlation = news_service.track_sector_news_correlation(sector)

        return {
            **correlation,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase 13: Real-time & Automation =============

class AutoTradeRequest(BaseModel):
    symbol: str
    trigger_condition: str  # SIGNAL, PRICE, INDICATOR, TIME
    trigger_value: float
    action: str  # BUY, SELL
    quantity: float


class ConditionalOrderRequest(BaseModel):
    symbol: str
    condition_type: str  # PRICE_ABOVE, PRICE_BELOW, INDICATOR_CROSS, TIME_BASED
    condition_value: float
    action_type: str  # BUY, SELL, ALERT
    quantity: float
    order_price: float
    expiry_date: Optional[str] = None


class TradeSimulationRequest(BaseModel):
    symbol: str
    action: str
    quantity: float
    entry_price: float
    exit_price: float
    commission_rate: float = 0.001
    tax_rate: float = 0.15


@app.post("/api/auto-trades")
async def create_auto_trade(user_id: str, req: AutoTradeRequest):
    """Create an automated trading rule."""
    from . import auto_trade_service
    try:
        rule = auto_trade_service.create_auto_trade_rule(
            user_id=user_id,
            symbol=req.symbol,
            trigger_condition=req.trigger_condition,
            trigger_value=req.trigger_value,
            action=req.action,
            quantity=req.quantity
        )

        return {"status": "ok", "rule": rule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auto-trades/{user_id}")
async def get_auto_trades(user_id: str):
    """Get all auto-trading rules for a user."""
    from . import auto_trade_service
    try:
        rules = auto_trade_service.get_user_auto_trades(user_id)

        return {"rules": rules, "count": len(rules)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auto-trades/{trade_id}/execute")
async def execute_auto_trade(trade_id: int, execution_price: float, shares_executed: float):
    """Execute an auto trade."""
    from . import auto_trade_service
    try:
        result = auto_trade_service.execute_auto_trade(trade_id, execution_price, shares_executed)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/auto-trades/{trade_id}")
async def disable_auto_trade(trade_id: int):
    """Disable an auto-trading rule."""
    from . import auto_trade_service
    try:
        success = auto_trade_service.disable_auto_trade(trade_id)

        return {"status": "ok" if success else "failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/conditional-orders")
async def create_conditional_order(user_id: str, req: ConditionalOrderRequest):
    """Create a conditional order (if-then rule)."""
    from . import auto_trade_service
    try:
        order = auto_trade_service.create_conditional_order(
            user_id=user_id,
            symbol=req.symbol,
            condition_type=req.condition_type,
            condition_value=req.condition_value,
            action_type=req.action_type,
            quantity=req.quantity,
            order_price=req.order_price,
            expiry_date=req.expiry_date
        )

        return {"status": "ok", "order": order}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conditional-orders/{user_id}")
async def get_conditional_orders(user_id: str, status: str = "PENDING"):
    """Get conditional orders for a user."""
    from . import auto_trade_service
    try:
        orders = auto_trade_service.get_user_conditional_orders(user_id, status)

        return {"orders": orders, "count": len(orders)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/{user_id}/hedging-suggestions")
async def get_hedging_suggestions(user_id: str):
    """Get automatic hedging suggestions for portfolio."""
    from . import auto_trade_service
    try:
        suggestions = auto_trade_service.get_hedging_suggestions(user_id)

        return {"suggestions": suggestions, "count": len(suggestions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/portfolio/{user_id}/apply-hedge")
async def apply_hedge_strategy(user_id: str, symbol: str, hedge_type: str):
    """Apply a hedging strategy to a position."""
    from . import auto_trade_service
    try:
        result = auto_trade_service.apply_hedge_strategy(user_id, symbol, hedge_type)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulate-trade")
async def simulate_trade(req: TradeSimulationRequest):
    """Simulate a trade including commissions and taxes."""
    from . import auto_trade_service
    try:
        result = auto_trade_service.simulate_trade_with_costs(
            symbol=req.symbol,
            action=req.action,
            quantity=req.quantity,
            entry_price=req.entry_price,
            exit_price=req.exit_price,
            commission_rate=req.commission_rate,
            tax_rate=req.tax_rate
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auto-trades/{user_id}/execution-history")
async def get_execution_history(user_id: str, limit: int = 50):
    """Get execution history of auto trades."""
    from . import auto_trade_service
    try:
        history = auto_trade_service.get_execution_history(user_id, limit)

        return {"history": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auto-trades/{user_id}/performance")
async def get_auto_trade_performance(user_id: str):
    """Get overall performance of auto-trading."""
    from . import auto_trade_service
    try:
        performance = auto_trade_service.get_auto_trade_performance(user_id)

        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase 14: Education & Learning =============

@app.get("/api/courses")
async def get_courses(category: Optional[str] = None, level: Optional[str] = None):
    """Get available courses."""
    from . import courses
    try:
        course_list = courses.get_courses(category, level)

        return {
            "courses": course_list,
            "count": len(course_list),
            "filters": {
                "category": category,
                "level": level
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/courses/{course_id}")
async def get_course_details(course_id: int):
    """Get detailed course information."""
    from . import courses
    try:
        course = courses.get_course_details(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        return course
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/courses/{course_id}/enroll")
async def enroll_in_course(user_id: str, course_id: int):
    """Enroll user in a course."""
    from . import courses
    try:
        result = courses.enroll_in_course(user_id, course_id)

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/courses")
async def get_user_courses(user_id: str):
    """Get courses user is enrolled in."""
    from . import courses
    try:
        user_courses = courses.get_user_courses(user_id)

        return {
            "courses": user_courses,
            "count": len(user_courses)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/user/{user_id}/courses/{course_id}/progress")
async def update_course_progress(user_id: str, course_id: int, progress_percent: float):
    """Update user's progress in a course."""
    from . import courses
    try:
        result = courses.update_course_progress(user_id, course_id, progress_percent)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/signals/{signal_type}/guide")
async def get_signal_guide(signal_type: str):
    """Get interpretation guide for a signal type."""
    from . import courses
    try:
        guide = courses.get_signal_guide(signal_type)

        return {
            "signal_type": signal_type,
            "guide": guide
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/case-studies")
async def get_case_studies(category: Optional[str] = None):
    """Get success and failure case studies."""
    from . import courses
    try:
        studies = courses.get_case_studies(category)

        return {
            "case_studies": studies,
            "count": len(studies)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/course-recommendations")
async def get_learning_recommendations(user_id: str):
    """Get personalized course recommendations."""
    from . import courses
    try:
        recommendations = courses.get_learning_recommendations(user_id)

        return {
            "recommendations": recommendations,
            "count": len(recommendations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/learning-progress")
async def get_learning_progress(user_id: str):
    """Track user's overall learning progress."""
    from . import courses
    try:
        progress = courses.track_learning_progress(user_id)

        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase 16: Social & Community =============

class CommunityPostRequest(BaseModel):
    title: str
    content: str
    signal_id: Optional[int] = None
    symbol: Optional[str] = None
    post_type: str = "DISCUSSION"


class CommentRequest(BaseModel):
    content: str


@app.post("/api/community/posts")
async def create_community_post(user_id: str, req: CommunityPostRequest):
    """Create a community post."""
    from . import community
    try:
        post = community.create_post(
            user_id=user_id,
            title=req.title,
            content=req.content,
            signal_id=req.signal_id,
            symbol=req.symbol,
            post_type=req.post_type
        )

        return {"status": "ok", "post": post}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/community/feed")
async def get_community_feed(limit: int = 20, post_type: Optional[str] = None):
    """Get community feed."""
    from . import community
    try:
        posts = community.get_community_feed(limit, post_type)

        return {
            "posts": posts,
            "count": len(posts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/community/posts/{post_id}/like")
async def like_post(user_id: str, post_id: int):
    """Like a community post."""
    from . import community
    try:
        liked = community.like_post(user_id, post_id)

        return {"post_id": post_id, "liked": liked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/community/posts/{post_id}/comments")
async def comment_on_post(post_id: int, user_id: str, req: CommentRequest):
    """Comment on a post."""
    from . import community
    try:
        comment = community.comment_on_post(user_id, post_id, req.content)

        return comment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/community/posts/{post_id}/comments")
async def get_post_comments(post_id: int, limit: int = 20):
    """Get comments for a post."""
    from . import community
    try:
        comments = community.get_post_comments(post_id, limit)

        return {
            "comments": comments,
            "count": len(comments)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users/{following_id}/follow")
async def follow_user(user_id: str, following_id: str):
    """Follow another user."""
    from . import community
    try:
        followed = community.follow_user(user_id, following_id)

        return {"following_id": following_id, "followed": followed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/followers")
async def get_followers(user_id: str):
    """Get followers of a user."""
    from . import community
    try:
        followers = community.get_followers(user_id)

        return {"followers": followers, "count": len(followers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/following")
async def get_following(user_id: str):
    """Get users that a user is following."""
    from . import community
    try:
        following = community.get_following(user_id)

        return {"following": following, "count": len(following)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/investor-matches")
async def find_investor_matches(user_id: str):
    """Find investors with similar trading style."""
    from . import community
    try:
        matches = community.find_investor_matches(user_id)

        return {"matches": matches, "count": len(matches)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/leaderboard")
async def get_leaderboard(period: str = "MONTHLY", limit: int = 20):
    """Get leaderboard by performance."""
    from . import community
    try:
        leaderboard = community.get_leaderboard(period, limit)

        return {"leaderboard": leaderboard, "period": period}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/leaderboard-rank")
async def get_user_rank(user_id: str, period: str = "MONTHLY"):
    """Get user's rank on leaderboard."""
    from . import community
    try:
        rank = community.get_user_rank(user_id, period)

        if not rank:
            raise HTTPException(status_code=404, detail="User not ranked yet")

        return rank
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/challenges")
async def get_monthly_challenges():
    """Get current monthly trading challenges."""
    from . import community
    try:
        challenges = community.get_monthly_challenges()

        return {"challenges": challenges, "count": len(challenges)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase 18: Risk Management =============

@app.post("/api/user/{user_id}/risk-limits/daily")
async def set_daily_loss_limit(user_id: str, daily_loss_amount: float):
    """Set maximum daily loss limit."""
    from . import risk_management
    try:
        result = risk_management.set_daily_loss_limit(user_id, daily_loss_amount)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/{user_id}/risk-limits/monthly")
async def set_monthly_loss_limit(user_id: str, monthly_loss_amount: float):
    """Set maximum monthly loss limit."""
    from . import risk_management
    try:
        result = risk_management.set_monthly_loss_limit(user_id, monthly_loss_amount)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/risk-limits")
async def get_risk_limits(user_id: str):
    """Get user's risk limits."""
    from . import risk_management
    try:
        limits = risk_management.get_risk_limits(user_id)
        return limits
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/var")
async def get_var(user_id: str, confidence_level: float = 0.95):
    """Calculate Value at Risk for portfolio."""
    from . import risk_management
    try:
        var = risk_management.calculate_var(user_id, confidence_level)
        return var
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/expected-shortfall")
async def get_expected_shortfall(user_id: str, confidence_level: float = 0.95):
    """Calculate Expected Shortfall."""
    from . import risk_management
    try:
        es = risk_management.calculate_expected_shortfall(user_id, confidence_level)
        return es
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stop-loss-rules")
async def create_stop_loss_rule(
    user_id: str,
    symbol: str,
    stop_loss_percent: float,
    take_profit_percent: Optional[float] = None,
    is_trailing: bool = False
):
    """Create stop loss rule."""
    from . import risk_management
    try:
        rule = risk_management.create_stop_loss_rule(
            user_id, symbol, stop_loss_percent, take_profit_percent, is_trailing
        )
        return rule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stop-loss-rules/{user_id}")
async def get_stop_loss_rules(user_id: str):
    """Get stop loss rules."""
    from . import risk_management
    try:
        rules = risk_management.get_stop_loss_rules(user_id)
        return {"rules": rules, "count": len(rules)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/position-size")
async def calculate_position_size(
    account_size: float,
    risk_percent: float,
    entry_price: float,
    stop_loss_price: float
):
    """Calculate optimal position size."""
    from . import risk_management
    try:
        result = risk_management.calculate_position_size(
            account_size, risk_percent, entry_price, stop_loss_price
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/portfolio-risk")
async def analyze_portfolio_risk(user_id: str):
    """Analyze portfolio risk."""
    from . import risk_management
    try:
        risk = risk_management.analyze_portfolio_risk(user_id)
        return risk
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/risk-summary")
async def get_risk_summary(user_id: str):
    """Get comprehensive risk summary."""
    from . import risk_management
    try:
        summary = risk_management.get_risk_summary(user_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phases 17-25: Advanced Features =============

@app.get("/api/user/{user_id}/premium-advisor")
async def get_premium_advisor(user_id: str):
    """Get AI portfolio advisor."""
    from . import advanced_features
    try:
        advisor = advanced_features.get_premium_advisor(user_id)
        return advisor
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/badges")
async def get_user_badges(user_id: str):
    """Get user's earned badges."""
    from . import advanced_features
    try:
        badges = advanced_features.get_user_badges(user_id)
        return {"badges": badges}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/badges/available")
async def get_available_badges():
    """Get all available badges."""
    from . import advanced_features
    try:
        badges = advanced_features.get_available_badges()
        return {"badges": badges}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/points")
async def get_user_points(user_id: str):
    """Get user's point balance."""
    from . import advanced_features
    try:
        points = advanced_features.get_user_points(user_id)
        return points
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/{user_id}/referral")
async def create_referral_link(user_id: str):
    """Create referral link."""
    from . import advanced_features
    try:
        referral = advanced_features.create_referral_link(user_id)
        return referral
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/referral-stats")
async def get_referral_stats(user_id: str):
    """Get referral statistics."""
    from . import advanced_features
    try:
        stats = advanced_features.get_referral_stats(user_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/stress-test")
async def stress_test_portfolio(user_id: str, scenario: str = "2008_CRISIS"):
    """Run portfolio stress test."""
    from . import advanced_features
    try:
        result = advanced_features.stress_test_portfolio(user_id, scenario)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/net-worth")
async def track_net_worth(user_id: str):
    """Track total net worth."""
    from . import advanced_features
    try:
        net_worth = advanced_features.track_net_worth(user_id)
        return net_worth
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/etf/{symbol}")
async def get_etf_analysis(symbol: str):
    """Get detailed ETF analysis."""
    from . import advanced_features
    try:
        analysis = advanced_features.get_etf_analysis(symbol)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/mirror-traders")
async def get_mirror_traders(user_id: str):
    """Get available traders to mirror."""
    from . import advanced_features
    try:
        traders = advanced_features.get_mirror_traders(user_id)
        return {"traders": traders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/{user_id}/mirror/{trader_id}")
async def start_mirror_trading(user_id: str, trader_id: str, allocation_percent: float):
    """Start mirroring trades."""
    from . import advanced_features
    try:
        result = advanced_features.start_mirror_trading(user_id, trader_id, allocation_percent)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Advanced Alerts System =============

class PriceAlertRequest(BaseModel):
    symbol: str
    alert_type: str  # PRICE_ABOVE, PRICE_BELOW, PRICE_BETWEEN
    trigger_price: float
    trigger_price_high: Optional[float] = None
    notify_methods: List[str] = None
    repeat_alert: bool = True


class IndicatorAlertRequest(BaseModel):
    symbol: str
    indicator: str  # RSI, MACD, BOLLINGER, VOLUME, MA
    condition: str  # ABOVE, BELOW, CROSS_ABOVE, CROSS_BELOW
    threshold: float
    timeframe: str = "1D"
    notify_methods: List[str] = None


class VolumeAlertRequest(BaseModel):
    symbol: str
    alert_type: str  # UNUSUAL_VOLUME, VOLUME_ABOVE, VOLUME_BELOW
    volume_threshold: float
    multiplier: float = 2.0
    notify_methods: List[str] = None


class PortfolioAlertRequest(BaseModel):
    alert_type: str  # PORTFOLIO_GAIN, PORTFOLIO_LOSS, POSITION_LOSS, DAILY_LOSS
    threshold: float
    notify_methods: List[str] = None


class NewsAlertRequest(BaseModel):
    symbol: str
    keywords: List[str]
    sentiment: Optional[str] = None
    notify_methods: List[str] = None


class TimeAlertRequest(BaseModel):
    symbol: str
    alert_time: str  # HH:MM format
    message: str
    recurring: str = "DAILY"
    days_of_week: Optional[List[str]] = None
    notify_methods: List[str] = None


class CompositeAlertRequest(BaseModel):
    symbol: str
    conditions: List[Dict]
    logic: str = "AND"
    notify_methods: List[str] = None


class NotificationSettingsRequest(BaseModel):
    email: bool = True
    push: bool = True
    sms: bool = False
    telegram: bool = False
    discord: bool = False
    quiet_hours: Optional[str] = None


@app.post("/api/alerts/price")
async def create_price_alert(user_id: str, req: PriceAlertRequest):
    """Create price-based alert."""
    from . import alerts_advanced
    try:
        alert = alerts_advanced.create_price_alert(
            user_id=user_id,
            symbol=req.symbol,
            alert_type=req.alert_type,
            trigger_price=req.trigger_price,
            trigger_price_high=req.trigger_price_high,
            notify_methods=req.notify_methods or ["PUSH"],
            repeat_alert=req.repeat_alert
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/indicator")
async def create_indicator_alert(user_id: str, req: IndicatorAlertRequest):
    """Create indicator-based alert."""
    from . import alerts_advanced
    try:
        alert = alerts_advanced.create_indicator_alert(
            user_id=user_id,
            symbol=req.symbol,
            indicator=req.indicator,
            condition=req.condition,
            threshold=req.threshold,
            timeframe=req.timeframe,
            notify_methods=req.notify_methods or ["PUSH"]
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/volume")
async def create_volume_alert(user_id: str, req: VolumeAlertRequest):
    """Create volume-based alert."""
    from . import alerts_advanced
    try:
        alert = alerts_advanced.create_volume_alert(
            user_id=user_id,
            symbol=req.symbol,
            alert_type=req.alert_type,
            volume_threshold=req.volume_threshold,
            multiplier=req.multiplier,
            notify_methods=req.notify_methods or ["PUSH"]
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/portfolio")
async def create_portfolio_alert(user_id: str, req: PortfolioAlertRequest):
    """Create portfolio-based alert."""
    from . import alerts_advanced
    try:
        alert = alerts_advanced.create_portfolio_alert(
            user_id=user_id,
            alert_type=req.alert_type,
            threshold=req.threshold,
            notify_methods=req.notify_methods or ["PUSH", "EMAIL"]
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/news")
async def create_news_alert(user_id: str, req: NewsAlertRequest):
    """Create news-based alert."""
    from . import alerts_advanced
    try:
        alert = alerts_advanced.create_news_alert(
            user_id=user_id,
            symbol=req.symbol,
            keywords=req.keywords,
            sentiment=req.sentiment,
            notify_methods=req.notify_methods or ["PUSH", "EMAIL"]
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/time")
async def create_time_alert(user_id: str, req: TimeAlertRequest):
    """Create time-based alert."""
    from . import alerts_advanced
    try:
        alert = alerts_advanced.create_time_based_alert(
            user_id=user_id,
            symbol=req.symbol,
            alert_time=req.alert_time,
            message=req.message,
            recurring=req.recurring,
            days_of_week=req.days_of_week,
            notify_methods=req.notify_methods or ["PUSH"]
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/composite")
async def create_composite_alert(user_id: str, req: CompositeAlertRequest):
    """Create composite alert with multiple conditions."""
    from . import alerts_advanced
    try:
        alert = alerts_advanced.create_composite_alert(
            user_id=user_id,
            symbol=req.symbol,
            conditions=req.conditions,
            logic=req.logic,
            notify_methods=req.notify_methods or ["PUSH"]
        )
        return alert
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts")
async def get_all_alerts(user_id: str):
    """Get all alerts for user."""
    from . import alerts_advanced
    try:
        alerts = alerts_advanced.get_all_alerts(user_id)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/alerts/{alert_id}/toggle")
async def toggle_alert(alert_id: int, alert_type: str, is_active: bool):
    """Toggle alert on/off."""
    from . import alerts_advanced
    try:
        success = alerts_advanced.toggle_alert(alert_id, alert_type, is_active)
        return {"status": "ok" if success else "failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: int, alert_type: str):
    """Delete an alert."""
    from . import alerts_advanced
    try:
        success = alerts_advanced.delete_alert(alert_id, alert_type)
        return {"status": "ok" if success else "failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts/history")
async def get_alert_history(user_id: str, limit: int = 50):
    """Get alert trigger history."""
    from . import alerts_advanced
    try:
        history = alerts_advanced.get_alert_history(user_id, limit)
        return {"history": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/settings")
async def configure_notification_settings(user_id: str, req: NotificationSettingsRequest):
    """Configure notification settings."""
    from . import alerts_advanced
    try:
        settings = alerts_advanced.configure_notification_settings(
            user_id=user_id,
            email=req.email,
            push=req.push,
            sms=req.sms,
            telegram=req.telegram,
            discord=req.discord,
            quiet_hours=req.quiet_hours
        )
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Stock Screener =============

@app.get("/api/screener/gainers")
async def get_gainers(limit: int = 20):
    """Get top gaining stocks."""
    from . import stock_screener
    try:
        gainers = stock_screener.screen_gainers()
        return {"gainers": gainers[:limit], "count": len(gainers[:limit])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/screener/losers")
async def get_losers(limit: int = 20):
    """Get top losing stocks."""
    from . import stock_screener
    try:
        losers = stock_screener.screen_losers()
        return {"losers": losers[:limit], "count": len(losers[:limit])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/screener/rsi")
async def screen_by_rsi(min_rsi: float = 0, max_rsi: float = 100):
    """Screen stocks by RSI."""
    from . import stock_screener
    try:
        results = stock_screener.screen_by_rsi(min_rsi, max_rsi)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/screener/macd")
async def screen_by_macd():
    """Screen stocks by MACD."""
    from . import stock_screener
    try:
        results = stock_screener.screen_by_macd()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/screener/ma-cross")
async def screen_by_ma():
    """Screen stocks by moving average."""
    from . import stock_screener
    try:
        results = stock_screener.screen_by_moving_average()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/screener/bollinger")
async def screen_by_bollinger():
    """Screen stocks by Bollinger Bands."""
    from . import stock_screener
    try:
        results = stock_screener.screen_by_bollinger_bands()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/screener/volume")
async def screen_by_volume(min_volume: float = 1000000):
    """Screen stocks by volume."""
    from . import stock_screener
    try:
        results = stock_screener.screen_by_volume(min_volume)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/screener/price")
async def screen_by_price(min_price: float = 0, max_price: float = 10000):
    """Screen stocks by price range."""
    from . import stock_screener
    try:
        results = stock_screener.screen_by_price(min_price, max_price)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/stats")
async def get_market_stats():
    """Get market statistics."""
    from . import stock_screener
    try:
        stats = stock_screener.get_market_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Backtesting =============

@app.post("/api/backtest")
async def run_strategy_backtest(
    strategy_name: str,
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float = 100000
):
    """Run strategy backtest."""
    from . import backtesting
    try:
        result = backtesting.run_strategy_backtest(
            strategy_name=strategy_name,
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/backtest/compare")
async def compare_strategies(symbol: str, strategies: List[str]):
    """Compare multiple strategies."""
    from . import backtesting
    try:
        result = backtesting.compare_strategies(symbol, strategies)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/backtest/monte-carlo")
async def backtest_monte_carlo(
    strategy_name: str,
    symbol: str,
    num_simulations: int = 1000
):
    """Run Monte Carlo backtest."""
    from . import backtesting
    try:
        result = backtesting.backtest_with_monte_carlo(
            strategy_name=strategy_name,
            symbol=symbol,
            historical_trades=[],
            num_simulations=num_simulations
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/backtest/optimize")
async def optimize_parameters(
    strategy_name: str,
    symbol: str,
    param_ranges: Dict
):
    """Optimize strategy parameters."""
    from . import backtesting
    try:
        result = backtesting.parameter_optimization(
            strategy_name=strategy_name,
            symbol=symbol,
            param_ranges=param_ranges
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/backtest/portfolio")
async def backtest_portfolio(
    user_id: str,
    symbols: List[str],
    weights: List[float],
    start_date: str,
    end_date: str
):
    """Backtest portfolio."""
    from . import backtesting
    try:
        result = backtesting.backtest_portfolio(
            user_id=user_id,
            portfolio_symbols=symbols,
            weights=weights,
            start_date=start_date,
            end_date=end_date
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtest/results")
async def get_backtest_results(symbol: str, limit: int = 10):
    """Get backtest results."""
    from . import backtesting
    try:
        results = backtesting.get_backtest_results(symbol, limit)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Real-time WebSocket Updates =============

@app.websocket("/ws/realtime/{symbol}")
async def websocket_realtime_updates(websocket: WebSocket, symbol: str):
    """WebSocket connection for real-time price and chart data

    Usage example:
    const ws = new WebSocket('ws://localhost:8000/ws/realtime/SPY');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data.type, data.data); // price_update, chart_update, indicator_update
    }
    """
    from . import realtime_updates
    import uuid

    connection_id = str(uuid.uuid4())

    await websocket.accept()

    try:
        # Start symbol stream
        await realtime_updates.StreamTask.start_stream(symbol)

        # Register connection
        await realtime_updates.realtime_manager.connect(
            websocket, symbol.upper(), connection_id
        )

        # Receive and process client messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "subscribe":
                new_symbol = message.get("symbol", "").upper()
                if new_symbol:
                    await realtime_updates.StreamTask.start_stream(new_symbol)
                    await realtime_updates.realtime_manager.connect(
                        websocket, new_symbol, connection_id
                    )

            elif message.get("type") == "unsubscribe":
                unsub_symbol = message.get("symbol", "").upper()
                if unsub_symbol:
                    await realtime_updates.realtime_manager.disconnect(
                        websocket, unsub_symbol, connection_id
                    )

            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Clean up connection
        for sub_symbol in list(realtime_updates.realtime_manager.subscriptions.get(connection_id, set())):
            await realtime_updates.realtime_manager.disconnect(websocket, sub_symbol, connection_id)

        # Stop stream if there are no more subscribers
        if symbol.upper() not in realtime_updates.realtime_manager.active_connections:
            await realtime_updates.StreamTask.stop_stream(symbol.upper())


@app.get("/api/realtime/market-status")
async def get_market_status():
    """Get current market status"""
    from . import realtime_updates
    return realtime_updates.get_current_market_status()


@app.get("/api/realtime/price/{symbol}")
async def get_realtime_price(symbol: str):
    """Get real-time price (without WebSocket)"""
    from . import realtime_updates
    try:
        price_data = realtime_updates.get_price_update_for_symbol(symbol)
        return price_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase D: Advanced Trading Orders =============

class OcoOrderRequest(BaseModel):
    symbol: str
    quantity: int
    primary_price: float
    secondary_price: float
    order_side: str = "SELL"
    primary_type: str = "LIMIT"
    secondary_type: str = "STOP"


class BracketOrderRequest(BaseModel):
    symbol: str
    quantity: int
    entry_price: float
    take_profit_price: float
    stop_loss_price: float
    order_side: str = "BUY"


class ScaleOrderRequest(BaseModel):
    symbol: str
    total_quantity: int
    entry_prices: List[float]
    order_side: str = "BUY"


class ModifyOcoRequest(BaseModel):
    new_primary_price: Optional[float] = None
    new_secondary_price: Optional[float] = None


@app.post("/api/orders/oco")
async def create_oco_order(user_id: str, req: OcoOrderRequest):
    """Create OCO (One Cancels Other) order"""
    from . import advanced_trading
    try:
        order = advanced_trading.create_oco_order(
            user_id=user_id,
            symbol=req.symbol,
            quantity=req.quantity,
            primary_price=req.primary_price,
            secondary_price=req.secondary_price,
            order_side=req.order_side,
            primary_type=req.primary_type,
            secondary_type=req.secondary_type,
        )
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/orders/bracket")
async def create_bracket_order(user_id: str, req: BracketOrderRequest):
    """Create bracket order"""
    from . import advanced_trading
    try:
        order = advanced_trading.create_bracket_order(
            user_id=user_id,
            symbol=req.symbol,
            quantity=req.quantity,
            entry_price=req.entry_price,
            take_profit_price=req.take_profit_price,
            stop_loss_price=req.stop_loss_price,
            order_side=req.order_side,
        )
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/orders/scale")
async def create_scale_order(user_id: str, req: ScaleOrderRequest):
    """Create scale in/out order"""
    from . import advanced_trading
    try:
        order = advanced_trading.create_scale_order(
            user_id=user_id,
            symbol=req.symbol,
            total_quantity=req.total_quantity,
            entry_prices=req.entry_prices,
            order_side=req.order_side,
        )
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders/advanced/{user_id}")
async def get_advanced_orders(user_id: str):
    """Get all active advanced orders (OCO, Bracket, Scale, Conditional)"""
    from . import advanced_trading
    try:
        orders = advanced_trading.get_active_advanced_orders(user_id)
        return orders
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/advanced-orders/{user_id}")
async def get_advanced_orders_alias(user_id: str):
    """Get all active advanced orders (frontend-compatible alias)"""
    from . import advanced_trading
    try:
        orders = advanced_trading.get_active_advanced_orders(user_id)
        return orders
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/orders/oco/{oco_id}")
async def cancel_oco_order(oco_id: str):
    """Cancel OCO order"""
    from . import advanced_trading
    try:
        success = advanced_trading.cancel_oco_order(oco_id)
        return {"success": success, "oco_id": oco_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/orders/bracket/{bracket_id}")
async def cancel_bracket_order(bracket_id: str):
    """Cancel bracket order"""
    from . import advanced_trading
    try:
        success = advanced_trading.cancel_bracket_order(bracket_id)
        return {"success": success, "bracket_id": bracket_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/orders/conditional/{condition_id}")
async def cancel_conditional_order_adv(condition_id: str):
    """Cancel conditional order"""
    from . import advanced_trading
    try:
        success = advanced_trading.cancel_conditional_order(condition_id)
        return {"success": success, "condition_id": condition_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/orders/oco/{oco_id}")
async def modify_oco_order(oco_id: str, req: ModifyOcoRequest):
    """Modify OCO order prices"""
    from . import advanced_trading
    try:
        success = advanced_trading.modify_oco_order(
            oco_id=oco_id,
            new_primary_price=req.new_primary_price,
            new_secondary_price=req.new_secondary_price,
        )
        return {"success": success, "oco_id": oco_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders/recommendations/{symbol}")
async def get_order_recommendations(
    symbol: str,
    current_price: float = 100.0,
    volatility: float = 0.02,
    risk_tolerance: str = "MEDIUM",
):
    """Get advanced order strategy recommendations"""
    from . import advanced_trading
    try:
        recs = advanced_trading.get_order_recommendations(
            symbol=symbol,
            current_price=current_price,
            volatility=volatility,
            risk_tolerance=risk_tolerance,
        )
        return recs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase E: Market Data Expansion =============

@app.get("/api/market/crypto")
async def get_crypto_prices(symbols: Optional[str] = None):
    """Get cryptocurrency prices"""
    from . import market_data
    try:
        symbol_list = symbols.split(",") if symbols else None
        prices = market_data.get_crypto_prices(symbol_list)
        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/crypto/chart/{symbol}")
async def get_crypto_chart(symbol: str, timeframe: str = "1d", limit: int = 100):
    """Get cryptocurrency chart data"""
    from . import market_data
    try:
        candles = market_data.get_crypto_chart(symbol.upper(), timeframe, limit)
        return {"symbol": symbol.upper(), "timeframe": timeframe, "candles": candles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/crypto/portfolio/{user_id}")
async def get_crypto_portfolio(user_id: str):
    """Get user cryptocurrency portfolio"""
    from . import market_data
    try:
        portfolio = market_data.get_crypto_portfolios(user_id)
        return portfolio
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/futures")
async def get_futures(asset_class: str = "INDEX"):
    """Get futures contracts"""
    from . import market_data
    try:
        contracts = market_data.get_futures_contracts(asset_class.upper())
        return contracts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/futures/chain/{symbol}")
async def get_futures_chain(symbol: str):
    """Get futures chain (by expiration month)"""
    from . import market_data
    try:
        chain = market_data.get_futures_chain(symbol.upper())
        return {"symbol": symbol.upper(), "chain": chain}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/forex")
async def get_forex_rates(pairs: Optional[str] = None):
    """Get forex exchange rates"""
    from . import market_data
    try:
        pair_list = pairs.split(",") if pairs else None
        rates = market_data.get_forex_rates(pair_list)
        return rates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/forex/chart/{pair}")
async def get_forex_chart(pair: str, timeframe: str = "1h", limit: int = 100):
    """Get forex chart data"""
    from . import market_data
    try:
        candles = market_data.get_forex_chart(pair.upper(), timeframe, limit)
        return {"pair": pair.upper(), "timeframe": timeframe, "candles": candles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/bonds")
async def get_bonds():
    """Get bond data"""
    from . import market_data
    try:
        bonds = market_data.get_bond_data()
        return bonds
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase G: Data Export & Reports =============

@app.get("/api/export/portfolio/csv/{user_id}")
async def export_portfolio_csv(user_id: str):
    """Export portfolio to CSV"""
    from . import data_export
    try:
        csv_content = data_export.export_portfolio_to_csv(user_id)
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=portfolio_{user_id}.csv"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/portfolio/excel/{user_id}")
async def export_portfolio_excel(user_id: str):
    """Export portfolio to Excel"""
    from . import data_export
    try:
        excel_bytes = data_export.export_portfolio_to_excel(user_id)
        return StreamingResponse(
            iter([excel_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=portfolio_{user_id}.xlsx"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/portfolio/pdf/{user_id}")
async def export_portfolio_pdf(user_id: str):
    """Export portfolio to PDF"""
    from . import data_export
    try:
        pdf_bytes = data_export.export_portfolio_to_pdf(user_id)
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=portfolio_{user_id}.pdf"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/alerts/csv/{user_id}")
async def export_alerts_csv(user_id: str):
    """Export alerts to CSV"""
    from . import data_export
    try:
        csv_content = data_export.export_alerts_to_csv(user_id)
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=alerts_{user_id}.csv"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/transactions/csv/{user_id}")
async def export_transactions_csv(user_id: str, start_date: Optional[str] = None):
    """Export transaction history to CSV"""
    from . import data_export
    try:
        csv_content = data_export.export_transactions_to_csv(user_id, start_date)
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=transactions_{user_id}.csv"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/summary/{user_id}")
async def get_export_summary(user_id: str):
    """Export summary (list of available formats)"""
    from . import data_export
    try:
        summary = data_export.create_export_summary(user_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/report/monthly/{user_id}")
async def get_monthly_report(user_id: str, year: int = 2026, month: int = 4):
    """Monthly report"""
    from . import data_export
    try:
        report = data_export.generate_monthly_report(user_id, year, month)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/report/annual/{user_id}")
async def get_annual_report(user_id: str, year: int = 2026):
    """Annual report"""
    from . import data_export
    try:
        report = data_export.generate_annual_report(user_id, year)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/report/json/{user_id}")
async def export_report_json(user_id: str, year: int = 2026):
    """Export annual report to JSON"""
    from . import data_export
    try:
        report = data_export.generate_annual_report(user_id, year)
        json_content = data_export.export_report_to_json(report)
        return StreamingResponse(
            iter([json_content]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=report_{user_id}_{year}.json"
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Unified Export Endpoints (Frontend-compatible) =============

from fastapi import Header as FastAPIHeader

def _extract_user_id_from_token(authorization: Optional[str]) -> str:
    """Extract user_id from Bearer token"""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        parts = token.split(".")
        if len(parts) >= 1 and parts[0]:
            return parts[0]
    return "guest"


@app.get("/api/export/portfolio")
async def unified_export_portfolio(
    format: str = "csv",
    authorization: Optional[str] = FastAPIHeader(default=None),
):
    """Export portfolio data (unified endpoint supporting csv/excel/pdf)"""
    from . import data_export
    try:
        # user_id fallback to guest for unauthenticated requests
        user_id = _extract_user_id_from_token(authorization)

        if format == "csv":
            content = data_export.export_portfolio_to_csv(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=portfolio.csv"},
            )
        elif format == "excel":
            content = data_export.export_portfolio_to_excel(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=portfolio.xlsx"},
            )
        elif format == "pdf":
            content = data_export.export_portfolio_to_pdf(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=portfolio.pdf"},
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/alerts")
async def unified_export_alerts(
    format: str = "csv",
    authorization: Optional[str] = FastAPIHeader(default=None),
):
    """Export alerts list (unified endpoint)"""
    from . import data_export
    try:
        user_id = _extract_user_id_from_token(authorization)
        content = data_export.export_alerts_to_csv(user_id)
        ext = "xlsx" if format == "excel" else "csv"
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=alerts.{ext}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/transactions")
async def unified_export_transactions(
    format: str = "csv",
    start_date: Optional[str] = None,
    authorization: Optional[str] = FastAPIHeader(default=None),
):
    """Export transaction history (unified endpoint)"""
    from . import data_export
    try:
        user_id = _extract_user_id_from_token(authorization)
        content = data_export.export_transactions_to_csv(user_id, start_date)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=transactions.csv"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/backtest")
async def unified_export_backtest(
    format: str = "csv",
    symbol: str = "SPY",
    strategy: str = "RSI",
    authorization: Optional[str] = FastAPIHeader(default=None),
):
    """Export backtest results (unified endpoint)"""
    from . import data_export
    try:
        content = data_export.export_backtest_results_to_csv(symbol, strategy, {})
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=backtest_{symbol}.csv"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/monthly-report")
async def unified_export_monthly_report(
    year: int = 2026,
    month: int = 4,
    format: str = "json",
    authorization: Optional[str] = FastAPIHeader(default=None),
):
    """Export monthly report (unified endpoint)"""
    from . import data_export
    try:
        user_id = _extract_user_id_from_token(authorization)
        report = data_export.generate_monthly_report(user_id, year, month)

        if format == "json":
            content = data_export.export_report_to_json(report)
            return StreamingResponse(
                iter([content]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=monthly_{year}_{month:02d}.json"},
            )
        elif format == "csv":
            lines = [f"{k},{v}" for k, v in report.items() if not isinstance(v, (list, dict))]
            content = "\n".join(lines)
            return StreamingResponse(
                iter([content]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=monthly_{year}_{month:02d}.csv"},
            )
        else:
            return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/annual-report")
async def unified_export_annual_report(
    year: int = 2026,
    format: str = "json",
    authorization: Optional[str] = FastAPIHeader(default=None),
):
    """Export annual report (unified endpoint)"""
    from . import data_export
    try:
        user_id = _extract_user_id_from_token(authorization)
        report = data_export.generate_annual_report(user_id, year)

        if format == "json":
            content = data_export.export_report_to_json(report)
            return StreamingResponse(
                iter([content]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=annual_{year}.json"},
            )
        elif format == "csv":
            lines = [f"{k},{v}" for k, v in report.items() if not isinstance(v, (list, dict))]
            content = "\n".join(lines)
            return StreamingResponse(
                iter([content]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=annual_{year}.csv"},
            )
        else:
            return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Options Analysis Endpoints =============

@app.get("/api/options/chain/{symbol}")
async def get_options_chain(symbol: str, expiration_date: Optional[str] = None):
    """Options chain with Greeks (frontend-compatible format)"""
    from . import options_analysis
    try:
        raw = options_analysis.get_options_chain(symbol.upper(), expiration_date)
        expirations = options_analysis.get_available_expirations(symbol.upper())
        expiration_dates = [e["date"] for e in expirations]

        # Transform to frontend-expected flat chain format
        calls_map = {c["strike"]: c for c in raw["calls"]}
        puts_map = {p["strike"]: p for p in raw["puts"]}
        all_strikes = sorted(set(list(calls_map.keys()) + list(puts_map.keys())))

        chain = []
        for strike in all_strikes:
            call = calls_map.get(strike, {})
            put = puts_map.get(strike, {})
            chain.append({
                "strikePrice": strike,
                "callBid": call.get("bid", 0),
                "callAsk": call.get("ask", 0),
                "callIv": call.get("implied_volatility", 0),
                "callDelta": call.get("delta", 0),
                "putBid": put.get("bid", 0),
                "putAsk": put.get("ask", 0),
                "putIv": put.get("implied_volatility", 0),
                "putDelta": put.get("delta", 0),
            })

        return {
            "data": {
                "symbol": symbol.upper(),
                "price": raw["current_price"],
                "expirationDates": expiration_dates,
                "iv": 25.0,
                "ivPercentile": 45,
                "chain": chain,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class GreeksRequest(BaseModel):
    symbol: str
    strike: float
    expiration_date: str
    option_type: str = "CALL"
    current_price: float = 450.0
    risk_free_rate: float = 0.05
    volatility: float = 0.25


@app.post("/api/options/greeks")
async def calculate_greeks(req: GreeksRequest):
    """Calculate option Greeks"""
    from . import options_analysis
    try:
        result = options_analysis.calculate_option_Greeks(
            symbol=req.symbol,
            strike=req.strike,
            expiration_date=req.expiration_date,
            option_type=req.option_type,
            current_price=req.current_price,
            risk_free_rate=req.risk_free_rate,
            volatility=req.volatility,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/options/strategies")
async def get_option_strategies():
    """Get available option strategies"""
    from . import options_analysis
    try:
        strategies = options_analysis.get_option_strategies()
        return {"strategies": strategies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/options/expirations/{symbol}")
async def get_option_expirations(symbol: str):
    """Get available expiration dates for a symbol"""
    from . import options_analysis
    try:
        expirations = options_analysis.get_available_expirations(symbol.upper())
        return {"symbol": symbol.upper(), "expirations": expirations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Phase E: Additional Market Data Endpoints =============

@app.get("/api/market/bonds/analysis/{symbol}")
async def get_bond_analysis(symbol: str):
    """Bond analysis (duration, convexity)"""
    from . import market_data
    try:
        analysis = market_data.get_bond_analysis(symbol.upper())
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/bonds/yield-curve")
async def get_yield_curve():
    """Yield curve data"""
    from . import market_data
    try:
        curve = market_data.get_yield_curve()
        return curve
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/bonds/price-calculator")
async def calculate_bond_price(
    coupon_rate: float = 0.045,
    yield_rate: float = 0.04,
    years_to_maturity: float = 10.0,
    face_value: float = 100.0,
):
    """Bond price calculator"""
    from . import market_data
    try:
        price = market_data.calculate_bond_price(
            coupon_rate, yield_rate, years_to_maturity, face_value
        )
        return {
            "price": price,
            "coupon_rate": coupon_rate,
            "yield_rate": yield_rate,
            "years_to_maturity": years_to_maturity,
            "face_value": face_value,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
