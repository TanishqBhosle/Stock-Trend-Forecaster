from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
import pandas as pd
from app.db.database import get_db
from app.core.config import settings
from app.services.data_service import data_service
from app.services.forecast_service import forecast_service
from app.services.evaluation_service import evaluation_service
from app.services.prediction_service import prediction_service
from app.services.training_service import training_service
from app.core.logging import logger

router = APIRouter(prefix="/v1", tags=["Frontend Compatibility V1"])


@router.get("/health")
def v1_health():
    is_trained = training_service.is_model_trained()
    summary = {}
    try:
        summary = data_service.get_summary()
    except Exception:
        pass
    return {
        "status": "ok",
        "mocks": False,
        "modelLoaded": is_trained,
        "modelVersion": "lstm-v1.0" if is_trained else "not_trained",
        "activeAsset": settings.TICKER,
        "latestMarketDate": summary.get("latestMarketDate")
    }


@router.get("/stocks")
def v1_stocks():
    summary = data_service.get_summary()
    forecast = None
    if training_service.is_model_trained():
        try:
            forecast = forecast_service.generate_next_session_forecast(save_to_db=False)
        except Exception:
            pass

    return [
        {
            "ticker": "^GSPC",
            "name": "S&P 500 Index",
            "sector": "Index",
            "exchange": "INDEX",
            "currency": "USD",
            "isPrimaryModelAsset": True,
            "mockPrice": summary["currentPrice"],
            "currentPrice": summary["currentPrice"],
            "mockChange": summary["change"],
            "change": summary["change"],
            "mockChangePct": summary["changePct"],
            "changePct": summary["changePct"],
            "mockReturn": forecast["predictedReturn"] if forecast else 0.0,
            "predictedReturn": forecast["predictedReturn"] if forecast else 0.0,
            "mockSignal": forecast["trendSignal"] if forecast else "NEUTRAL",
            "latestSignal": forecast["trendSignal"] if forecast else "NEUTRAL",
            "marketStatus": "CLOSED",
            "lastUpdated": summary["lastRefreshedAt"]
        }
    ]


@router.get("/stocks/{ticker}")
def v1_stock_detail(ticker: str):
    clean = ticker.upper()
    summary = data_service.get_summary()
    forecast = None
    if training_service.is_model_trained():
        try:
            forecast = forecast_service.generate_next_session_forecast(save_to_db=False)
        except Exception:
            pass

    is_primary = (clean == "^GSPC" or clean == "GSPC")
    price = summary["currentPrice"] if is_primary else 100.0
    change = summary["change"] if is_primary else 0.0
    change_pct = summary["changePct"] if is_primary else 0.0

    return {
        "ticker": ticker,
        "name": "S&P 500 Index" if is_primary else f"{ticker} Stock",
        "sector": "Index" if is_primary else "Equities",
        "exchange": "INDEX" if is_primary else "NASDAQ",
        "currency": "USD",
        "isPrimaryModelAsset": is_primary,
        "mockPrice": price,
        "currentPrice": price,
        "mockChange": change,
        "change": change,
        "mockChangePct": change_pct,
        "changePct": change_pct,
        "mockReturn": forecast["predictedReturn"] if (is_primary and forecast) else 0.0,
        "predictedReturn": forecast["predictedReturn"] if (is_primary and forecast) else 0.0,
        "mockSignal": forecast["trendSignal"] if (is_primary and forecast) else "NEUTRAL",
        "latestSignal": forecast["trendSignal"] if (is_primary and forecast) else "NEUTRAL",
        "marketStatus": "CLOSED",
        "lastUpdated": summary["lastRefreshedAt"]
    }


@router.get("/stocks/{ticker}/ohlcv")
def v1_stock_ohlcv(
    ticker: str,
    range: str = Query("1Y", pattern="^(1M|3M|6M|1Y|MAX)$")
):
    df = data_service.load_cached_data()
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

    rows = [
        {
            "date": str(r["Date"]),
            "open": round(float(r["Open"]), 2),
            "high": round(float(r["High"]), 2),
            "low": round(float(r["Low"]), 2),
            "close": round(float(r["Close"]), 2),
            "adjClose": round(float(r["Adj Close"]), 2),
            "volume": int(r["Volume"])
        }
        for _, r in df.iterrows()
    ]
    return {
        "ticker": ticker,
        "range": range,
        "data": rows
    }


@router.get("/forecast/{ticker}")
def v1_forecast_ticker(ticker: str):
    clean = ticker.upper()
    if clean not in ["^GSPC", "GSPC"]:
        raise HTTPException(
            status_code=400,
            detail=f"Single-asset model only supports ^GSPC. Requested ticker: {ticker}"
        )

    fc = forecast_service.generate_next_session_forecast(save_to_db=False)
    # Adapt response format
    return {
        "ticker": fc["ticker"],
        "asOfDate": fc["originDate"],
        "forecastDate": fc["forecastDate"],
        "forecastFor": fc["forecastFor"],
        "observedClose": fc["referenceClose"],
        "lastObservedClose": fc["referenceClose"],
        "predictedReturn": fc["predictedReturn"],
        "predictedClose": fc["predictedClose"],
        "expectedMovement": fc["expectedMovement"],
        "trendClassification": fc["trendSignal"],
        "signal": fc["trendSignal"],
        "confidenceScore": None,
        "modelVersion": fc["modelVersion"],
        "lookbackDays": fc["lookbackDays"],
        "featureCount": fc["inputFeatureCount"],
        "disclaimer": fc["disclaimer"]
    }


@router.get("/performance")
def v1_performance():
    metrics = evaluation_service.get_metrics()
    if not metrics.get("available"):
        return {
            "available": False,
            "reason": "Model artifacts not present. Train the model to generate evaluation results."
        }
    tm = metrics["testMetrics"]
    return {
        "available": True,
        "evaluatedOn": metrics.get("evaluatedAt", "")[:10],
        "testDateRange": f"{tm.get('startDate')} to {tm.get('endDate')}",
        "testSampleCount": tm.get("sampleCount"),
        "metrics": {
            "lstm": {
                "rmse": round(tm["rmse"], 6),
                "mae": round(tm["mae"], 6),
                "directionalAccuracy": round(tm["directionalAccuracy"] / 100.0, 4)
            }
        }
    }


@router.get("/predictions/{ticker}")
def v1_predictions_ticker(
    ticker: str,
    signal: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return prediction_service.get_predictions(
        db=db,
        ticker=ticker,
        signal=signal,
        page=page,
        page_size=pageSize
    )
