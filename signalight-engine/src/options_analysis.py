"""Options Analysis - Options pricing, Greeks, and strategy tools"""

import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


def black_scholes_call(
    S: float,  # Current stock price
    K: float,  # Strike price
    r: float,  # Risk-free rate
    sigma: float,  # Volatility (sigma)
    T: float,  # Time to expiration (in years)
) -> float:
    """Black-Scholes Call Option Pricing Model"""
    if T <= 0 or sigma <= 0:
        return max(S - K, 0)

    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    call_price = S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)
    return max(call_price, 0)


def black_scholes_put(
    S: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
) -> float:
    """Black-Scholes Put Option Pricing Model"""
    if T <= 0 or sigma <= 0:
        return max(K - S, 0)

    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    put_price = K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)
    return max(put_price, 0)


def norm_cdf(x: float) -> float:
    """Cumulative Standard Normal Distribution"""
    return (1 + math.erf(x / math.sqrt(2))) / 2


def norm_pdf(x: float) -> float:
    """Probability Density Function of Standard Normal"""
    return math.exp(-0.5 * x**2) / math.sqrt(2 * math.pi)


def calculate_delta(
    option_type: str,  # "CALL" or "PUT"
    S: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
) -> float:
    """Calculate Option Delta (Rate of change of option price w.r.t. stock price)"""
    if T <= 0:
        if option_type == "CALL":
            return 1.0 if S > K else 0.0
        else:
            return -1.0 if S < K else 0.0

    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))

    if option_type == "CALL":
        return norm_cdf(d1)
    else:  # PUT
        return norm_cdf(d1) - 1


def calculate_gamma(
    S: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
) -> float:
    """Calculate Option Gamma (Rate of change of delta w.r.t. stock price)"""
    if T <= 0 or sigma <= 0:
        return 0

    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
    return norm_pdf(d1) / (S * sigma * math.sqrt(T))


def calculate_theta(
    option_type: str,
    S: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
) -> float:
    """Calculate Option Theta (Time decay)"""
    if T <= 0:
        return 0

    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if option_type == "CALL":
        theta = (-S * norm_pdf(d1) * sigma / (2 * math.sqrt(T)) -
                 r * K * math.exp(-r * T) * norm_cdf(d2)) / 365
    else:  # PUT
        theta = (-S * norm_pdf(d1) * sigma / (2 * math.sqrt(T)) +
                 r * K * math.exp(-r * T) * norm_cdf(-d2)) / 365

    return theta


def calculate_vega(
    S: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
) -> float:
    """Calculate Option Vega (Sensitivity to volatility changes)"""
    if T <= 0 or sigma <= 0:
        return 0

    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
    return S * norm_pdf(d1) * math.sqrt(T) / 100  # Per 1% change in volatility


def calculate_rho(
    option_type: str,
    S: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
) -> float:
    """Calculate Option Rho (Sensitivity to interest rate changes)"""
    if T <= 0:
        return 0

    d2 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T)) - sigma * math.sqrt(T)

    if option_type == "CALL":
        return K * T * math.exp(-r * T) * norm_cdf(d2) / 100  # Per 1% change in interest rate
    else:  # PUT
        return -K * T * math.exp(-r * T) * norm_cdf(-d2) / 100


def get_options_chain(
    symbol: str,
    expiration_date: Optional[str] = None
) -> Dict:
    """Retrieve options chain"""
    # Simulated data
    current_price = 450  # Reference price based on SPY

    calls = []
    puts = []

    strikes = [400, 420, 430, 440, 450, 460, 470, 480, 500]
    risk_free_rate = 0.05  # 5% risk-free rate
    volatility = 0.25  # 25% implied volatility
    days_to_expiration = 30
    T = days_to_expiration / 365

    for strike in strikes:
        call_price = black_scholes_call(current_price, strike, risk_free_rate, volatility, T)
        put_price = black_scholes_put(current_price, strike, risk_free_rate, volatility, T)

        # Greeks
        call_delta = calculate_delta("CALL", current_price, strike, risk_free_rate, volatility, T)
        put_delta = calculate_delta("PUT", current_price, strike, risk_free_rate, volatility, T)
        gamma = calculate_gamma(current_price, strike, risk_free_rate, volatility, T)
        call_theta = calculate_theta("CALL", current_price, strike, risk_free_rate, volatility, T)
        put_theta = calculate_theta("PUT", current_price, strike, risk_free_rate, volatility, T)
        vega = calculate_vega(current_price, strike, risk_free_rate, volatility, T)
        call_rho = calculate_rho("CALL", current_price, strike, risk_free_rate, volatility, T)
        put_rho = calculate_rho("PUT", current_price, strike, risk_free_rate, volatility, T)

        calls.append({
            "strike": strike,
            "bid": round(max(call_price - 0.05, 0), 2),
            "ask": round(call_price + 0.05, 2),
            "last_price": round(call_price, 2),
            "volume": 1000 if strike == 450 else 100,
            "open_interest": 5000 if strike == 450 else 500,
            "implied_volatility": round(volatility * 100, 2),
            "delta": round(call_delta, 3),
            "gamma": round(gamma, 4),
            "theta": round(call_theta, 3),
            "vega": round(vega, 3),
            "rho": round(call_rho, 3),
        })

        puts.append({
            "strike": strike,
            "bid": round(max(put_price - 0.05, 0), 2),
            "ask": round(put_price + 0.05, 2),
            "last_price": round(put_price, 2),
            "volume": 1000 if strike == 450 else 100,
            "open_interest": 5000 if strike == 450 else 500,
            "implied_volatility": round(volatility * 100, 2),
            "delta": round(put_delta, 3),
            "gamma": round(gamma, 4),
            "theta": round(put_theta, 3),
            "vega": round(vega, 3),
            "rho": round(put_rho, 3),
        })

    return {
        "symbol": symbol,
        "current_price": current_price,
        "expiration_date": expiration_date or "2024-05-17",
        "days_to_expiration": days_to_expiration,
        "calls": calls,
        "puts": puts,
        "atm_strike": 450,
    }


def get_available_expirations(symbol: str) -> List[Dict]:
    """Retrieve list of available expiration dates"""
    today = datetime.now()

    expirations = []
    for days_out in [3, 7, 14, 21, 30, 60, 90, 180]:
        exp_date = today + timedelta(days=days_out)
        expirations.append({
            "date": exp_date.strftime("%Y-%m-%d"),
            "days_to_expiration": days_out,
            "is_weeklies": days_out <= 21,
        })

    return expirations


def calculate_implied_volatility(
    option_price: float,
    S: float,
    K: float,
    r: float,
    T: float,
    option_type: str = "CALL",
    initial_guess: float = 0.3,
) -> float:
    """Calculate implied volatility using Newton-Raphson"""
    sigma = initial_guess

    for _ in range(100):  # Maximum 100 iterations
        if option_type == "CALL":
            price = black_scholes_call(S, K, r, sigma, T)
            vega = calculate_vega(S, K, r, sigma, T)
        else:
            price = black_scholes_put(S, K, r, sigma, T)
            vega = calculate_vega(S, K, r, sigma, T)

        if abs(price - option_price) < 0.01:  # Converged
            return sigma

        if vega < 1e-10:
            break

        sigma = sigma - (price - option_price) / vega

        if sigma < 0:
            sigma = 0.01

    return sigma


def get_option_strategies() -> List[Dict]:
    """List of option strategies"""
    return [
        {
            "name": "Long Call",
            "description": "콜 옵션을 매수 - 약한 상승 전망",
            "risk": "Limited (Premium paid)",
            "reward": "Unlimited",
            "break_even": "Strike + Premium",
            "best_when": "You expect price to rise moderately",
        },
        {
            "name": "Long Put",
            "description": "풋 옵션을 매수 - 약한 하락 전망",
            "risk": "Limited (Premium paid)",
            "reward": "Limited (Strike - Premium)",
            "break_even": "Strike - Premium",
            "best_when": "You expect price to fall moderately",
        },
        {
            "name": "Bull Call Spread",
            "description": "OTM 콜을 매수, ATM 콜을 매도",
            "risk": "Limited (Spread paid)",
            "reward": "Limited (Max spread - Premium paid)",
            "break_even": "Lower strike + Premium paid",
            "best_when": "You expect moderate price increase, want to reduce cost",
        },
        {
            "name": "Bear Put Spread",
            "description": "OTM 풋을 매수, ATM 풋을 매도",
            "risk": "Limited (Strike difference - Premium received)",
            "reward": "Limited (Premium received)",
            "break_even": "Higher strike - Premium received",
            "best_when": "You expect price to stay above lower strike",
        },
        {
            "name": "Straddle",
            "description": "같은 가격의 콜과 풋을 모두 매수",
            "risk": "Limited (Premium paid)",
            "reward": "Unlimited",
            "break_even": "Strike ± Premiums",
            "best_when": "You expect large move but unsure direction",
        },
        {
            "name": "Iron Condor",
            "description": "Bear call spread + Bull put spread",
            "risk": "Limited (Width of spread - Premium received)",
            "reward": "Limited (Premium received)",
            "break_even": "Upper short call strike ± spread, Lower short put strike ± spread",
            "best_when": "You expect price to stay within range",
        },
    ]


def calculate_option_Greeks(
    symbol: str,
    strike: float,
    current_price: float,
    days_to_expiration: int,
    implied_volatility: float,
    option_type: str = "CALL",
    risk_free_rate: float = 0.05,
) -> Dict:
    """Calculate option Greeks"""
    T = days_to_expiration / 365

    return {
        "symbol": symbol,
        "strike": strike,
        "current_price": current_price,
        "option_type": option_type,
        "delta": round(calculate_delta(option_type, current_price, strike, risk_free_rate, implied_volatility, T), 4),
        "gamma": round(calculate_gamma(current_price, strike, risk_free_rate, implied_volatility, T), 6),
        "theta": round(calculate_theta(option_type, current_price, strike, risk_free_rate, implied_volatility, T), 4),
        "vega": round(calculate_vega(current_price, strike, risk_free_rate, implied_volatility, T), 4),
        "rho": round(calculate_rho(option_type, current_price, strike, risk_free_rate, implied_volatility, T), 4),
        "intrinsic_value": round(max(current_price - strike, 0) if option_type == "CALL" else max(strike - current_price, 0), 2),
        "implied_volatility": round(implied_volatility * 100, 2),
    }


def save_option_position(
    user_id: str,
    symbol: str,
    option_type: str,
    strike: float,
    expiration_date: str,
    quantity: int,
    premium_paid: float,
) -> Dict:
    """Save option position"""
    import json

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO option_positions
               (user_id, symbol, option_type, strike, expiration_date, quantity,
                premium_paid, opened_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                symbol.upper(),
                option_type,
                strike,
                expiration_date,
                quantity,
                premium_paid,
                datetime.utcnow().isoformat(),
            ),
        )
        conn.commit()

    return {
        "user_id": user_id,
        "symbol": symbol,
        "option_type": option_type,
        "strike": strike,
        "expiration_date": expiration_date,
        "quantity": quantity,
        "premium_paid": premium_paid,
        "status": "OPENED",
    }
