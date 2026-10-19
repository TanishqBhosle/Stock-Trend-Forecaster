from typing import List, Optional
from pydantic import BaseModel, Field


class OHLCVItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    adjClose: float
    volume: float


class MarketSummary(BaseModel):
    ticker: str = "^GSPC"
    name: str = "S&P 500 Index"
    currentPrice: float
    previousClose: float
    change: float
    changePct: float
    latestMarketDate: str
    dataStartDate: str
    totalObservations: int
    isStale: bool = False
    lastRefreshedAt: str


class MarketHistoryResponse(BaseModel):
    ticker: str = "^GSPC"
    range: str
    total: int
    data: List[OHLCVItem]


class RefreshResponse(BaseModel):
    status: str
    ticker: str
    rowCount: int
    startDate: str
    endDate: str
    refreshedAt: str
