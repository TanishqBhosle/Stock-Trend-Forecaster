from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import PredictionRecord
from app.core.logging import logger


class PredictionService:
    def get_predictions(
        self,
        db: Session,
        ticker: Optional[str] = None,
        signal: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        query = db.query(PredictionRecord)
        if ticker:
            query = query.filter(PredictionRecord.ticker.ilike(ticker))
        if signal and signal.upper() != "ALL":
            query = query.filter(PredictionRecord.signal == signal.upper())

        total = query.count()
        records = (
            query.order_by(PredictionRecord.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        formatted = [
            {
                "id": str(r.id),
                "predictionDate": r.forecast_date,
                "forecastFor": r.forecast_for,
                "ticker": r.ticker,
                "predictedDirection": r.signal,
                "predictedReturn": round(r.predicted_return, 4),
                "predictedClose": round(r.predicted_close, 2),
                "actualReturn": round(r.actual_return, 4) if r.actual_return is not None else None,
                "actualClose": round(r.actual_close, 2) if r.actual_close is not None else None,
                "correct": r.is_correct,
                "modelVersion": r.model_version,
                "dataStatus": "verified"
            }
            for r in records
        ]

        return {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "records": formatted
        }


prediction_service = PredictionService()
