"""Main API Application - Signalight Stock Platform API"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import logging
from typing import Dict, Set

logger = logging.getLogger(__name__)

# Import all route modules
from . import (
    routes_broker,
    routes_export,
    routes_settings,
    routes_dashboard,
)
from . import alerts_advanced
from . import stock_screener
from . import backtesting
from . import portfolio_analyzer
from . import options_analysis
from . import news_data
from . import market_data
from . import advanced_trading

# Import realtime updates
from .realtime_updates import RealtimeUpdateManager
from .error_handlers import setup_error_handlers

# Initialize realtime manager
realtime_manager = RealtimeUpdateManager()

# In-memory cache of last indicators per symbol (for crossover detection)
_prev_indicators: dict = {}


def _is_market_open() -> bool:
    """Return True during NYSE trading hours Mon–Fri 09:30–16:00 ET."""
    from datetime import datetime
    import zoneinfo
    now = datetime.now(zoneinfo.ZoneInfo("America/New_York"))
    if now.weekday() >= 5:
        return False
    market_open  = now.replace(hour=9,  minute=30, second=0, microsecond=0)
    market_close = now.replace(hour=16, minute=0,  second=0, microsecond=0)
    return market_open <= now <= market_close


async def _run_scan() -> int:
    """Scan all watchlist symbols and save signals to DB. Returns signal count."""
    from .store import get_watchlist, save_signal, log_scan
    from .market import fetch_daily_data
    from .pulse import get_all_indicators
    from .trigger import evaluate_all_signals
    from .alert import send_alert
    from .config import SIGNAL_CONFIG

    wl = get_watchlist()
    if not wl:
        logger.info("Background scan: watchlist empty, skipping")
        return 0

    all_signals = []
    errors = []

    for entry in wl:
        symbol = entry["symbol"]
        try:
            df = await asyncio.get_event_loop().run_in_executor(
                None, fetch_daily_data, symbol, "6mo"
            )
            if df.empty:
                continue
            indicators = get_all_indicators(df)
            prev = _prev_indicators.get(symbol, {})
            signals = evaluate_all_signals(symbol, indicators, prev)
            _prev_indicators[symbol] = indicators

            for sig in signals:
                save_signal(
                    symbol=sig["symbol"],
                    signal_type=sig["signal_type"],
                    severity=sig["severity"],
                    message=sig["message"],
                    indicators=sig["indicators"],
                    price=sig["price"],
                )
                try:
                    await send_alert(sig)
                except Exception:
                    pass  # Telegram optional
                all_signals.append(sig)
        except Exception as e:
            errors.append(f"{symbol}: {e}")
            logger.warning(f"Scan error for {symbol}: {e}")

    log_scan(
        symbols_scanned=len(wl),
        signals_found=len(all_signals),
        errors="; ".join(errors),
    )
    logger.info(f"Background scan complete — {len(wl)} symbols, {len(all_signals)} signals")
    return len(all_signals)


async def _background_scanner():
    """Periodic scanner running every SCAN_INTERVAL_MINUTES during market hours."""
    from .config import SIGNAL_CONFIG
    interval_minutes = SIGNAL_CONFIG.get("scan_interval_minutes", 30)
    interval_seconds = interval_minutes * 60

    # Initial delay so the server is fully ready
    await asyncio.sleep(10)
    logger.info(f"Background scanner started — interval {interval_minutes}min")

    while True:
        try:
            if _is_market_open():
                logger.info("Background scan starting...")
                await _run_scan()
            else:
                logger.info("Market closed — scan skipped")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Background scanner unexpected error: {e}", exc_info=True)
        await asyncio.sleep(interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    from . import store as db_store
    db_store.init_db()
    logger.info("Signalight API started — DB initialized")

    # Start background scanner as a non-blocking task
    scanner_task = asyncio.create_task(_background_scanner())

    yield

    # Shutdown
    logger.info("Shutting down Signalight API...")
    scanner_task.cancel()
    await asyncio.gather(scanner_task, return_exceptions=True)
    await realtime_manager.shutdown()


app = FastAPI(
    title="Signalight Stock Trading Platform API",
    description="Professional stock trading platform with technical analysis, alerts, and broker integrations",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup error handlers
setup_error_handlers(app)

# Include routers
app.include_router(routes_broker.router)
app.include_router(routes_export.router)
app.include_router(routes_settings.router)
app.include_router(routes_dashboard.router)

# Mount all routes from api.py (auth, watchlist, chart, signals, etc.)
from .api import app as _api_app
for route in _api_app.routes:
    app.routes.append(route)


# ============= Alert Routes =============

@app.post("/api/alerts/price")
async def create_price_alert(data: dict):
    """Create a price-based alert."""
    result = alerts_advanced.create_price_alert(
        user_id=data.get("user_id"),
        symbol=data.get("symbol"),
        trigger_price=data.get("trigger_price"),
        condition=data.get("condition", "above"),
        notify_methods=data.get("notify_methods", ["push"]),
    )
    return result


@app.post("/api/alerts/indicator")
async def create_indicator_alert(data: dict):
    """Create an indicator-based alert."""
    result = alerts_advanced.create_indicator_alert(
        user_id=data.get("user_id"),
        symbol=data.get("symbol"),
        indicator=data.get("indicator"),
        threshold=data.get("threshold"),
        notify_methods=data.get("notify_methods", ["push"]),
    )
    return result


@app.post("/api/alerts/volume")
async def create_volume_alert(data: dict):
    """Create a volume alert."""
    result = alerts_advanced.create_volume_alert(
        user_id=data.get("user_id"),
        symbol=data.get("symbol"),
        volume_threshold=data.get("volume_threshold"),
        notify_methods=data.get("notify_methods", ["push"]),
    )
    return result


@app.post("/api/alerts/portfolio")
async def create_portfolio_alert(data: dict):
    """Create a portfolio alert."""
    result = alerts_advanced.create_portfolio_alert(
        user_id=data.get("user_id"),
        alert_type=data.get("alert_type"),
        threshold=data.get("threshold"),
        notify_methods=data.get("notify_methods", ["push"]),
    )
    return result


@app.post("/api/alerts/news")
async def create_news_alert(data: dict):
    """Create a news alert."""
    result = alerts_advanced.create_news_alert(
        user_id=data.get("user_id"),
        symbol=data.get("symbol"),
        keywords=data.get("keywords", []),
        notify_methods=data.get("notify_methods", ["push"]),
    )
    return result


@app.post("/api/alerts/time")
async def create_time_based_alert(data: dict):
    """Create a time-based alert."""
    result = alerts_advanced.create_time_based_alert(
        user_id=data.get("user_id"),
        alert_name=data.get("alert_name"),
        trigger_time=data.get("trigger_time"),
        message=data.get("message"),
        notify_methods=data.get("notify_methods", ["push"]),
    )
    return result


@app.post("/api/alerts/composite")
async def create_composite_alert(data: dict):
    """Create a composite-condition alert."""
    result = alerts_advanced.create_composite_alert(
        user_id=data.get("user_id"),
        alert_name=data.get("alert_name"),
        conditions=data.get("conditions", []),
        logic=data.get("logic", "AND"),
        notify_methods=data.get("notify_methods", ["push"]),
    )
    return result


@app.get("/api/alerts")
async def get_all_alerts(user_id: str):
    """Retrieve all alerts for a user."""
    alerts = alerts_advanced.get_all_alerts(user_id)
    return {"alerts": alerts}


@app.get("/api/alerts/{alert_id}")
async def get_alert(alert_id: str):
    """Retrieve details of a specific alert."""
    alert = alerts_advanced.get_all_alerts("")  # Implement specific alert fetch
    return {"alert": alert}


@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: str, user_id: str):
    """Delete an alert."""
    result = alerts_advanced.delete_alert(user_id, alert_id)
    return {"success": result}


@app.put("/api/alerts/{alert_id}/toggle")
async def toggle_alert(alert_id: str, user_id: str):
    """Toggle an alert active/inactive."""
    result = alerts_advanced.toggle_alert(user_id, alert_id)
    return {"success": result}


@app.get("/api/alerts/history")
async def get_alert_history(user_id: str, limit: int = 100):
    """Retrieve alert history."""
    history = alerts_advanced.get_alert_history(user_id, limit)
    return {"history": history}


@app.post("/api/alerts/settings")
async def configure_notifications(user_id: str, data: dict):
    """Configure notification settings for a user."""
    result = alerts_advanced.configure_notification_settings(
        user_id=user_id,
        email=data.get("email"),
        push=data.get("push"),
        sms=data.get("sms"),
        telegram=data.get("telegram"),
        discord=data.get("discord"),
    )
    return result


# ============= Screener Routes =============

@app.get("/api/screener/gainers")
async def get_gainers(limit: int = 20):
    """Retrieve top gaining stocks."""
    return stock_screener.screen_gainers(limit)


@app.get("/api/screener/losers")
async def get_losers(limit: int = 20):
    """Retrieve top losing stocks."""
    return stock_screener.screen_losers(limit)


@app.get("/api/screener/rsi")
async def get_rsi_signals(threshold: float = 30):
    """Retrieve RSI-based signals."""
    return stock_screener.screen_by_rsi(threshold)


@app.get("/api/screener/macd")
async def get_macd_signals():
    """Retrieve MACD crossover signals."""
    return stock_screener.screen_by_macd()


@app.get("/api/screener/volume")
async def get_volume_signals(multiplier: float = 2.0):
    """Retrieve volume-based signals."""
    return stock_screener.screen_by_volume(multiplier)


@app.get("/api/screener/ma-cross")
async def get_ma_cross_signals():
    """Retrieve moving average crossover signals."""
    return stock_screener.screen_by_moving_average()


@app.get("/api/screener/bollinger")
async def get_bollinger_signals():
    """Retrieve Bollinger Band signals."""
    return stock_screener.screen_by_bollinger_bands()


@app.get("/api/screener/stats")
async def get_market_stats():
    """Retrieve market statistics."""
    return stock_screener.get_market_stats()


# ============= Backtesting Routes =============

@app.post("/api/backtest/run")
async def run_backtest(data: dict):
    """Run a strategy backtest."""
    result = backtesting.run_strategy_backtest(
        symbol=data.get("symbol"),
        strategy=data.get("strategy"),
        parameters=data.get("parameters", {}),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    return result


@app.post("/api/backtest/compare")
async def compare_strategies(data: dict):
    """Compare multiple strategies."""
    result = backtesting.compare_strategies(
        symbol=data.get("symbol"),
        strategies=data.get("strategies", []),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    return result


@app.post("/api/backtest/monte-carlo")
async def run_monte_carlo(data: dict):
    """Run a Monte Carlo simulation."""
    result = backtesting.backtest_with_monte_carlo(
        symbol=data.get("symbol"),
        strategy=data.get("strategy"),
        iterations=data.get("iterations", 1000),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    return result


@app.post("/api/backtest/optimize")
async def optimize_parameters(data: dict):
    """Optimize strategy parameters."""
    result = backtesting.parameter_optimization(
        symbol=data.get("symbol"),
        strategy=data.get("strategy"),
        param_ranges=data.get("param_ranges", {}),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    return result


# ============= Portfolio Analysis Routes =============

@app.get("/api/portfolio/analysis/{user_id}")
async def get_portfolio_analysis(user_id: str):
    """Analyze a user's portfolio."""
    result = portfolio_analyzer.calculate_portfolio_metrics(user_id)
    return result


@app.get("/api/portfolio/allocation/{user_id}")
async def get_allocation(user_id: str):
    """Retrieve asset allocation."""
    result = portfolio_analyzer.get_asset_allocation(user_id)
    return result


@app.get("/api/portfolio/sectors/{user_id}")
async def get_sectors(user_id: str):
    """Retrieve sector analysis."""
    result = portfolio_analyzer.get_sector_analysis(user_id)
    return result


@app.get("/api/portfolio/correlation/{user_id}")
async def get_correlation(user_id: str):
    """Retrieve correlation matrix."""
    result = portfolio_analyzer.calculate_correlation_matrix(user_id)
    return result


@app.get("/api/portfolio/attribution/{user_id}")
async def get_attribution(user_id: str):
    """Retrieve performance attribution analysis."""
    result = portfolio_analyzer.get_performance_attribution(user_id)
    return result


@app.get("/api/portfolio/frontier/{user_id}")
async def get_frontier(user_id: str):
    """Calculate the efficient frontier."""
    result = portfolio_analyzer.calculate_efficient_frontier(user_id)
    return result


@app.get("/api/portfolio/dividend/{user_id}")
async def get_dividend_analysis(user_id: str):
    """Retrieve dividend analysis."""
    result = portfolio_analyzer.get_dividend_analysis(user_id)
    return result


@app.get("/api/portfolio/risk/{user_id}")
async def get_risk_metrics(user_id: str):
    """Retrieve risk metrics."""
    result = portfolio_analyzer.get_risk_metrics(user_id)
    return result


@app.get("/api/portfolio/rebalance/{user_id}")
async def get_rebalance_recommendations(user_id: str):
    """Retrieve rebalancing recommendations."""
    result = portfolio_analyzer.get_rebalance_recommendations(user_id)
    return result


# ============= Options Routes =============

@app.get("/api/options/chain/{symbol}")
async def get_options_chain(symbol: str, expiration: str = None):
    """Retrieve the options chain for a symbol."""
    result = options_analysis.get_options_chain(symbol, expiration)
    return result


@app.get("/api/options/expirations/{symbol}")
async def get_expirations(symbol: str):
    """Retrieve available option expiration dates."""
    result = options_analysis.get_available_expirations(symbol)
    return result


@app.get("/api/options/greeks/{symbol}")
async def get_greeks(symbol: str, expiration: str = None, strike: float = None):
    """Retrieve option Greeks for a symbol."""
    result = options_analysis.calculate_option_Greeks(symbol, expiration, strike)
    return result


@app.get("/api/options/strategies")
async def get_strategies():
    """Retrieve available option strategies."""
    result = options_analysis.get_option_strategies()
    return result


@app.post("/api/options/iv")
async def calculate_iv(data: dict):
    """Calculate implied volatility."""
    result = options_analysis.calculate_implied_volatility(
        option_type=data.get("option_type"),
        stock_price=data.get("stock_price"),
        strike=data.get("strike"),
        expiration=data.get("expiration"),
        option_price=data.get("option_price"),
    )
    return {"implied_volatility": result}


# ============= News Routes =============

@app.get("/api/news/latest")
async def get_latest_news(symbol: str = None, limit: int = 20):
    """Retrieve the latest news articles."""
    result = news_data.get_latest_news(symbol, limit)
    return {"news": result}


@app.get("/api/news/earnings")
async def get_earnings_calendar():
    """Retrieve the earnings calendar."""
    result = news_data.get_earnings_calendar()
    return result


@app.get("/api/news/economic")
async def get_economic_calendar():
    """Retrieve the economic calendar."""
    result = news_data.get_economic_calendar()
    return result


@app.get("/api/news/ipo")
async def get_ipo_calendar():
    """Retrieve the IPO calendar."""
    result = news_data.get_ipo_calendar()
    return result


@app.get("/api/news/announcements/{symbol}")
async def get_announcements(symbol: str):
    """Retrieve company announcements."""
    result = news_data.get_company_announcements(symbol)
    return result


# ============= Market Data Routes =============

@app.get("/api/market/crypto/prices")
async def get_crypto_prices():
    """Retrieve cryptocurrency prices."""
    result = market_data.get_crypto_prices()
    return result


@app.get("/api/market/sectors")
async def get_sector_performance():
    """Retrieve sector ETF performance data via yfinance."""
    import yfinance as yf
    SECTOR_ETFS = [
        ("XLK", "기술"),
        ("XLV", "의료"),
        ("XLF", "금융"),
        ("XLE", "에너지"),
        ("XLY", "소비재"),
        ("XLI", "산업"),
        ("XLP", "필수소비재"),
        ("XLB", "소재"),
        ("XLRE", "부동산"),
        ("XLU", "유틸리티"),
    ]

    def _fetch():
        results = []
        for symbol, name in SECTOR_ETFS:
            try:
                t = yf.Ticker(symbol)
                hist = t.history(period="2d")
                if len(hist) >= 2:
                    prev = hist["Close"].iloc[-2]
                    curr = hist["Close"].iloc[-1]
                    ret = round((curr - prev) / prev * 100, 2)
                else:
                    ret = 0.0
                results.append({"symbol": symbol, "name": name, "return": ret})
            except Exception:
                results.append({"symbol": symbol, "name": name, "return": 0.0})
        return results

    sectors = await asyncio.get_event_loop().run_in_executor(None, _fetch)
    return {"sectors": sectors}


@app.get("/api/market/indices")
async def get_market_indices():
    """Retrieve major market indices via yfinance."""
    import yfinance as yf
    INDICES = [
        ("^GSPC", "S&P 500"),
        ("^IXIC", "나스닥"),
        ("^DJI", "다우지수"),
        ("^RUT", "러셀 2000"),
        ("^VIX", "VIX"),
    ]

    def _fetch():
        results = []
        for symbol, name in INDICES:
            try:
                t = yf.Ticker(symbol)
                hist = t.history(period="2d")
                if len(hist) >= 2:
                    prev = float(hist["Close"].iloc[-2])
                    curr = float(hist["Close"].iloc[-1])
                    change = round(curr - prev, 2)
                    change_pct = round((curr - prev) / prev * 100, 3)
                else:
                    curr, change, change_pct = 0.0, 0.0, 0.0
                results.append({"symbol": symbol, "name": name, "price": round(curr, 2), "change": change, "changePercent": change_pct})
            except Exception:
                results.append({"symbol": symbol, "name": name, "price": 0.0, "change": 0.0, "changePercent": 0.0})
        return results

    indices = await asyncio.get_event_loop().run_in_executor(None, _fetch)
    return {"indices": indices}


# ============= WebSocket Real-time Routes =============

@app.websocket("/ws/realtime/{user_id}")
async def websocket_realtime(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time data streaming."""
    await websocket.accept()
    await realtime_manager.add_client(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "subscribe":
                symbols = message.get("symbols", [])
                for symbol in symbols:
                    await realtime_manager.subscribe(user_id, symbol)

            elif message.get("type") == "unsubscribe":
                symbols = message.get("symbols", [])
                for symbol in symbols:
                    await realtime_manager.unsubscribe(user_id, symbol)

            elif message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        await realtime_manager.remove_client(user_id)


# ============= Health Check =============

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    """Root endpoint — returns API metadata."""
    return {
        "name": "Signalight Stock Trading Platform API",
        "version": "1.0.0",
        "endpoints": {
            "brokers": "/api/broker",
            "export": "/api/export",
            "alerts": "/api/alerts",
            "screener": "/api/screener",
            "backtesting": "/api/backtest",
            "portfolio": "/api/portfolio",
            "options": "/api/options",
            "news": "/api/news",
            "market": "/api/market",
            "realtime": "/ws/realtime/{user_id}",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
