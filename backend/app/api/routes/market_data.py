from typing import Optional
import datetime
import pandas as pd
from fastapi import APIRouter, Query, HTTPException
from app.services.data_service import data_service
from app.schemas.market import MarketSummary, MarketHistoryResponse, RefreshResponse
from app.core.logging import logger

router = APIRouter(prefix="/market", tags=["Market Data"])


@router.get("/summary", response_model=MarketSummary)
def get_market_summary():
    """Returns the latest market summary for S&P 500 (^GSPC)."""
    try:
        summary = data_service.get_summary()
        return summary
    except Exception as e:
        logger.error(f"Error fetching market summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market summary: {str(e)}")


@router.get("/history", response_model=MarketHistoryResponse)
def get_market_history(
    range: str = Query("1Y", description="Time range: 1M, 3M, 6M, 1Y, MAX", pattern="^(1M|3M|6M|1Y|MAX)$"),
    limit: Optional[int] = Query(None, description="Max rows to return")
):
    """Returns historical OHLCV data filtered by time range."""
    try:
        df = data_service.load_cached_data()
        if df.empty:
            df = data_service.download_and_clean_data()

        # Date range filtering
        if range != "MAX" and not df.empty:
            last_date = pd.to_datetime(df["Date"].iloc[-1])
            if range == "1M":
                cutoff = last_date - pd.DateOffset(months=1)
            elif range == "3M":
                cutoff = last_date - pd.DateOffset(months=3)
            elif range == "6M":
                cutoff = last_date - pd.DateOffset(months=6)
            elif range == "1Y":
                cutoff = last_date - pd.DateOffset(years=1)
            else:
                cutoff = None

            if cutoff is not None:
                df = df[pd.to_datetime(df["Date"]) >= cutoff]

        if limit is not None and limit > 0:
            df = df.tail(limit)

        items = [
            {
                "date": str(row["Date"]),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "adjClose": round(float(row["Adj Close"]), 2),
                "volume": int(row["Volume"])
            }
            for _, row in df.iterrows()
        ]

        return {
            "ticker": data_service.ticker,
            "range": range,
            "total": len(items),
            "data": items
        }
    except Exception as e:
        logger.error(f"Error fetching market history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market history: {str(e)}")


@router.post("/refresh", response_model=RefreshResponse)
def refresh_market_data():
    """Triggers an on-demand download of the latest market data from Yahoo Finance."""
    try:
        df = data_service.download_and_clean_data(force_refresh=True)
        return {
            "status": "success",
            "ticker": data_service.ticker,
            "rowCount": len(df),
            "startDate": str(df["Date"].iloc[0]),
            "endDate": str(df["Date"].iloc[-1]),
            "refreshedAt": datetime.datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error refreshing market data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh market data: {str(e)}")
