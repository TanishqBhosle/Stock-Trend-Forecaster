from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import WatchlistItem, PortfolioHolding
from app.schemas.user_data import (
    WatchlistItemCreate,
    WatchlistItemResponse,
    PortfolioHoldingCreate,
    PortfolioHoldingUpdate,
    PortfolioHoldingResponse,
)

router = APIRouter(tags=["User Data"])

# Reference live mock prices for calculating real-time P&L
REFERENCE_PRICES = {
    "^GSPC": 5864.67,
    "AAPL": 224.23,
    "MSFT": 428.15,
    "NVDA": 138.25,
    "AMZN": 186.40,
    "GOOGL": 166.75,
    "META": 582.01,
    "TSLA": 218.80,
}


# ── Watchlist Endpoints ───────────────────────────────────────────────────────

@router.get("/watchlist", response_model=List[WatchlistItemResponse])
def get_watchlist(
    userId: str = Query("default_user", alias="userId"),
    db: Session = Depends(get_db)
):
    """Retrieve all watchlist items for the user."""
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == userId).all()
    # Seed default ^GSPC if user has empty watchlist
    if not items:
        default_item = WatchlistItem(
            user_id=userId,
            ticker="^GSPC",
            name="S&P 500 Index",
            notes="Core benchmark index"
        )
        db.add(default_item)
        db.commit()
        db.refresh(default_item)
        items = [default_item]

    return [
        WatchlistItemResponse(
            id=item.id,
            ticker=item.ticker,
            name=item.name,
            notes=item.notes,
            createdAt=item.created_at.isoformat() if item.created_at else datetime.utcnow().isoformat()
        )
        for item in items
    ]


@router.post("/watchlist", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
def add_watchlist_item(
    item_in: WatchlistItemCreate,
    userId: str = Query("default_user", alias="userId"),
    db: Session = Depends(get_db)
):
    """Add a ticker to the user's persisted watchlist."""
    clean_ticker = item_in.ticker.strip().upper()
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == userId,
        WatchlistItem.ticker == clean_ticker
    ).first()
    if existing:
        return WatchlistItemResponse(
            id=existing.id,
            ticker=existing.ticker,
            name=existing.name,
            notes=existing.notes,
            createdAt=existing.created_at.isoformat() if existing.created_at else datetime.utcnow().isoformat()
        )

    new_item = WatchlistItem(
        user_id=userId,
        ticker=clean_ticker,
        name=item_in.name or clean_ticker,
        notes=item_in.notes
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return WatchlistItemResponse(
        id=new_item.id,
        ticker=new_item.ticker,
        name=new_item.name,
        notes=new_item.notes,
        createdAt=new_item.created_at.isoformat() if new_item.created_at else datetime.utcnow().isoformat()
    )


@router.delete("/watchlist/{ticker}")
def remove_watchlist_item(
    ticker: str,
    userId: str = Query("default_user", alias="userId"),
    db: Session = Depends(get_db)
):
    """Remove a ticker from the user's watchlist."""
    clean_ticker = ticker.strip().upper()
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == userId,
        WatchlistItem.ticker == clean_ticker
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Ticker '{clean_ticker}' not found in watchlist")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Ticker '{clean_ticker}' removed from watchlist"}


# ── Portfolio Endpoints ───────────────────────────────────────────────────────

@router.get("/portfolio", response_model=List[PortfolioHoldingResponse])
def get_portfolio(
    userId: str = Query("default_user", alias="userId"),
    db: Session = Depends(get_db)
):
    """Retrieve all portfolio holdings with calculated real-time valuation and P&L."""
    holdings = db.query(PortfolioHolding).filter(PortfolioHolding.user_id == userId).all()

    # Seed default sample holding if empty
    if not holdings:
        default_holding = PortfolioHolding(
            user_id=userId,
            ticker="^GSPC",
            shares=10.0,
            avg_buy_price=5400.0,
            purchase_date="2024-03-15",
            notes="Initial core index position"
        )
        db.add(default_holding)
        db.commit()
        db.refresh(default_holding)
        holdings = [default_holding]

    results = []
    for h in holdings:
        curr_price = REFERENCE_PRICES.get(h.ticker, h.avg_buy_price)
        total_cost = h.shares * h.avg_buy_price
        market_val = h.shares * curr_price
        pnl = market_val - total_cost
        pnl_pct = (pnl / total_cost) if total_cost > 0 else 0.0

        results.append(
            PortfolioHoldingResponse(
                id=h.id,
                ticker=h.ticker,
                shares=h.shares,
                avgBuyPrice=h.avg_buy_price,
                purchaseDate=h.purchase_date,
                currentPrice=round(curr_price, 2),
                marketValue=round(market_val, 2),
                totalCost=round(total_cost, 2),
                unrealizedPnl=round(pnl, 2),
                unrealizedPnlPct=round(pnl_pct, 4),
                notes=h.notes,
                createdAt=h.created_at.isoformat() if h.created_at else datetime.utcnow().isoformat()
            )
        )
    return results


@router.post("/portfolio", response_model=PortfolioHoldingResponse, status_code=status.HTTP_201_CREATED)
def add_portfolio_holding(
    holding_in: PortfolioHoldingCreate,
    userId: str = Query("default_user", alias="userId"),
    db: Session = Depends(get_db)
):
    """Add a new equity holding to the portfolio."""
    clean_ticker = holding_in.ticker.strip().upper()
    new_h = PortfolioHolding(
        user_id=userId,
        ticker=clean_ticker,
        shares=holding_in.shares,
        avg_buy_price=holding_in.avgBuyPrice,
        purchase_date=holding_in.purchaseDate or datetime.utcnow().strftime("%Y-%m-%d"),
        notes=holding_in.notes
    )
    db.add(new_h)
    db.commit()
    db.refresh(new_h)

    curr_price = REFERENCE_PRICES.get(new_h.ticker, new_h.avg_buy_price)
    total_cost = new_h.shares * new_h.avg_buy_price
    market_val = new_h.shares * curr_price
    pnl = market_val - total_cost
    pnl_pct = (pnl / total_cost) if total_cost > 0 else 0.0

    return PortfolioHoldingResponse(
        id=new_h.id,
        ticker=new_h.ticker,
        shares=new_h.shares,
        avgBuyPrice=new_h.avg_buy_price,
        purchaseDate=new_h.purchase_date,
        currentPrice=round(curr_price, 2),
        marketValue=round(market_val, 2),
        totalCost=round(total_cost, 2),
        unrealizedPnl=round(pnl, 2),
        unrealizedPnlPct=round(pnl_pct, 4),
        notes=new_h.notes,
        createdAt=new_h.created_at.isoformat() if new_h.created_at else datetime.utcnow().isoformat()
    )


@router.put("/portfolio/{holding_id}", response_model=PortfolioHoldingResponse)
def update_portfolio_holding(
    holding_id: int,
    update_in: PortfolioHoldingUpdate,
    userId: str = Query("default_user", alias="userId"),
    db: Session = Depends(get_db)
):
    """Update shares, average price, or notes for a holding."""
    holding = db.query(PortfolioHolding).filter(
        PortfolioHolding.id == holding_id,
        PortfolioHolding.user_id == userId
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    if update_in.shares is not None:
        holding.shares = update_in.shares
    if update_in.avgBuyPrice is not None:
        holding.avg_buy_price = update_in.avgBuyPrice
    if update_in.purchaseDate is not None:
        holding.purchase_date = update_in.purchaseDate
    if update_in.notes is not None:
        holding.notes = update_in.notes

    db.commit()
    db.refresh(holding)

    curr_price = REFERENCE_PRICES.get(holding.ticker, holding.avg_buy_price)
    total_cost = holding.shares * holding.avg_buy_price
    market_val = holding.shares * curr_price
    pnl = market_val - total_cost
    pnl_pct = (pnl / total_cost) if total_cost > 0 else 0.0

    return PortfolioHoldingResponse(
        id=holding.id,
        ticker=holding.ticker,
        shares=holding.shares,
        avgBuyPrice=holding.avg_buy_price,
        purchaseDate=holding.purchase_date,
        currentPrice=round(curr_price, 2),
        marketValue=round(market_val, 2),
        totalCost=round(total_cost, 2),
        unrealizedPnl=round(pnl, 2),
        unrealizedPnlPct=round(pnl_pct, 4),
        notes=holding.notes,
        createdAt=holding.created_at.isoformat() if holding.created_at else datetime.utcnow().isoformat()
    )


@router.delete("/portfolio/{holding_id}")
def delete_portfolio_holding(
    holding_id: int,
    userId: str = Query("default_user", alias="userId"),
    db: Session = Depends(get_db)
):
    """Delete a holding from the portfolio."""
    holding = db.query(PortfolioHolding).filter(
        PortfolioHolding.id == holding_id,
        PortfolioHolding.user_id == userId
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    db.delete(holding)
    db.commit()
    return {"status": "success", "message": f"Holding ID {holding_id} deleted"}

