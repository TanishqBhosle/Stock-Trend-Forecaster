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
        self._cached_model = None
        self._cached_meta = None
        self._cached_feature_scaler = None
        self._cached_target_scaler = None
        self._cached_forecast = None

    def clear_cache(self) -> None:
        """Invalidates all in-memory model, scaler, and forecast caches."""
        self._cached_model = None
        self._cached_meta = None
        self._cached_feature_scaler = None
        self._cached_target_scaler = None
        self._cached_forecast = None
        logger.info("Cleared in-memory model and forecast caches.")

    def is_ready(self) -> bool:
        f_scaler = self.artifacts_dir / "feature_scaler.pkl"
        t_scaler = self.artifacts_dir / "target_scaler.pkl"
        return self.model_path.exists() and f_scaler.exists() and t_scaler.exists()

    def _get_model_and_scalers(self):
        """Loads and caches PyTorch model and scalers in memory to avoid repeated disk I/O."""
        if (
            self._cached_model is None
            or self._cached_feature_scaler is None
            or self._cached_target_scaler is None
        ):
            device = get_device()
            model, meta = load_model_checkpoint(self.model_path, device=device)
            feature_scaler, target_scaler = preprocessing_service.load_scalers()
            self._cached_model = model
            self._cached_meta = meta
            self._cached_feature_scaler = feature_scaler
            self._cached_target_scaler = target_scaler
        return (
            self._cached_model,
            self._cached_meta,
            self._cached_feature_scaler,
            self._cached_target_scaler
        )

    def generate_next_session_forecast(
        self,
        save_to_db: bool = True
    ) -> Dict[str, Any]:
        """
        Runs production inference for the next trading session.
        Uses the latest 60 trading days of raw OHLCV features.
        Utilizes in-memory caching for sub-millisecond response latency.
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

        latest_row = df.iloc[-1]
        origin_date = str(latest_row["Date"])
        ref_close = float(latest_row["Close"])
        forecast_date = datetime.date.today().isoformat()
        forecast_for = get_next_trading_day(origin_date)

        # 2. Check deterministic cached forecast
        model, meta, feature_scaler, target_scaler = self._get_model_and_scalers()
        model_version = meta.get("version", "lstm-v1.0")

        if (
            not save_to_db
            and self._cached_forecast is not None
            and self._cached_forecast.get("originDate") == origin_date
            and self._cached_forecast.get("modelVersion") == model_version
            and self._cached_forecast.get("referenceClose") == ref_close
        ):
            return dict(self._cached_forecast)

        # 3. Extract latest 60 sessions of the 6 features
        latest_window = df.iloc[-settings.LOOKBACK_WINDOW:].copy()
        raw_features = latest_window[settings.FEATURES].values.astype(np.float64)  # Shape (60, 6)

        # 4. Transform sequence
        raw_seq = raw_features.reshape(1, settings.LOOKBACK_WINDOW, len(settings.FEATURES))
        scaled_seq = preprocessing_service.transform_X(raw_seq, feature_scaler)

        # 5. Model forward pass
        device = get_device()
        with torch.no_grad():
            tensor_seq = torch.from_numpy(scaled_seq).float().to(device)
            out_scaled = model(tensor_seq).cpu().numpy()

        pred_return = float(target_scaler.inverse_transform(out_scaled)[0, 0])
        pred_return_pct = float(pred_return * 100.0)

        # 6. Price recovery formula: predicted_next_close = latest_actual_close * (1 + predicted_next_return)
        predicted_close = round(ref_close * (1.0 + pred_return), 2)
        diff_points = round(predicted_close - ref_close, 2)
        movement_sign = "+" if diff_points >= 0 else ""
        expected_movement = f"{'Up' if diff_points >= 0 else 'Down'} {movement_sign}{diff_points} pts ({pred_return_pct:+.2f}%)"

        # 7. Trend classification
        trend_signal = classify_direction(
            pred_return,
            threshold=settings.BULLISH_THRESHOLD
        )

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

        # Cache in memory
        self._cached_forecast = dict(forecast_payload)

        # 8. Deduplicated persistence to SQLite
        if save_to_db:
            db = SessionLocal()
            try:
                existing = (
                    db.query(PredictionRecord)
                    .filter(
                        PredictionRecord.ticker == settings.TICKER,
                        PredictionRecord.origin_date == origin_date,
                        PredictionRecord.forecast_for == forecast_for,
                        PredictionRecord.model_version == model_version
                    )
                    .first()
                )
                if existing:
                    existing.forecast_date = forecast_date
                    existing.reference_close = ref_close
                    existing.predicted_return = pred_return
                    existing.predicted_close = predicted_close
                    existing.signal = trend_signal
                    db.commit()
                else:
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
                db.rollback()
            finally:
                db.close()

        logger.info(
            f"Generated forecast for {settings.TICKER}: {trend_signal} ({pred_return_pct:+.2f}%) -> {predicted_close}"
        )
        return forecast_payload


forecast_service = ForecastService()
