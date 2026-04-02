import time
import logging
import yfinance as yf
import pandas as pd
from src.config import WATCHLIST

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BACKOFF = 2  # seconds


def fetch_daily_data(symbol: str, period: str = "6mo") -> pd.DataFrame:
    """Fetch OHLCV daily data for a symbol. Returns empty DataFrame on failure."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            df = yf.download(symbol, period=period, auto_adjust=True, progress=False)
            if df.empty:
                logger.warning(f"{symbol}: no data returned")
                return pd.DataFrame()
            # yfinance may return MultiIndex columns — flatten to single level
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [c[0].lower() for c in df.columns]
            else:
                df.columns = [c.lower() for c in df.columns]
            df.index.name = "date"
            return df
        except Exception as e:
            logger.warning(f"{symbol}: attempt {attempt} failed — {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF * attempt)
    logger.error(f"{symbol}: all {MAX_RETRIES} attempts failed")
    return pd.DataFrame()


def fetch_current_price(symbol: str) -> float | None:
    """Fetch the latest closing price for a symbol."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            price = info.last_price
            if price and price > 0:
                return round(float(price), 4)
            # Fallback: last row of 5d daily data
            df = fetch_daily_data(symbol, period="5d")
            if not df.empty:
                return round(float(df["close"].iloc[-1]), 4)
            return None
        except Exception as e:
            logger.warning(f"{symbol}: price attempt {attempt} failed — {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF * attempt)
    logger.error(f"{symbol}: could not fetch price")
    return None


def fetch_all_watchlist(period: str = "6mo") -> dict[str, pd.DataFrame]:
    """Batch-fetch daily data for all watchlist symbols.
    Returns dict of {symbol: DataFrame}.
    """
    results = {}
    symbols = [entry["symbol"] for entry in WATCHLIST]
    for symbol in symbols:
        logger.info(f"Fetching {symbol}...")
        df = fetch_daily_data(symbol, period=period)
        results[symbol] = df
    return results
