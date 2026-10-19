from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.prediction_service import prediction_service
from app.schemas.forecast import PredictionHistoryResponse
from app.core.logging import logger

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("", response_model=PredictionHistoryResponse)
def list_predictions(
    ticker: Optional[str] = Query(None),
    signal: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists saved predictions with pagination and filtering."""
    try:
        return prediction_service.get_predictions(
            db=db,
            ticker=ticker,
            signal=signal,
            page=page,
            page_size=pageSize
        )
    except Exception as e:
        logger.error(f"Error listing predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}", response_model=PredictionHistoryResponse)
def get_ticker_predictions(
    ticker: str,
    signal: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists predictions for a specific ticker."""
    try:
        return prediction_service.get_predictions(
            db=db,
            ticker=ticker,
            signal=signal,
            page=page,
            page_size=pageSize
        )
    except Exception as e:
        logger.error(f"Error listing ticker predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
