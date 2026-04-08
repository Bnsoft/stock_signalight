"""Portfolio Analysis - Portfolio Analyzer"""

import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from . import store
import json


def calculate_portfolio_metrics(
    positions: List[Dict],  # [{"symbol": "SPY", "quantity": 100, "current_price": 450}]
    risk_free_rate: float = 0.05,
) -> Dict:
    """Calculate basic portfolio metrics"""

    total_value = sum(p["quantity"] * p["current_price"] for p in positions)
    if total_value == 0:
        return {}

    # Calculate portfolio weights
    weights = {}
    for pos in positions:
        symbol = pos["symbol"]
        position_value = pos["quantity"] * pos["current_price"]
        weights[symbol] = position_value / total_value

    # Calculate returns
    total_return = sum(
        (p["current_price"] - p.get("entry_price", p["current_price"]))
        * p["quantity"]
        for p in positions
    )
    return_percent = (total_return / total_value * 100) if total_value > 0 else 0

    # Portfolio risk (assumed standard deviation)
    portfolio_volatility = calculate_portfolio_volatility(positions)

    # Sharpe Ratio
    excess_return = (return_percent / 100) - risk_free_rate
    sharpe_ratio = excess_return / portfolio_volatility if portfolio_volatility > 0 else 0

    return {
        "total_value": round(total_value, 2),
        "total_return": round(total_return, 2),
        "return_percent": round(return_percent, 2),
        "weights": {k: round(v, 4) for k, v in weights.items()},
        "volatility": round(portfolio_volatility, 4),
        "sharpe_ratio": round(sharpe_ratio, 4),
        "num_positions": len(positions),
    }


def calculate_portfolio_volatility(positions: List[Dict]) -> float:
    """Calculate portfolio volatility (simplified version)"""
    # Weighted average of individual asset volatilities (correlation ignored)
    if not positions:
        return 0

    total_value = sum(p["quantity"] * p["current_price"] for p in positions)
    if total_value == 0:
        return 0

    weighted_vol = 0
    for pos in positions:
        position_value = pos["quantity"] * pos["current_price"]
        weight = position_value / total_value
        # Simulation: annual volatility per symbol (in production, calculated from historical data)
        annual_volatility = 0.20 + (hash(pos["symbol"]) % 10) * 0.02  # 20-38% range
        weighted_vol += weight * annual_volatility

    return weighted_vol


def get_asset_allocation(positions: List[Dict]) -> Dict:
    """Analyze asset allocation"""
    total_value = sum(p["quantity"] * p["current_price"] for p in positions)
    if total_value == 0:
        return {"allocation": []}

    # Asset class classification (simulated)
    asset_classes = {
        "Stocks": {"value": 0, "symbols": []},
        "ETFs": {"value": 0, "symbols": []},
        "Bonds": {"value": 0, "symbols": []},
        "Crypto": {"value": 0, "symbols": []},
    }

    # Symbol-based classification
    for pos in positions:
        position_value = pos["quantity"] * pos["current_price"]
        symbol = pos["symbol"]

        if symbol.endswith("D") or symbol.endswith("Q"):  # bond-related
            asset_classes["Bonds"]["value"] += position_value
            asset_classes["Bonds"]["symbols"].append(symbol)
        elif symbol.startswith("B"):  # crypto-related
            asset_classes["Crypto"]["value"] += position_value
            asset_classes["Crypto"]["symbols"].append(symbol)
        elif len(symbol) > 3 or symbol.endswith("F"):  # ETF
            asset_classes["ETFs"]["value"] += position_value
            asset_classes["ETFs"]["symbols"].append(symbol)
        else:  # stocks
            asset_classes["Stocks"]["value"] += position_value
            asset_classes["Stocks"]["symbols"].append(symbol)

    allocation = []
    for asset_class, data in asset_classes.items():
        if data["value"] > 0:
            allocation.append({
                "asset_class": asset_class,
                "value": round(data["value"], 2),
                "percent": round((data["value"] / total_value) * 100, 2),
                "symbols": data["symbols"],
            })

    return {
        "total_value": round(total_value, 2),
        "allocation": sorted(allocation, key=lambda x: x["value"], reverse=True),
    }


def get_sector_analysis(positions: List[Dict]) -> Dict:
    """Analyze sector exposure"""
    total_value = sum(p["quantity"] * p["current_price"] for p in positions)
    if total_value == 0:
        return {"sectors": []}

    # Sector classification (simulated)
    sector_map = {
        "AAPL": "Technology",
        "MSFT": "Technology",
        "NVDA": "Technology",
        "JPM": "Financials",
        "BAC": "Financials",
        "JNJ": "Healthcare",
        "PFE": "Healthcare",
        "XOM": "Energy",
        "CVX": "Energy",
        "MCD": "Consumer Discretionary",
        "WMT": "Consumer Staples",
        "SPY": "Multi-Sector",
        "QQQ": "Technology",
        "IWM": "Small Cap",
        "BND": "Fixed Income",
    }

    sectors = {}
    for pos in positions:
        position_value = pos["quantity"] * pos["current_price"]
        symbol = pos["symbol"]

        sector = sector_map.get(symbol, "Other")

        if sector not in sectors:
            sectors[sector] = {"value": 0, "symbols": []}

        sectors[sector]["value"] += position_value
        sectors[sector]["symbols"].append(symbol)

    sector_list = []
    for sector, data in sectors.items():
        sector_list.append({
            "sector": sector,
            "value": round(data["value"], 2),
            "percent": round((data["value"] / total_value) * 100, 2),
            "symbols": data["symbols"],
            "num_holdings": len(data["symbols"]),
        })

    return {
        "total_value": round(total_value, 2),
        "sectors": sorted(sector_list, key=lambda x: x["value"], reverse=True),
        "num_sectors": len(sectors),
    }


def calculate_correlation_matrix(symbols: List[str]) -> Dict:
    """Calculate a correlation matrix"""
    # Simulated data
    correlations = {}

    for i, sym1 in enumerate(symbols):
        for j, sym2 in enumerate(symbols):
            if i <= j:
                # Same symbol: 1.0
                if sym1 == sym2:
                    corr = 1.0
                # Same sector: high correlation
                elif (sym1 in ["AAPL", "MSFT", "NVDA"] and sym2 in ["AAPL", "MSFT", "NVDA"]) or \
                     (sym1 in ["SPY", "QQQ"] and sym2 in ["SPY", "QQQ"]):
                    corr = 0.7 + (hash(f"{sym1}{sym2}") % 10) * 0.02
                # Different sector: low correlation
                else:
                    corr = 0.3 + (hash(f"{sym1}{sym2}") % 10) * 0.05

                correlations[f"{sym1}-{sym2}"] = round(min(max(corr, -1), 1), 3)

    return correlations


def get_performance_attribution(
    positions: List[Dict],
    returns: Dict,  # {"AAPL": 0.05, "MSFT": 0.03, ...}
) -> Dict:
    """Analyze performance attribution"""
    total_value = sum(p["quantity"] * p["current_price"] for p in positions)
    if total_value == 0:
        return {"attribution": []}

    attribution = []

    for pos in positions:
        position_value = pos["quantity"] * pos["current_price"]
        weight = position_value / total_value
        symbol = pos["symbol"]
        return_pct = returns.get(symbol, 0.0)

        # Contribution = weight × return
        contribution = weight * return_pct

        attribution.append({
            "symbol": symbol,
            "weight": round(weight, 4),
            "return_percent": round(return_pct * 100, 2),
            "contribution_percent": round(contribution * 100, 2),
            "value": round(position_value, 2),
        })

    total_contribution = sum(a["contribution_percent"] for a in attribution)

    return {
        "total_value": round(total_value, 2),
        "total_return_percent": round(total_contribution, 2),
        "attribution": sorted(attribution, key=lambda x: x["contribution_percent"], reverse=True),
    }


def calculate_efficient_frontier(
    symbols: List[str],
    num_portfolios: int = 100,
) -> Dict:
    """Calculate the Efficient Frontier"""
    import random

    portfolios = []

    for _ in range(num_portfolios):
        # Generate random weights
        weights = [random.random() for _ in symbols]
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]

        # Calculate portfolio return (simulated)
        expected_returns = [0.05 + (hash(sym) % 10) * 0.01 for sym in symbols]  # 5-14%
        portfolio_return = sum(w * r for w, r in zip(weights, expected_returns))

        # Calculate portfolio risk (simulated)
        individual_volatilities = [0.15 + (hash(sym) % 10) * 0.02 for sym in symbols]  # 15-35%
        portfolio_volatility = sum(w * v for w, v in zip(weights, individual_volatilities)) * 0.8  # assumed correlation

        # Sharpe Ratio
        risk_free_rate = 0.05
        sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_volatility if portfolio_volatility > 0 else 0

        portfolios.append({
            "return_percent": round(portfolio_return * 100, 2),
            "volatility_percent": round(portfolio_volatility * 100, 2),
            "sharpe_ratio": round(sharpe_ratio, 3),
            "weights": {sym: round(w, 4) for sym, w in zip(symbols, weights)},
        })

    # Find the portfolio with the highest Sharpe Ratio
    optimal_portfolio = max(portfolios, key=lambda x: x["sharpe_ratio"])

    # Find the minimum-risk portfolio
    min_risk_portfolio = min(portfolios, key=lambda x: x["volatility_percent"])

    # Find the maximum-return portfolio
    max_return_portfolio = max(portfolios, key=lambda x: x["return_percent"])

    return {
        "portfolios": portfolios,
        "optimal_portfolio": optimal_portfolio,
        "min_risk_portfolio": min_risk_portfolio,
        "max_return_portfolio": max_return_portfolio,
    }


def get_dividend_analysis(positions: List[Dict]) -> Dict:
    """Analyze dividends"""
    # Simulated dividend yields
    dividend_yields = {
        "AAPL": 0.005,
        "MSFT": 0.009,
        "JNJ": 0.027,
        "PFE": 0.064,
        "WMT": 0.024,
        "MCD": 0.024,
        "KO": 0.029,
        "PG": 0.025,
        "SPY": 0.015,
        "BND": 0.035,
    }

    total_value = sum(p["quantity"] * p["current_price"] for p in positions)
    total_annual_dividend = 0
    dividend_breakdown = []

    for pos in positions:
        symbol = pos["symbol"]
        position_value = pos["quantity"] * pos["current_price"]
        yield_rate = dividend_yields.get(symbol, 0.0)

        annual_dividend = position_value * yield_rate
        total_annual_dividend += annual_dividend

        if yield_rate > 0:
            dividend_breakdown.append({
                "symbol": symbol,
                "yield_percent": round(yield_rate * 100, 2),
                "annual_dividend": round(annual_dividend, 2),
                "position_value": round(position_value, 2),
            })

    avg_yield = (total_annual_dividend / total_value * 100) if total_value > 0 else 0

    return {
        "total_value": round(total_value, 2),
        "total_annual_dividend": round(total_annual_dividend, 2),
        "average_yield_percent": round(avg_yield, 2),
        "dividend_breakdown": sorted(dividend_breakdown, key=lambda x: x["annual_dividend"], reverse=True),
    }


def get_risk_metrics(positions: List[Dict]) -> Dict:
    """Calculate risk metrics"""
    if not positions:
        return {}

    total_value = sum(p["quantity"] * p["current_price"] for p in positions)

    # Value at Risk (VaR) 95% - 1 day
    daily_volatility = 0.015  # assumed 1.5% daily
    var_95_1day = total_value * 1.645 * daily_volatility

    # Maximum Drawdown (simulated)
    max_drawdown = total_value * 0.25  # assumed 25% maximum loss

    # Concentration Risk
    largest_position = max((p["quantity"] * p["current_price"]) / total_value for p in positions) if positions else 0

    return {
        "total_value": round(total_value, 2),
        "portfolio_volatility_daily_percent": round(daily_volatility * 100, 2),
        "var_95_1day": round(var_95_1day, 2),
        "var_95_percent": round((var_95_1day / total_value) * 100, 2),
        "max_drawdown": round(max_drawdown, 2),
        "max_drawdown_percent": round((max_drawdown / total_value) * 100, 2),
        "concentration_risk_percent": round(largest_position * 100, 2),
    }


def get_rebalance_recommendations(
    positions: List[Dict],
    target_allocation: Dict,  # {"Stocks": 0.60, "Bonds": 0.40}
) -> Dict:
    """Generate rebalancing recommendations"""
    total_value = sum(p["quantity"] * p["current_price"] for p in positions)

    current_allocation = get_asset_allocation(positions)
    current_alloc_dict = {a["asset_class"]: a["percent"] / 100 for a in current_allocation["allocation"]}

    recommendations = []

    for asset_class, target_pct in target_allocation.items():
        current_pct = current_alloc_dict.get(asset_class, 0)
        difference = target_pct - current_pct
        dollar_difference = difference * total_value

        if abs(difference) > 0.05:  # recommend if deviation exceeds 5%
            recommendations.append({
                "asset_class": asset_class,
                "target_percent": round(target_pct * 100, 2),
                "current_percent": round(current_pct * 100, 2),
                "difference_percent": round(difference * 100, 2),
                "action": "INCREASE" if difference > 0 else "DECREASE",
                "dollar_amount": round(abs(dollar_difference), 2),
            })

    return {
        "total_value": round(total_value, 2),
        "recommendations": sorted(recommendations, key=lambda x: abs(x["difference_percent"]), reverse=True),
        "needs_rebalancing": len(recommendations) > 0,
    }
