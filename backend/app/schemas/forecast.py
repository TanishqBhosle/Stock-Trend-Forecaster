from typing import Optional, List
from pydantic import BaseModel, Field


class ForecastResponse(BaseModel):
    ticker: str = "^GSPC"
    originDate: str  # Latest observed trading date
    forecastDate: str  # Generation date
    forecastFor: str  # Target next trading session date
    referenceClose: float
    predictedReturn: float
    predictedReturnPct: float
    predictedClose: float
    expectedMovement: str
    trendSignal: str  # BULLISH / NEUTRAL / BEARISH
    modelVersion: str
    lookbackDays: int = 60
    inputFeatureCount: int = 6
    isEstimatedDate: bool = True
    disclaimer: str = (
        "Model estimate for educational and research purposes only. "
        "Not a guaranteed price or investment recommendation."
    )


class PredictionRecordSchema(BaseModel):
    id: str
    predictionDate: str
    forecastFor: str
    ticker: str
    predictedDirection: str
    predictedReturn: float
    predictedClose: float
    actualReturn: Optional[float] = None
    actualClose: Optional[float] = None
    correct: Optional[bool] = None
    modelVersion: str
    dataStatus: str = "verified"


class PredictionHistoryResponse(BaseModel):
    total: int
    page: int
    pageSize: int
    records: List[PredictionRecordSchema]
