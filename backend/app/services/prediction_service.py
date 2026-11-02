import os
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import PredictionRecord
from app.services.data_service import data_service
from app.core.config import settings
from app.core.logging import logger


class PredictionService:
    @staticmethod
    def get_divergence_diagnostics(
        pred_ret: float,
        act_ret: Optional[float],
        is_correct: Optional[bool]
    ) -> Dict[str, str]:
        """Provides financial & machine learning diagnostic post-mortem on divergence."""
        if act_ret is None:
            return {
                "divergenceType": "Pending Settlement",
                "divergenceExplanation": "Active market session in progress. Divergence diagnostics will calculate automatically upon market close.",
                "volatilityRegime": "Awaiting Session Close"
            }

        diff_pct = abs(pred_ret - act_ret) * 100
        threshold_pct = abs(settings.BULLISH_THRESHOLD) * 100

        if is_correct is True:
            return {
                "divergenceType": "Direction Matched",
                "divergenceExplanation": f"The LSTM model correctly called the market's directional trend within {diff_pct:.2f}% residual variance.",
                "volatilityRegime": "Normal Volatility Regime" if diff_pct < 0.5 else "Elevated Session Dispersion"
            }

        # Divergent cases:
        if pred_ret >= 0 and act_ret < settings.BEARISH_THRESHOLD:
            return {
                "divergenceType": "Downside Volatility Shock",
                "divergenceExplanation": (
                    f"The model anticipated low-volatility drift (+{pred_ret*100:.2f}%), but unexpected selling pushed the market down {act_ret*100:.2f}%. "
                    f"Typical catalysts include intraday macro surprises (CPI, Fed commentary), bond yield spikes, or broad tech-led risk-off rotations."
                ),
                "volatilityRegime": "High Volatility Sell-Off"
            }
        elif pred_ret <= 0 and act_ret > settings.BULLISH_THRESHOLD:
            return {
                "divergenceType": "Upside Breakout Divergence",
                "divergenceExplanation": (
                    f"The model anticipated muted or negative price action ({pred_ret*100:.2f}%), but an aggressive rally produced a +{act_ret*100:.2f}% gain. "
                    f"Common catalysts include short-covering rallies, dovish policy signals, or unexpected positive earnings announcements."
                ),
                "volatilityRegime": "Bullish Breakout Dispersion"
            }
        else:
            return {
                "divergenceType": "Threshold Boundary Drift",
                "divergenceExplanation": (
                    f"The prediction and actual outcome landed near the classification boundary (pred: {pred_ret*100:.2f}%, act: {act_ret*100:.2f}%), "
                    f"differing by {diff_pct:.2f}% against the ±{threshold_pct:.2f}% threshold."
                ),
                "volatilityRegime": "Compressed Volatility Drift"
            }

    def seed_historical_test_predictions(self, db: Session) -> None:
        """Seeds verified historical LSTM test predictions into the database if empty or sparse."""
        try:
            count = db.query(PredictionRecord).count()
            if count >= 50:
                return

            artifacts_dir = settings.ARTIFACTS_DIR
            test_path = os.path.join(artifacts_dir, "test_predictions.json")
            if not os.path.exists(test_path):
                return

            with open(test_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if not isinstance(data, list) or len(data) == 0:
                return

            logger.info(f"Seeding {len(data)} verified historical predictions into Neon database...")
            existing_dates = set(
                d[0] for d in db.query(PredictionRecord.forecast_for).all()
            )

            records = []
            for item in data:
                date_str = item.get("date")
                if not date_str or date_str in existing_dates:
                    continue

                act_close = float(item.get("actualClose", 0.0))
                act_return = float(item.get("actualReturn", 0.0))
                pred_close = float(item.get("predictedClose", 0.0))
                pred_return = float(item.get("predictedReturn", 0.0))
                pred_dir = item.get("predictedDirection", "NEUTRAL")
                is_corr = item.get("isCorrect")

                ref_close = round(act_close / (1.0 + act_return), 2) if (1.0 + act_return) != 0 else act_close

                records.append(
                    PredictionRecord(
                        ticker="^GSPC",
                        origin_date=date_str,
                        forecast_date=date_str,
                        forecast_for=date_str,
                        reference_close=ref_close,
                        predicted_return=pred_return,
                        predicted_close=pred_close,
                        signal=pred_dir,
                        actual_return=act_return,
                        actual_close=act_close,
                        is_correct=is_corr,
                        model_version="lstm-v1.0"
                    )
                )

            if records:
                db.bulk_save_objects(records)
                db.commit()
                logger.info(f"Successfully seeded {len(records)} historical predictions into DB.")
        except Exception as e:
            db.rollback()
            logger.warning(f"Could not seed historical test predictions: {e}")

    def get_predictions(
        self,
        db: Session,
        ticker: Optional[str] = None,
        signal: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        # 1. Seed historical predictions if DB is freshly created or empty
        self.seed_historical_test_predictions(db)

        query = db.query(PredictionRecord)
        if ticker:
            clean_ticker = ticker.strip().upper()
            if clean_ticker.startswith("^"):
                clean_ticker = clean_ticker[1:]
            query = query.filter(
                (PredictionRecord.ticker.ilike(f"%{clean_ticker}%")) |
                (PredictionRecord.ticker.ilike(f"%^{clean_ticker}%"))
            )
        if signal and signal.upper() != "ALL":
            query = query.filter(PredictionRecord.signal == signal.upper())

        total = query.count()
        records = (
            query.order_by(PredictionRecord.forecast_for.desc(), PredictionRecord.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        # 2. Match pending predictions with realized market outcomes if available
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

        formatted = []
        for r in records:
            diag = self.get_divergence_diagnostics(r.predicted_return, r.actual_return, r.is_correct)
            formatted.append({
                "id": str(r.id),
                "predictionDate": r.forecast_date,
                "forecastFor": r.forecast_for,
                "originDate": r.origin_date,
                "ticker": r.ticker,
                "predictedDirection": r.signal,
                "predictedReturn": round(r.predicted_return, 4),
                "predictedReturnPct": round(r.predicted_return * 100, 3),
                "predictedClose": round(r.predicted_close, 2),
                "referenceClose": round(r.reference_close, 2) if r.reference_close is not None else None,
                "actualReturn": round(r.actual_return, 4) if r.actual_return is not None else None,
                "actualReturnPct": round(r.actual_return * 100, 3) if r.actual_return is not None else None,
                "actualClose": round(r.actual_close, 2) if r.actual_close is not None else None,
                "correct": r.is_correct,
                "modelVersion": r.model_version,
                "dataStatus": "verified",
                "divergenceType": diag["divergenceType"],
                "divergenceExplanation": diag["divergenceExplanation"],
                "volatilityRegime": diag["volatilityRegime"]
            })

        return {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "records": formatted
        }


prediction_service = PredictionService()
