import datetime
from fastapi import APIRouter
from app.core.config import settings
from app.services.training_service import training_service
from app.services.data_service import data_service

router = APIRouter(tags=["Health & Status"])


@router.get("/health")
def get_health():
    """Returns basic service health status."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }


@router.get("/status")
def get_detailed_status():
    """
    Returns detailed system status, model availability, latest market date,
    data freshness, and artifact availability.
    """
    model_trained = training_service.is_model_trained()
    job_status = training_service.get_status()
    
    market_summary = {}
    try:
        market_summary = data_service.get_summary()
    except Exception:
        market_summary = {"status": "uninitialized"}

    return {
        "apiStatus": "operational",
        "modelAvailability": model_trained,
        "modelVersion": "lstm-v1.0" if model_trained else None,
        "activeTicker": settings.TICKER,
        "latestMarketDate": market_summary.get("latestMarketDate"),
        "totalObservations": market_summary.get("totalObservations"),
        "isDataStale": market_summary.get("isStale", True),
        "dataLastRefreshedAt": market_summary.get("lastRefreshedAt"),
        "activeTrainingJob": job_status
    }
