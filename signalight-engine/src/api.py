"""FastAPI server for web dashboard integration"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .store import Database

app = FastAPI(title="Signalight API", version="0.1.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db: Optional[Database] = None


def set_database(database: Database):
    """API가 사용할 Database 인스턴스 설정"""
    global db
    db = database


@app.get("/health")
async def health():
    """헬스체크"""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialized")
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
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialized")

    try:
        conn = await db.get_connection()
        cursor = await conn.cursor()

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

        await cursor.execute(query, params)
        rows = await cursor.fetchall()

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

        await conn.close()
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
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialized")

    try:
        conn = await db.get_connection()
        cursor = await conn.cursor()

        await cursor.execute(
            "SELECT symbol FROM watchlist WHERE active = 1 ORDER BY symbol"
        )
        rows = await cursor.fetchall()
        symbols = [row[0] for row in rows]

        await conn.close()
        return {"symbols": symbols, "count": len(symbols)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
