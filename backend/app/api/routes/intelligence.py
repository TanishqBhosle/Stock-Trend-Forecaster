from fastapi import APIRouter, Query
from app.services.market_intelligence_service import market_intelligence_service

router = APIRouter(prefix="/intelligence", tags=["Market Intelligence & Macro"])


@router.get("/sectors")
def get_sectors_overview():
    """Returns real-time performance, market breadth, and rotation insights for the 11 S&P 500 GICS sectors."""
    return market_intelligence_service.get_sectors()


@router.get("/news")
def get_macro_news(limit: int = Query(default=12, ge=1, le=30)):
    """Returns live macroeconomic news with AI sentiment scores and educational context tooltips."""
    return market_intelligence_service.get_news_feed(limit=limit)

