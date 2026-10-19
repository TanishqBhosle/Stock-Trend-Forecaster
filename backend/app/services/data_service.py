import os
import datetime
from pathlib import Path
from typing import Optional, Tuple
import pandas as pd
import numpy as np
import yfinance as yf
from app.core.config import settings
from app.core.logging import logger


class DataService:
    def __init__(self, data_dir: Optional[Path] = None, ticker: str = settings.TICKER):
        self.data_dir = data_dir or settings.DATA_DIR
        self.ticker = ticker
        self.cache_file = self.data_dir / f"{self._clean_ticker(ticker)}.csv"
        self.meta_file = self.data_dir / f"{self._clean_ticker(ticker)}_meta.json"

    @staticmethod
    def _clean_ticker(ticker: str) -> str:
        return ticker.replace("^", "").replace("=", "_").replace("/", "_")

    def download_and_clean_data(
        self,
        start_date: str = settings.START_DATE,
        end_date: Optional[str] = None,
        force_refresh: bool = False
    ) -> pd.DataFrame:
        """
        Downloads S&P 500 (^GSPC) data from Yahoo Finance from start_date to latest available.
        Performs rigorous validation, deduplication, sorting, and caching.
        """
        if not force_refresh and self.cache_file.exists():
            logger.info(f"Loading cached market data from {self.cache_file}")
            df = self.load_cached_data()
            if not df.empty:
                return df

        logger.info(f"Downloading historical data for {self.ticker} from {start_date} to {end_date or 'latest'}")
        try:
            # yfinance download
            raw_data = yf.download(
                tickers=self.ticker,
                start=start_date,
                end=end_date,
                progress=False,
                auto_adjust=False  # We want both unadjusted OHLC and Adj Close
            )
        except Exception as e:
            logger.error(f"Failed to fetch data from Yahoo Finance: {e}")
            if self.cache_file.exists():
                logger.warning("Falling back to existing cached data after network failure.")
                return self.load_cached_data()
            raise RuntimeError(f"Yahoo Finance download failed and no cache is available: {e}")

        if raw_data is None or raw_data.empty:
            if self.cache_file.exists():
                logger.warning("Empty response from Yahoo Finance, falling back to cache.")
                return self.load_cached_data()
            raise ValueError(f"No market data returned for ticker {self.ticker} from {start_date}.")

        # Handle potential MultiIndex columns in yfinance (e.g. ('Close', '^GSPC'))
        if isinstance(raw_data.columns, pd.MultiIndex):
            # Extract level 0 or level matching feature names
            level_0 = [c[0] for c in raw_data.columns]
            raw_data.columns = level_0

        # Normalize column names: ensure Date, Open, High, Low, Close, Adj Close, Volume
        df = raw_data.reset_index()
        # Find Date column
        date_col = None
        for col in df.columns:
            if str(col).lower() in ["date", "datetime"]:
                date_col = col
                break
        if date_col is None:
            raise ValueError(f"Returned data does not contain a recognizable Date column: {df.columns}")

        df.rename(columns={date_col: "Date"}, inplace=True)
        df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")

        # Map required columns
        required_cols = ["Date", "Open", "High", "Low", "Close", "Adj Close", "Volume"]
        # Normalize column mapping
        col_mapping = {}
        for col in df.columns:
            clean_c = str(col).strip().lower()
            if clean_c == "open":
                col_mapping[col] = "Open"
            elif clean_c == "high":
                col_mapping[col] = "High"
            elif clean_c == "low":
                col_mapping[col] = "Low"
            elif clean_c == "close":
                col_mapping[col] = "Close"
            elif clean_c in ["adj close", "adjclose", "adjusted close"]:
                col_mapping[col] = "Adj Close"
            elif clean_c == "volume":
                col_mapping[col] = "Volume"

        df.rename(columns=col_mapping, inplace=True)

        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required market column '{col}' in downloaded data.")

        df = df[required_cols].copy()

        # Sort ascending by Date
        df = df.sort_values(by="Date", ascending=True)

        # Drop duplicate dates
        df = df.drop_duplicates(subset=["Date"], keep="last")

        # Convert numeric columns to float64
        for col in ["Open", "High", "Low", "Close", "Adj Close", "Volume"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Drop rows with non-finite/NaN prices
        df = df.dropna(subset=["Open", "High", "Low", "Close", "Adj Close"])
        df["Volume"] = df["Volume"].fillna(0.0)

        # Basic sanity check: High should be >= Low, Open & Close > 0
        df = df[(df["Open"] > 0) & (df["High"] > 0) & (df["Low"] > 0) & (df["Close"] > 0)]
        df = df[df["High"] >= df["Low"] * 0.999]  # Float precision tolerance

        # Reset index
        df = df.reset_index(drop=True)

        if len(df) < settings.LOOKBACK_WINDOW + 10:
            raise ValueError(
                f"Dataset contains {len(df)} rows, insufficient for lookback window {settings.LOOKBACK_WINDOW}."
            )

        # Cache to disk
        self.data_dir.mkdir(parents=True, exist_ok=True)
        df.to_csv(self.cache_file, index=False)
        logger.info(
            f"Cached {len(df)} cleaned rows for {self.ticker} ({df['Date'].iloc[0]} to {df['Date'].iloc[-1]})"
        )
        return df

    def load_cached_data(self) -> pd.DataFrame:
        if not self.cache_file.exists():
            return self.download_and_clean_data(force_refresh=True)
        df = pd.read_csv(self.cache_file)
        df["Date"] = df["Date"].astype(str)
        return df

    def get_summary(self) -> dict:
        df = self.load_cached_data()
        latest = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else latest
        change = float(latest["Close"] - prev["Close"])
        change_pct = float(change / prev["Close"]) if prev["Close"] != 0 else 0.0

        # Check freshness
        today_str = datetime.date.today().isoformat()
        is_stale = (datetime.date.today() - pd.to_datetime(latest["Date"]).date()).days > 4

        return {
            "ticker": self.ticker,
            "name": "S&P 500 Index",
            "currentPrice": float(latest["Close"]),
            "previousClose": float(prev["Close"]),
            "change": round(change, 2),
            "changePct": round(change_pct, 4),
            "latestMarketDate": str(latest["Date"]),
            "dataStartDate": str(df["Date"].iloc[0]),
            "totalObservations": len(df),
            "isStale": is_stale,
            "lastRefreshedAt": datetime.datetime.fromtimestamp(
                self.cache_file.stat().st_mtime
            ).isoformat() if self.cache_file.exists() else datetime.datetime.utcnow().isoformat()
        }


data_service = DataService()
