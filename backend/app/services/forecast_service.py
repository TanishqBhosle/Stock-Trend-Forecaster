import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import torch
from app.core.config import settings
from app.core.logging import logger
from app.services.data_service import data_service
from app.services.preprocessing_service import preprocessing_service
from app.ml.lstm_model import load_model_checkpoint, get_device
from app.utils.dates import get_next_trading_day
from app.utils.metrics import classify_direction
from app.db.database import SessionLocal
from app.db.models import PredictionRecord


class ForecastService:
    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = artifacts_dir or settings.ARTIFACTS_DIR
        self.model_path = self.artifacts_dir / "model.pt"

    def is_ready(self) -> bool:
        f_scaler = self.artifacts_dir / "feature_scaler.pkl"
        t_scaler = self.artifacts_dir / "target_scaler.pkl"
        return self.model_path.exists() and f_scaler.exists() and t_scaler.exists()

    def generate_next_session_forecast(
        self,
        save_to_db: bool = True
    ) -> Dict[str, Any]:
        """
        Runs production inference for the next trading session.
        Uses the latest 60 trading days of raw OHLCV features.
        """
        if not self.is_ready():
            raise FileNotFoundError(
                "Trained LSTM model or scalers not found. You must run the training pipeline first (POST /api/model/train)."
            )

        # 1. Load latest market data
        df = data_service.load_cached_data()
        if len(df) < settings.LOOKBACK_WINDOW:
            df = data_service.download_and_clean_data(force_refresh=True)

        if len(df) < settings.LOOKBACK_WINDOW:
            raise ValueError(
                f"Insufficient historical data ({len(df)} rows) to form a {settings.LOOKBACK_WINDOW}-day sequence."
            )

        # 2. Extract latest 60 sessions of the 6 features
        latest_window = df.iloc[-settings.LOOKBACK_WINDOW:].copy()
        raw_features = latest_window[settings.FEATURES].values.astype(np.float64)  # Shape (60, 6)

        latest_row = df.iloc[-1]
        origin_date = str(latest_row["Date"])
        ref_close = float(latest_row["Close"])
        forecast_date = datetime.date.today().isoformat()
        forecast_for = get_next_trading_day(origin_date)

        # 3. Load scalers and transform sequence
        feature_scaler, target_scaler = preprocessing_service.load_scalers()
        # Scale (1, 60, 6)
        raw_seq = raw_features.reshape(1, settings.LOOKBACK_WINDOW, len(settings.FEATURES))
        scaled_seq = preprocessing_service.transform_X(raw_seq, feature_scaler)

        # 4. Load PyTorch model and predict
        device = get_device()
        model, meta = load_model_checkpoint(self.model_path, device=device)

        with torch.no_grad():
            tensor_seq = torch.from_numpy(scaled_seq).float().to(device)
            out_scaled = model(tensor_seq).cpu().numpy()

        pred_return = float(target_scaler.inverse_transform(out_scaled)[0, 0])
        pred_return_pct = float(pred_return * 100.0)

        # 5. Price recovery formula: predicted_next_close = latest_actual_close * (1 + predicted_next_return)
        predicted_close = round(ref_close * (1.0 + pred_return), 2)
        diff_points = round(predicted_close - ref_close, 2)
        movement_sign = "+" if diff_points >= 0 else ""
        expected_movement = f"{'Up' if diff_points >= 0 else 'Down'} {movement_sign}{diff_points} pts ({pred_return_pct:+.2f}%)"

        # 6. Trend classification
        trend_signal = classify_direction(
            pred_return,
            threshold=settings.BULLISH_THRESHOLD
        )

        model_version = meta.get("version", "lstm-v1.0")

        forecast_payload = {
            "ticker": settings.TICKER,
            "originDate": origin_date,
            "forecastDate": forecast_date,
            "forecastFor": forecast_for,
            "referenceClose": ref_close,
            "predictedReturn": pred_return,
            "predictedReturnPct": round(pred_return_pct, 4),
            "predictedClose": predicted_close,
            "expectedMovement": expected_movement,
            "trendSignal": trend_signal,
            "modelVersion": model_version,
            "lookbackDays": settings.LOOKBACK_WINDOW,
            "inputFeatureCount": len(settings.FEATURES),
            "isEstimatedDate": True,
            "disclaimer": (
                "Model estimate for educational and research purposes only. "
                "Not a guaranteed price or investment recommendation."
            )
        }

        # 7. Optionally save to prediction history in DB
        if save_to_db:
            db = SessionLocal()
            try:
                rec = PredictionRecord(
                    ticker=settings.TICKER,
                    origin_date=origin_date,
                    forecast_date=forecast_date,
                    forecast_for=forecast_for,
                    reference_close=ref_close,
                    predicted_return=pred_return,
                    predicted_close=predicted_close,
                    signal=trend_signal,
                    model_version=model_version
                )
                db.add(rec)
                db.commit()
            except Exception as e:
                logger.error(f"Failed to persist prediction record: {e}")
            finally:
                db.close()

        logger.info(
            f"Generated forecast for {settings.TICKER}: {trend_signal} ({pred_return_pct:+.2f}%) -> {predicted_close}"
        )
        return forecast_payload


forecast_service = ForecastService()
