"""Market Data - 시장 데이터 (암호화폐, 선물, 외환, 채권)"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store
import random


# ============= Cryptocurrency (암호화폐) =============

def get_crypto_prices(symbols: Optional[List[str]] = None) -> List[Dict]:
    """암호화폐 가격 조회"""
    crypto_data = {
        "BTC": {"name": "Bitcoin", "price": 65234.50, "change": 2.45},
        "ETH": {"name": "Ethereum", "price": 3456.78, "change": 3.21},
        "BNB": {"name": "Binance Coin", "price": 612.34, "change": 1.89},
        "SOL": {"name": "Solana", "price": 198.45, "change": 5.67},
        "XRP": {"name": "Ripple", "price": 2.34, "change": -1.23},
        "ADA": {"name": "Cardano", "price": 0.98, "change": 0.45},
        "DOGE": {"name": "Dogecoin", "price": 0.12, "change": 2.34},
        "SHIB": {"name": "Shiba Inu", "price": 0.0000234, "change": -0.56},
    }

    if symbols:
        crypto_data = {k: v for k, v in crypto_data.items() if k in symbols}

    return [
        {
            "symbol": symbol,
            "name": data["name"],
            "price": data["price"],
            "change_percent": data["change"],
            "market_cap": data["price"] * random.uniform(1e9, 1e12),
            "volume_24h": random.uniform(1e9, 1e12),
            "timestamp": datetime.utcnow().isoformat(),
        }
        for symbol, data in crypto_data.items()
    ]


def get_crypto_chart(symbol: str, timeframe: str = "1d", limit: int = 100) -> List[Dict]:
    """암호화폐 차트 데이터"""
    base_price = {"BTC": 65000, "ETH": 3450, "BNB": 610, "SOL": 200}.get(symbol, 100)

    candles = []
    current_time = datetime.utcnow()

    for i in range(limit, 0, -1):
        timestamp = current_time - timedelta(days=i)
        noise = random.uniform(-2, 2)
        open_price = base_price + noise
        close_price = open_price + random.uniform(-1, 2)
        high_price = max(open_price, close_price) + random.uniform(0, 2)
        low_price = min(open_price, close_price) - random.uniform(0, 1)

        candles.append({
            "timestamp": timestamp.isoformat(),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": random.uniform(1e6, 1e9),
        })

    return candles


def get_crypto_portfolios(user_id: str) -> Dict:
    """사용자 암호화폐 포트폴리오"""
    with store._connect() as conn:
        positions = conn.execute(
            """SELECT symbol, quantity, entry_price
               FROM crypto_positions
               WHERE user_id = ?""",
            (user_id,),
        ).fetchall()

    portfolio = {
        "total_value": 0,
        "total_return": 0,
        "positions": [],
    }

    for symbol, quantity, entry_price in positions:
        current_prices = get_crypto_prices([symbol])
        if current_prices:
            current_price = current_prices[0]["price"]
            position_value = quantity * current_price
            entry_value = quantity * entry_price
            return_amount = position_value - entry_value
            return_percent = (return_amount / entry_value * 100) if entry_value > 0 else 0

            portfolio["positions"].append({
                "symbol": symbol,
                "quantity": quantity,
                "entry_price": entry_price,
                "current_price": current_price,
                "position_value": round(position_value, 2),
                "return_amount": round(return_amount, 2),
                "return_percent": round(return_percent, 2),
            })

            portfolio["total_value"] += position_value
            portfolio["total_return"] += return_amount

    return {
        **portfolio,
        "total_value": round(portfolio["total_value"], 2),
        "total_return": round(portfolio["total_return"], 2),
    }


# ============= Futures (선물) =============

def get_futures_contracts(asset_class: str = "INDEX") -> List[Dict]:
    """선물 계약 조회"""
    futures_data = {
        "INDEX": [
            {"symbol": "ES", "name": "E-mini S&P 500", "price": 5123.45, "change": 0.89},
            {"symbol": "NQ", "name": "E-mini Nasdaq-100", "price": 16234.56, "change": 1.23},
            {"symbol": "YM", "name": "E-mini Dow", "price": 40123.45, "change": 0.56},
        ],
        "COMMODITY": [
            {"symbol": "CL", "name": "Crude Oil WTI", "price": 78.45, "change": -1.23},
            {"symbol": "GC", "name": "Gold", "price": 2145.34, "change": 0.67},
            {"symbol": "NG", "name": "Natural Gas", "price": 2.87, "change": 2.34},
        ],
        "CURRENCY": [
            {"symbol": "6E", "name": "Euro FX", "price": 0.9234, "change": -0.45},
            {"symbol": "6J", "name": "Japanese Yen", "price": 0.0067, "change": 0.23},
            {"symbol": "6B", "name": "British Pound", "price": 1.2456, "change": 0.34},
        ],
        "INTEREST": [
            {"symbol": "ZB", "name": "US Treasury Bond", "price": 156.23, "change": -0.12},
            {"symbol": "ZN", "name": "10-Year Note", "price": 123.45, "change": 0.08},
            {"symbol": "ZF", "name": "5-Year Note", "price": 109.87, "change": -0.05},
        ],
    }

    contracts = futures_data.get(asset_class, [])
    return [
        {
            "symbol": c["symbol"],
            "name": c["name"],
            "price": c["price"],
            "change_percent": c["change"],
            "contract_size": 100 if asset_class == "INDEX" else 1000,
            "expiration": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "open_interest": random.uniform(1e6, 1e7),
            "timestamp": datetime.utcnow().isoformat(),
        }
        for c in contracts
    ]


def get_futures_chain(symbol: str) -> List[Dict]:
    """선물 체인 (만료 월별)"""
    months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    current_year = datetime.utcnow().year
    base_price = 5123.45 if symbol == "ES" else 16234.56 if symbol == "NQ" else 40123.45

    chain = []
    for i in range(12):
        month_idx = (datetime.utcnow().month + i - 1) % 12
        month = months[month_idx]
        year = current_year if month_idx >= datetime.utcnow().month else current_year + 1

        contract_symbol = f"{symbol}{month}{str(year)[-2:]}"
        price = base_price * (1 + i * 0.0001)  # 약간의 contango/backwardation

        chain.append({
            "symbol": contract_symbol,
            "month": month,
            "year": year,
            "price": round(price, 2),
            "change": random.uniform(-0.5, 0.5),
            "open_interest": random.uniform(1e5, 1e6),
            "volume": random.uniform(1e4, 1e5),
            "days_to_expiration": 30 + (i * 30),
        })

    return chain


# ============= Forex (외환) =============

def get_forex_rates(pairs: Optional[List[str]] = None) -> List[Dict]:
    """외환 환율 조회"""
    forex_data = {
        "EURUSD": {"rate": 1.0856, "change": 0.12},
        "GBPUSD": {"rate": 1.2647, "change": 0.34},
        "USDJPY": {"rate": 149.45, "change": -0.23},
        "AUDUSD": {"rate": 0.6534, "change": 0.45},
        "USDCAD": {"rate": 1.3687, "change": -0.12},
        "USDCHF": {"rate": 0.8945, "change": 0.08},
        "NZDUSD": {"rate": 0.5987, "change": 0.23},
        "USDINR": {"rate": 83.45, "change": 0.89},
    }

    if pairs:
        forex_data = {k: v for k, v in forex_data.items() if k in pairs}

    return [
        {
            "symbol": pair,
            "rate": data["rate"],
            "change_percent": data["change"],
            "bid": round(data["rate"] - 0.0001, 4),
            "ask": round(data["rate"] + 0.0001, 4),
            "spread_pips": round(0.0002 * 10000),  # pips
            "volume": random.uniform(1e9, 1e10),
            "timestamp": datetime.utcnow().isoformat(),
        }
        for pair, data in forex_data.items()
    ]


def get_forex_chart(pair: str, timeframe: str = "1h", limit: int = 100) -> List[Dict]:
    """외환 차트 데이터"""
    base_rate = {"EURUSD": 1.0856, "GBPUSD": 1.2647, "USDJPY": 149.45}.get(pair, 1.0)

    candles = []
    current_time = datetime.utcnow()

    for i in range(limit, 0, -1):
        if timeframe == "1h":
            timestamp = current_time - timedelta(hours=i)
        elif timeframe == "1d":
            timestamp = current_time - timedelta(days=i)
        else:
            timestamp = current_time - timedelta(minutes=i)

        noise = random.uniform(-0.0002, 0.0002)
        open_rate = base_rate + noise
        close_rate = open_rate + random.uniform(-0.0001, 0.0001)
        high_rate = max(open_rate, close_rate) + random.uniform(0, 0.0002)
        low_rate = min(open_rate, close_rate) - random.uniform(0, 0.0001)

        candles.append({
            "timestamp": timestamp.isoformat(),
            "open": round(open_rate, 4),
            "high": round(high_rate, 4),
            "low": round(low_rate, 4),
            "close": round(close_rate, 4),
            "volume": random.uniform(1e8, 1e9),
        })

    return candles


# ============= Bonds (채권) =============

def get_bond_data() -> List[Dict]:
    """채권 데이터"""
    bonds = [
        {
            "symbol": "UST2Y",
            "name": "2-Year US Treasury",
            "yield": 4.23,
            "price": 98.45,
            "duration": 1.8,
            "coupon": 4.50,
        },
        {
            "symbol": "UST5Y",
            "name": "5-Year US Treasury",
            "yield": 3.98,
            "price": 102.34,
            "duration": 4.5,
            "coupon": 4.25,
        },
        {
            "symbol": "UST10Y",
            "name": "10-Year US Treasury",
            "yield": 4.12,
            "price": 105.67,
            "duration": 8.2,
            "coupon": 4.50,
        },
        {
            "symbol": "UST30Y",
            "name": "30-Year US Treasury",
            "yield": 4.34,
            "price": 112.45,
            "duration": 18.5,
            "coupon": 4.75,
        },
        {
            "symbol": "LQD",
            "name": "Investment Grade Corporate Bond ETF",
            "yield": 5.45,
            "price": 95.23,
            "duration": 5.8,
            "coupon": None,
        },
        {
            "symbol": "HYG",
            "name": "High Yield Bond ETF",
            "yield": 7.89,
            "price": 78.34,
            "duration": 3.2,
            "coupon": None,
        },
    ]

    return [
        {
            "symbol": b["symbol"],
            "name": b["name"],
            "yield_percent": b["yield"],
            "price": b["price"],
            "duration": b["duration"],
            "coupon_percent": b["coupon"],
            "change": round(random.uniform(-0.5, 0.5), 2),
            "timestamp": datetime.utcnow().isoformat(),
        }
        for b in bonds
    ]


def calculate_bond_price(
    coupon_rate: float,
    yield_rate: float,
    years_to_maturity: float,
    face_value: float = 100,
) -> float:
    """채권 가격 계산

    PV = 쿠폰지급액/[(1+수익률)^t] + 액면가/[(1+수익률)^n]
    """
    annual_coupon = coupon_rate * face_value
    periods = int(years_to_maturity * 2)  # 반기별
    semi_yield = yield_rate / 2
    semi_coupon = annual_coupon / 2

    pv = 0
    for t in range(1, periods + 1):
        pv += semi_coupon / ((1 + semi_yield) ** t)

    pv += face_value / ((1 + semi_yield) ** periods)

    return round(pv, 2)


def get_bond_analysis(symbol: str) -> Dict:
    """채권 분석"""
    bonds_info = {
        "UST10Y": {"yield": 4.12, "duration": 8.2, "convexity": 75.3},
        "UST30Y": {"yield": 4.34, "duration": 18.5, "convexity": 450.2},
        "LQD": {"yield": 5.45, "duration": 5.8, "convexity": 42.1},
        "HYG": {"yield": 7.89, "duration": 3.2, "convexity": 15.8},
    }

    info = bonds_info.get(symbol, {"yield": 4.0, "duration": 5.0, "convexity": 50.0})

    # 금리 변화에 따른 가격 변화
    yield_change = -0.01  # -1% 금리 하락

    duration_effect = info["duration"] * yield_change * 100
    convexity_effect = 0.5 * info["convexity"] * (yield_change ** 2) * 100

    price_change = duration_effect + convexity_effect

    return {
        "symbol": symbol,
        "yield": round(info["yield"], 2),
        "duration": round(info["duration"], 2),
        "convexity": round(info["convexity"], 2),
        "price_sensitivity": {
            "yield_change_percent": -1.0,
            "duration_effect": round(duration_effect, 2),
            "convexity_effect": round(convexity_effect, 2),
            "total_price_change": round(price_change, 2),
        },
    }


def get_yield_curve() -> Dict:
    """수익률 곡선 (Yield Curve)"""
    maturities = ["2Y", "5Y", "10Y", "30Y"]
    yields = [4.23, 3.98, 4.12, 4.34]

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "maturities": maturities,
        "yields": yields,
        "curve_type": "Normal",  # Normal, Inverted, Flat
        "spread_10y_2y": round(yields[-2] - yields[0], 2),
        "slope": "Positive" if yields[-1] > yields[0] else "Negative",
    }
