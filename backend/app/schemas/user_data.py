from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class WatchlistItemCreate(BaseModel):
    ticker: str = Field(..., max_length=20)
    name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class WatchlistItemResponse(BaseModel):
    id: int
    ticker: str
    name: Optional[str] = None
    notes: Optional[str] = None
    createdAt: str

    class Config:
        from_attributes = True


class PortfolioHoldingCreate(BaseModel):
    ticker: str = Field(..., max_length=20)
    shares: float = Field(..., gt=0)
    avgBuyPrice: float = Field(..., gt=0)
    purchaseDate: Optional[str] = None
    notes: Optional[str] = None


class PortfolioHoldingUpdate(BaseModel):
    shares: Optional[float] = Field(None, gt=0)
    avgBuyPrice: Optional[float] = Field(None, gt=0)
    purchaseDate: Optional[str] = None
    notes: Optional[str] = None


class PortfolioHoldingResponse(BaseModel):
    id: int
    ticker: str
    shares: float
    avgBuyPrice: float
    purchaseDate: Optional[str] = None
    currentPrice: Optional[float] = None
    marketValue: Optional[float] = None
    totalCost: Optional[float] = None
    unrealizedPnl: Optional[float] = None
    unrealizedPnlPct: Optional[float] = None
    notes: Optional[str] = None
    createdAt: str

    class Config:
        from_attributes = True

