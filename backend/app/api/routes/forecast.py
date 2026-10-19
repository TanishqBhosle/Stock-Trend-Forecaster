from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.forecast_service import forecast_service
from app.services.prediction_service import prediction_service
from app.schemas.forecast import ForecastResponse, PredictionHistoryResponse
from app.core.logging import logger

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/latest", response_model=ForecastResponse)
def get_latest_forecast():
    """Generates or returns the latest real LSTM forecast for the next trading session."""
    try:
        forecast = forecast_service.generate_next_session_forecast(save_to_db=False)
        return forecast
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=400,
            detail=f"{str(e)} Please run model training before requesting forecasts."
        )
    except Exception as e:
        logger.error(f"Error generating forecast: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast: {str(e)}")


@router.post("/generate", response_model=ForecastResponse)
def generate_forecast():
    """Explicitly triggers generation of a new next-session forecast and persists it in history."""
    try:
        forecast = forecast_service.generate_next_session_forecast(save_to_db=True)
        return forecast
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=400,
            detail=f"{str(e)} Please run model training before requesting forecasts."
        )
    except Exception as e:
        logger.error(f"Error generating forecast: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast: {str(e)}")


@router.get("/history", response_model=PredictionHistoryResponse)
def get_forecast_history(
    ticker: Optional[str] = Query(None, description="Filter by ticker symbol"),
    signal: Optional[str] = Query(None, description="Filter by signal (BULLISH, NEUTRAL, BEARISH)"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Returns paginated historical predictions from the database."""
    try:
        results = prediction_service.get_predictions(
            db=db,
            ticker=ticker,
            signal=signal,
            page=page,
            page_size=pageSize
        )
        return results
    except Exception as e:
        logger.error(f"Error fetching forecast history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch forecast history: {str(e)}")
