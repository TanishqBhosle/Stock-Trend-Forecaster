from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import PredictionRecord
from app.services.data_service import data_service
from app.core.config import settings
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

        # 1. Match pending predictions with realized market outcomes if available
        dirty = False
        try:
            df = data_service.load_cached_data()
            if not df.empty:
                date_to_close = dict(zip(df["Date"].astype(str), df["Close"].astype(float)))
                for r in records:
                    if r.actual_close is None and r.forecast_for in date_to_close:
                        act_close = date_to_close[r.forecast_for]
                        act_return = (act_close / r.reference_close) - 1.0
                        r.actual_close = round(act_close, 2)
                        r.actual_return = round(act_return, 6)
                        
                        # Directional match against configured thresholds
                        if r.signal == "BULLISH":
                            r.is_correct = bool(act_return > settings.BULLISH_THRESHOLD)
                        elif r.signal == "BEARISH":
                            r.is_correct = bool(act_return < settings.BEARISH_THRESHOLD)
                        else:  # NEUTRAL
                            r.is_correct = bool(abs(act_return) <= settings.BULLISH_THRESHOLD)
                        dirty = True
                if dirty:
                    db.commit()
        except Exception as e:
            logger.warning(f"Could not evaluate pending predictions against market data: {e}")

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
