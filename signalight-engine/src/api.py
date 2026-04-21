"""Signalight FastAPI — core endpoints only."""

from datetime import datetime
from typing import Optional, List
import asyncio

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import store as db_store

app = FastAPI(title="Signalight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Symbol Search ───────────────────────────────────────

@app.get("/api/search")
async def search_symbols(q: str):
    """Search ticker symbols via Yahoo Finance."""
    if not q or len(q) < 1:
        return {"results": []}
    try:
        import httpx
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        params = {"q": q, "quotesCount": 8, "newsCount": 0, "listsCount": 0}
        headers = {"User-Agent": "Mozilla/5.0"}
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.get(url, params=params, headers=headers)
            data = res.json()

        quotes = data.get("quotes", [])
        results = [
            {"symbol": item["symbol"], "name": item.get("longname") or item.get("shortname", ""), "type": item.get("quoteType", "")}
            for item in quotes
            if item.get("symbol") and item.get("quoteType") in ("EQUITY", "ETF", "CRYPTOCURRENCY", "MUTUALFUND")
        ]
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Health ──────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ─── Auth ────────────────────────────────────────────────

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
    from . import auth
    try:
        return auth.register_user(req.email, req.password, req.display_name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login")
async def login(req: LoginRequest):
    from . import auth
    try:
        return auth.login_user(req.email, req.password)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/guest")
async def create_guest(guest_id: Optional[str] = None):
    from . import auth
    try:
        # If existing guest_id provided, reuse that user
        if guest_id:
            user = db_store.get_user(guest_id)
            if user and user.get("auth_method") == "guest":
                token = auth.create_access_token(guest_id)
                return {"user_id": guest_id, "display_name": user["display_name"], "auth_method": "guest", "token": token}
        return auth.create_guest_user()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/google")
async def google_login(req: GoogleLoginRequest):
    from . import auth
    try:
        return auth.google_login(req.token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/verify")
async def verify_token(token: str):
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── User / Profile ──────────────────────────────────────

class UpdatePreferencesRequest(BaseModel):
    theme: Optional[str] = None
    notification_email: Optional[bool] = None
    telegram_chat_id: Optional[str] = None
    display_name: Optional[str] = None


@app.get("/api/user/{user_id}")
async def get_user_profile(user_id: str):
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/{user_id}/preferences")
async def update_user_preferences(user_id: str, req: UpdatePreferencesRequest):
    try:
        prefs = db_store.update_user_preferences(user_id, **req.dict(exclude_unset=True))
        if not prefs:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "ok", "preferences": prefs}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Watchlist ────────────────────────────────────────────

class WatchlistAddRequest(BaseModel):
    symbol: str
    name: str = ""


@app.get("/api/watchlist")
async def get_watchlist():
    try:
        wl = db_store.get_watchlist()
        symbols = [e["symbol"] for e in wl]
        from .market import fetch_current_price

        async def _price(sym: str):
            price = await asyncio.get_event_loop().run_in_executor(None, fetch_current_price, sym)
            return sym, price

        results = await asyncio.gather(*[_price(s) for s in symbols], return_exceptions=True)
        price_map = {r[0]: r[1] for r in results if isinstance(r, tuple)}

        items = [{"symbol": e["symbol"], "name": e.get("name", e["symbol"]), "price": price_map.get(e["symbol"])} for e in wl]
        return {"symbols": symbols, "items": items, "count": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/watchlist")
async def add_to_watchlist(req: WatchlistAddRequest):
    try:
        import yfinance as yf
        symbol = req.symbol.upper().strip()
        ticker = yf.Ticker(symbol)
        if not ticker.fast_info.last_price:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        added = db_store.add_to_watchlist(symbol, req.name or symbol)
        return {"success": True, "symbol": symbol, "added": added}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str):
    try:
        removed = db_store.remove_from_watchlist(symbol.upper())
        return {"success": True, "symbol": symbol.upper(), "removed": removed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Signals & Scan ──────────────────────────────────────

@app.get("/api/signals")
async def get_signals(symbol: Optional[str] = None, limit: int = 100, offset: int = 0):
    try:
        with db_store._connect() as conn:
            q = "SELECT id, timestamp, symbol, signal_type, severity, message FROM signals WHERE 1=1"
            params: list = []
            if symbol:
                q += " AND symbol = ?"
                params.append(symbol.upper())
            q += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params += [limit, offset]
            rows = conn.execute(q, params).fetchall()
        signals = [{"id": r[0], "timestamp": r[1], "symbol": r[2], "signal_type": r[3], "severity": r[4], "message": r[5]} for r in rows]
        return {"signals": signals, "count": len(signals)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/signals/recent")
async def get_recent_signals(limit: int = 50, symbol: Optional[str] = None):
    try:
        signals = db_store.get_recent_signals(hours=168)
        if symbol:
            signals = [s for s in signals if s.get("symbol", "").upper() == symbol.upper()]
        return {"signals": signals[:limit], "count": min(len(signals), limit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan/run")
async def trigger_scan():
    try:
        from .market import fetch_daily_data
        from .pulse import get_all_indicators
        from .trigger import evaluate_all_signals

        wl = db_store.get_watchlist()
        if not wl:
            return {"signals": [], "message": "Watchlist is empty"}

        all_signals, errors = [], []
        for entry in wl:
            sym = entry["symbol"]
            try:
                df = await asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, sym, "6mo")
                if df.empty:
                    continue
                indicators = get_all_indicators(df)
                for sig in evaluate_all_signals(sym, indicators, {}):
                    db_store.save_signal(**{k: sig[k] for k in ("symbol", "signal_type", "severity", "message", "indicators", "price")})
                    all_signals.append(sig)
            except Exception as e:
                errors.append(f"{sym}: {e}")

        return {"signals": all_signals, "count": len(all_signals), "scanned": len(wl), "errors": errors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Chart / Quote ───────────────────────────────────────

@app.get("/api/chart/{symbol}")
async def get_chart(symbol: str, interval: str = "1d", period: str = "6mo"):
    try:
        import yfinance as yf
        sym = symbol.upper()
        intraday = interval in ("1m", "5m", "15m", "30m", "60m", "1h")
        if intraday and period not in ("1d", "5d", "1mo"):
            period = "5d"

        df = await asyncio.get_event_loop().run_in_executor(
            None, lambda: yf.Ticker(sym).history(period=period, interval=interval)
        )
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {sym}")

        candles = [
            {"timestamp": ts.isoformat(), "open": round(float(r["Open"]), 4),
             "high": round(float(r["High"]), 4), "low": round(float(r["Low"]), 4),
             "close": round(float(r["Close"]), 4), "volume": int(r["Volume"])}
            for ts, r in df.iterrows()
        ]
        return {"symbol": sym, "interval": interval, "period": period, "candles": candles, "count": len(candles)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str):
    try:
        from .market import fetch_daily_data, fetch_current_price
        from .pulse import get_all_indicators
        sym = symbol.upper()
        price, df = await asyncio.gather(
            asyncio.get_event_loop().run_in_executor(None, fetch_current_price, sym),
            asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, sym, "6mo"),
        )
        indicators = get_all_indicators(df) if not df.empty else {}
        return {"symbol": sym, "price": price, "indicators": indicators, "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Alerts ──────────────────────────────────────────────

class PriceAlertRequest(BaseModel):
    symbol: str
    alert_type: str  # PRICE_ABOVE, PRICE_BELOW
    trigger_price: float
    notify_methods: List[str] = ["PUSH"]
    repeat_alert: bool = True

class IndicatorAlertRequest(BaseModel):
    symbol: str
    indicator: str  # MA
    condition: str  # ABOVE, BELOW, CROSS_ABOVE, CROSS_BELOW
    threshold: float
    timeframe: str = "1D"
    notify_methods: List[str] = ["PUSH"]

class VolumeAlertRequest(BaseModel):
    symbol: str
    alert_type: str = "UNUSUAL_VOLUME"
    volume_threshold: float = 0
    multiplier: float = 2.0
    notify_methods: List[str] = ["PUSH"]


@app.post("/api/alerts/price")
async def create_price_alert(user_id: str, req: PriceAlertRequest):
    from . import alerts_advanced
    try:
        return alerts_advanced.create_price_alert(
            user_id=user_id, symbol=req.symbol, alert_type=req.alert_type,
            trigger_price=req.trigger_price, notify_methods=req.notify_methods, repeat_alert=req.repeat_alert,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/indicator")
async def create_indicator_alert(user_id: str, req: IndicatorAlertRequest):
    from . import alerts_advanced
    try:
        return alerts_advanced.create_indicator_alert(
            user_id=user_id, symbol=req.symbol, indicator=req.indicator,
            condition=req.condition, threshold=req.threshold, timeframe=req.timeframe,
            notify_methods=req.notify_methods,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/volume")
async def create_volume_alert(user_id: str, req: VolumeAlertRequest):
    from . import alerts_advanced
    try:
        return alerts_advanced.create_volume_alert(
            user_id=user_id, symbol=req.symbol, alert_type=req.alert_type,
            volume_threshold=req.volume_threshold, multiplier=req.multiplier,
            notify_methods=req.notify_methods,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts")
async def get_all_alerts(user_id: str):
    from . import alerts_advanced
    try:
        return alerts_advanced.get_all_alerts(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/alerts/{alert_id}/toggle")
async def toggle_alert(alert_id: int, alert_type: str, is_active: int):
    from . import alerts_advanced
    try:
        ok = alerts_advanced.toggle_alert(alert_id, alert_type, bool(is_active))
        return {"status": "ok" if ok else "failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: int, alert_type: str):
    from . import alerts_advanced
    try:
        ok = alerts_advanced.delete_alert(alert_id, alert_type)
        return {"status": "ok" if ok else "failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AlertUpdateRequest(BaseModel):
    symbol: Optional[str] = None
    alert_type: Optional[str] = None
    trigger_price: Optional[float] = None
    indicator: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    timeframe: Optional[str] = None
    multiplier: Optional[float] = None
    notify_methods: Optional[List[str]] = None
    schedule_enabled: Optional[bool] = None
    schedule_time: Optional[str] = None   # "HH:MM"
    schedule_days: Optional[str] = None   # "daily" | "weekdays" | "MON,WED,FRI"


@app.put("/api/alerts/{alert_id}")
async def update_alert(alert_id: int, alert_category: str, req: AlertUpdateRequest):
    """Update an existing alert."""
    table_map = {"PRICE": "price_alerts", "INDICATOR": "indicator_alerts", "VOLUME": "volume_alerts"}
    table = table_map.get(alert_category.upper())
    if not table:
        raise HTTPException(status_code=400, detail="Invalid alert_category")
    try:
        updates = {k: v for k, v in req.dict(exclude_unset=True).items() if v is not None}
        if "notify_methods" in updates:
            updates["notify_methods"] = ",".join(updates["notify_methods"])
        if "schedule_enabled" in updates:
            updates["schedule_enabled"] = 1 if updates["schedule_enabled"] else 0
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        with db_store._connect() as conn:
            conn.execute(f"UPDATE {table} SET {set_clause} WHERE id = ?", [*updates.values(), alert_id])
            conn.commit()
        return {"status": "ok", "alert_id": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/{alert_id}/run")
async def run_alert_now(alert_id: int, alert_category: str):
    """Manually trigger an alert check. Returns full market snapshot + sends Telegram."""
    table_map = {"PRICE": "price_alerts", "INDICATOR": "indicator_alerts", "VOLUME": "volume_alerts"}
    table = table_map.get(alert_category.upper())
    if not table:
        raise HTTPException(status_code=400, detail="Invalid alert_category")
    try:
        with db_store._connect() as conn:
            row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (alert_id,)).fetchone()
            cols = [d[0] for d in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        if not row:
            raise HTTPException(status_code=404, detail="Alert not found")
        alert = dict(zip(cols, row))
        symbol = alert["symbol"]

        from .market import fetch_daily_data
        from .pulse import get_all_indicators, calculate_ma
        from .alerts_checker import check_user_alerts

        df = await asyncio.get_event_loop().run_in_executor(None, fetch_daily_data, symbol, "1y")
        if df.empty:
            return {"status": "no_data", "symbol": symbol}

        indicators = get_all_indicators(df)
        price = indicators.get("current_price", 0)
        current_volume = int(df["Volume"].iloc[-1]) if "Volume" in df.columns else 0
        avg_volume_1y = int(df["Volume"].tail(252).mean()) if "Volume" in df.columns else 0
        vol_pct = round((current_volume - avg_volume_1y) / avg_volume_1y * 100, 1) if avg_volume_1y else 0

        rsi_key = next((k for k in indicators if k.startswith("rsi_")), None)
        rsi = indicators.get(rsi_key) if rsi_key else None
        dd = indicators.get("drawdown_pct")
        ath = indicators.get("ath")

        mas = {p: calculate_ma(df, p) for p in (5, 20, 50, 120, 200)}

        snapshot = {
            "symbol": symbol,
            "price": round(price, 2),
            "rsi": round(rsi, 1) if rsi else None,
            "drawdown_pct": round(dd, 1) if dd is not None else None,
            "ath": round(ath, 2) if ath else None,
            "ma5": round(mas[5], 2) if mas[5] else None,
            "ma20": round(mas[20], 2) if mas[20] else None,
            "ma50": round(mas[50], 2) if mas[50] else None,
            "ma120": round(mas[120], 2) if mas[120] else None,
            "ma200": round(mas[200], 2) if mas[200] else None,
            "volume": current_volume,
            "avg_volume_1y": avg_volume_1y,
            "volume_vs_avg_pct": vol_pct,
        }

        triggered = check_user_alerts(symbol, df, price, current_volume, avg_volume_1y)

        def _arrow(p, ma):
            return "↑" if p and ma and p > ma else "↓" if p and ma else "—"

        # Send detailed Telegram message
        from .alert import send_message
        vol_sign = "+" if vol_pct >= 0 else ""
        tg_text = (
            f"🔔 <b>수동 실행</b> — {symbol}\n"
            f"{'─' * 22}\n"
            f"<b>현재가:</b> ${price:.2f}\n"
            f"{'─' * 22}\n"
            f"<b>이동평균선</b>\n"
            f"  MA5:   {f'${mas[5]:.2f}' if mas[5] else '—'} {_arrow(price, mas[5])}\n"
            f"  MA20:  {f'${mas[20]:.2f}' if mas[20] else '—'} {_arrow(price, mas[20])}\n"
            f"  MA50:  {f'${mas[50]:.2f}' if mas[50] else '—'} {_arrow(price, mas[50])}\n"
            f"  MA120: {f'${mas[120]:.2f}' if mas[120] else '—'} {_arrow(price, mas[120])}\n"
            f"  MA200: {f'${mas[200]:.2f}' if mas[200] else '—'} {_arrow(price, mas[200])}\n"
            f"{'─' * 22}\n"
            f"<b>RSI:</b>      {f'{rsi:.1f}' if rsi else '—'}\n"
            f"<b>Drawdown:</b> {f'{dd:.1f}%' if dd is not None else '—'}"
            f"{f' (ATH ${ath:.2f})' if ath else ''}\n"
            f"<b>거래량:</b>   {current_volume:,} ({vol_sign}{vol_pct}% vs 1y평균)\n"
        )
        if triggered:
            tg_text += f"{'─' * 22}\n🚨 알람 조건 충족!\n" + "\n".join(f"  • {ua['message']}" for ua in triggered)
        else:
            tg_text += f"{'─' * 22}\n✅ 조건 미충족"

        await send_message(tg_text)

        return {
            "status": "triggered" if triggered else "not_triggered",
            "triggered_count": len(triggered),
            "snapshot": snapshot,
            "triggered_alerts": [ua["message"] for ua in triggered],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Calculator ──────────────────────────────────────────

class CalculationRequest(BaseModel):
    principal: float
    period_months: int
    target_roi: float
    is_compound: bool = True
    tax_rate: float = 0


@app.post("/api/calculate")
async def calculate_profit(user_id: str, req: CalculationRequest):
    try:
        p, months, roi = req.principal, req.period_months, req.target_roi / 100
        years = months / 12
        final = p * ((1 + roi) ** years) if req.is_compound else p * (1 + roi * years)
        gross = final - p
        tax = gross * (req.tax_rate / 100)
        net = gross - tax
        after_tax_roi = (net / p * 100) if p > 0 else 0

        calc = db_store.save_calculation(
            user_id=user_id, principal=p, period_months=months, target_roi=req.target_roi,
            final_value=final, net_profit=net, tax_amount=tax, after_tax_roi=after_tax_roi,
            is_compound=req.is_compound, tax_rate=req.tax_rate,
        )
        return {
            "calculation_id": calc["id"], "principal": p,
            "final_value": round(final, 2), "gross_profit": round(gross, 2),
            "tax_amount": round(tax, 2), "net_profit": round(net, 2),
            "after_tax_roi": round(after_tax_roi, 2), "period_months": months,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/user/{user_id}/calculations")
async def get_user_calculations(user_id: str, limit: int = 50):
    try:
        calcs = db_store.get_user_calculations(user_id, limit)
        return {"calculations": calcs, "count": len(calcs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Backtest ────────────────────────────────────────────

class BacktestRequest(BaseModel):
    symbol: str
    days: int = 90
    strategy: str = "MA_CROSS"
    ma_short: int = 20
    ma_long: int = 60


@app.post("/api/backtest")
async def run_backtest(req: BacktestRequest):
    from .backtest import simple_backtest
    try:
        result = simple_backtest(req.symbol, req.days)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtest/results")
async def get_backtest_results(symbol: Optional[str] = None, limit: int = 10):
    try:
        results = db_store.get_backtest_results(symbol, limit)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Data Export ─────────────────────────────────────────

@app.get("/api/export/signals")
async def export_signals(user_id: str, format: str = "csv"):
    try:
        signals = db_store.get_recent_signals(hours=24 * 30)
        if format == "json":
            return {"signals": signals, "count": len(signals)}

        lines = ["timestamp,symbol,signal_type,severity,message"]
        for s in signals:
            lines.append(f"{s.get('timestamp','')},{s.get('symbol','')},{s.get('signal_type','')},{s.get('severity','')},{s.get('message','').replace(',', ' ')}")
        return {"csv": "\n".join(lines), "filename": "signals.csv"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/alerts")
async def export_alerts(user_id: str, format: str = "csv"):
    from . import alerts_advanced
    try:
        data = alerts_advanced.get_all_alerts(user_id)
        all_alerts = (data.get("price_alerts", []) + data.get("indicator_alerts", []) + data.get("volume_alerts", []))
        if format == "json":
            return {"alerts": all_alerts, "count": len(all_alerts)}
        import io, csv
        output = io.StringIO()
        if all_alerts:
            writer = csv.DictWriter(output, fieldnames=all_alerts[0].keys())
            writer.writeheader()
            writer.writerows(all_alerts)
        return {"csv": output.getvalue(), "filename": "alerts.csv"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── WebSocket (signal stream) ───────────────────────────

_ws_clients: list[WebSocket] = []


@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        while True:
            with db_store._connect() as conn:
                rows = conn.execute(
                    "SELECT id, timestamp, symbol, signal_type, severity, message FROM signals ORDER BY timestamp DESC LIMIT 5"
                ).fetchall()
            await websocket.send_json({"signals": [
                {"id": r[0], "timestamp": r[1], "symbol": r[2], "signal_type": r[3], "severity": r[4], "message": r[5]}
                for r in rows
            ]})
            await asyncio.sleep(10)
    except Exception:
        pass
    finally:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)
