from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class EvaluationMetrics(BaseModel):
    rmse: float  # Decimal return RMSE
    mae: float  # Decimal return MAE
    directionalAccuracy: float  # In percent, e.g. 54.2%
    sampleCount: int
    startDate: str
    endDate: str
    evaluationType: str


class PredictionPoint(BaseModel):
    date: str
    originDate: Optional[str] = None
    actualReturn: float
    predictedReturn: float
    actualClose: float
    predictedClose: float
    actualDirection: str
    predictedDirection: str
    isCorrect: bool


class EvaluationResponse(BaseModel):
    metrics: EvaluationMetrics
    predictions: List[PredictionPoint]
    note: Optional[str] = None


class WalkForwardRunRequest(BaseModel):
    stepSize: int = 1
    maxSteps: Optional[int] = None  # None for full test split
