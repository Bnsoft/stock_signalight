"""Signalight Engine - Core trading platform engine"""

__version__ = "1.0.0"
__author__ = "Signalight Team"

# Import main modules for easy access
from . import store
from . import alerts_advanced
from . import stock_screener
from . import backtesting
from . import portfolio_analyzer
from . import options_analysis
from . import news_data
from . import market_data
from . import advanced_trading
from . import broker_integrations
from . import data_export
from . import realtime_updates

__all__ = [
    "store",
    "alerts_advanced",
    "stock_screener",
    "backtesting",
    "portfolio_analyzer",
    "options_analysis",
    "news_data",
    "market_data",
    "advanced_trading",
    "broker_integrations",
    "data_export",
    "realtime_updates",
]
