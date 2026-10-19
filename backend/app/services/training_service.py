import json
import uuid
import threading
import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np

from app.core.config import settings
from app.core.logging import logger
from app.services.data_service import data_service
from app.services.preprocessing_service import preprocessing_service
from app.ml.lstm_model import save_model_checkpoint, get_device
from app.ml.train import train_lstm_model
from app.ml.evaluate import evaluate_model
from app.ml.walk_forward import run_walk_forward_evaluation
from app.db.database import SessionLocal
from app.db.models import TrainingRun


class TrainingService:
    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = artifacts_dir or settings.ARTIFACTS_DIR
        self.lock = threading.Lock()
        self.current_job: Dict[str, Any] = {
            "jobId": None,
            "status": "idle",  # idle, queued, running, completed, failed
            "startedAt": None,
            "completedAt": None,
            "error": None
        }

    def get_status(self) -> Dict[str, Any]:
        return dict(self.current_job)

    def is_model_trained(self) -> bool:
        model_pt = self.artifacts_dir / "model.pt"
        f_scaler = self.artifacts_dir / "feature_scaler.pkl"
        t_scaler = self.artifacts_dir / "target_scaler.pkl"
        return model_pt.exists() and f_scaler.exists() and t_scaler.exists()

    def start_training_job(self) -> Dict[str, str]:
        """Initiates a background training task if not already running."""
        with self.lock:
            if self.current_job["status"] in ["queued", "running"]:
                return {
                    "jobId": self.current_job["jobId"],
                    "status": self.current_job["status"],
                    "message": "A training job is already in progress."
                }

            job_id = str(uuid.uuid4())
            self.current_job = {
                "jobId": job_id,
                "status": "queued",
                "startedAt": datetime.datetime.utcnow().isoformat(),
                "completedAt": None,
                "error": None
            }

            thread = threading.Thread(target=self._run_training_pipeline, args=(job_id,), daemon=True)
            thread.start()

            return {
                "jobId": job_id,
                "status": "queued",
                "message": "LSTM training job successfully initiated."
            }

    def _run_training_pipeline(self, job_id: str):
        self.current_job["status"] = "running"
        logger.info(f"Starting training pipeline for job {job_id}")

        db = SessionLocal()
        run_record = TrainingRun(
            run_id=job_id,
            status="running",
            started_at=datetime.datetime.utcnow()
        )
        db.add(run_record)
        db.commit()

        try:
            # 1. Load / refresh historical market data
            df = data_service.load_cached_data()
            if df.empty or len(df) < 100:
                df = data_service.download_and_clean_data(force_refresh=True)

            # 2. Build sequences and extract targets
            X_raw, y_raw, target_dates, ref_closes, origin_dates = (
                preprocessing_service.create_sequences_and_targets(df)
            )

            # 3. Chronological 80/10/10 split
            splits = preprocessing_service.chronological_split(
                X_raw, y_raw, target_dates, ref_closes
            )
            train_set = splits["train"]
            val_set = splits["val"]
            test_set = splits["test"]
            split_info = splits["info"]

            # 4. Fit scalers on TRAINING data only (in-memory; written only after successful training)
            feature_scaler, target_scaler = preprocessing_service.fit_scalers(
                train_set["X"], train_set["y"]
            )

            # 5. Scale features and targets using training-fitted scalers
            X_train_scaled = preprocessing_service.transform_X(train_set["X"], feature_scaler)
            y_train_scaled = preprocessing_service.transform_y(train_set["y"], target_scaler)

            X_val_scaled = preprocessing_service.transform_X(val_set["X"], feature_scaler)
            y_val_scaled = preprocessing_service.transform_y(val_set["y"], target_scaler)

            X_test_scaled = preprocessing_service.transform_X(test_set["X"], feature_scaler)

            # 6. Train PyTorch LSTM Model
            model, train_meta = train_lstm_model(
                X_train_scaled,
                y_train_scaled,
                X_val_scaled,
                y_val_scaled,
                hidden_size=settings.HIDDEN_SIZE,
                num_layers=settings.NUM_LAYERS,
                dropout=settings.DROPOUT,
                lr=settings.LEARNING_RATE,
                batch_size=settings.BATCH_SIZE,
                max_epochs=settings.MAX_EPOCHS,
                patience=settings.PATIENCE,
                seed=settings.RANDOM_SEED
            )

            # 7. Evaluate on held-out test split
            test_eval = evaluate_model(
                model=model,
                X_scaled=X_test_scaled,
                y_raw=test_set["y"],
                target_scaler=target_scaler,
                dates=test_set["dates"],
                ref_closes=test_set["ref_closes"],
                evaluation_type="held_out_test"
            )

            # 8. Run walk-forward evaluation on the test split
            val_end_idx = split_info["train_samples"] + split_info["val_samples"]
            test_origins = origin_dates[val_end_idx:]
            walk_forward_eval = run_walk_forward_evaluation(
                model=model,
                X_scaled=X_test_scaled,
                y_raw=test_set["y"],
                target_scaler=target_scaler,
                dates=test_set["dates"],
                ref_closes=test_set["ref_closes"],
                origin_dates=test_origins,
                step_size=1
            )

            # 9. Atomic artifact deployment via staging directory
            staging_dir = self.artifacts_dir / ".staging"
            staging_dir.mkdir(parents=True, exist_ok=True)

            # Save scalers to staging
            preprocessing_service.save_scalers(feature_scaler, target_scaler, target_dir=staging_dir)

            # Save model checkpoint to staging
            save_model_checkpoint(model, staging_dir / "model.pt", metadata={
                "jobId": job_id,
                "trainedAt": datetime.datetime.utcnow().isoformat(),
                "device": str(get_device()),
                "splitInfo": split_info
            })

            # Save config.json to staging
            config_data = {
                "version": "lstm-v1.0",
                "architecture": f"{settings.NUM_LAYERS}-layer Stacked LSTM",
                "hiddenSize": settings.HIDDEN_SIZE,
                "numLayers": settings.NUM_LAYERS,
                "dropout": settings.DROPOUT,
                "lookback": settings.LOOKBACK_WINDOW,
                "features": settings.FEATURES,
                "target": {
                    "name": "Next-session Close return",
                    "formula": "Close[t] / Close[t-1] - 1",
                    "priceRecovery": "predicted_next_close = latest_actual_close * (1 + predicted_next_return)"
                },
                "optimizer": f"Adam (lr={settings.LEARNING_RATE})",
                "lossFunction": "MSE",
                "batchSize": settings.BATCH_SIZE,
                "learningRate": settings.LEARNING_RATE,
                "device": str(get_device()),
                "split": {
                    "train": f"{int(settings.TRAIN_SPLIT_RATIO*100)}%",
                    "val": f"{int(settings.VAL_SPLIT_RATIO*100)}%",
                    "test": f"{int(settings.TEST_SPLIT_RATIO*100)}%",
                    "method": "Chronological (no shuffling across time boundaries)"
                }
            }
            with open(staging_dir / "config.json", "w") as f:
                json.dump(config_data, f, indent=2)

            # Save metrics.json to staging
            combined_metrics = {
                "available": True,
                "modelVersion": "lstm-v1.0",
                "jobId": job_id,
                "evaluatedAt": datetime.datetime.utcnow().isoformat(),
                "datasetDateRange": f"{df['Date'].iloc[0]} to {df['Date'].iloc[-1]}",
                "totalObservations": len(df),
                "splits": split_info,
                "testMetrics": test_eval["metrics"],
                "walkForwardMetrics": walk_forward_eval["metrics"]
            }
            with open(staging_dir / "metrics.json", "w") as f:
                json.dump(combined_metrics, f, indent=2)

            # Save training_history.json to staging
            with open(staging_dir / "training_history.json", "w") as f:
                json.dump(train_meta, f, indent=2)

            # Save predictions cache to staging
            with open(staging_dir / "test_predictions.json", "w") as f:
                json.dump(test_eval["predictions"], f, indent=2)

            with open(staging_dir / "walk_forward_predictions.json", "w") as f:
                json.dump(walk_forward_eval["predictions"], f, indent=2)

            # Atomic promotion: backup existing files and move staged files into artifacts_dir
            import shutil
            for staged_file in staging_dir.iterdir():
                dest_file = self.artifacts_dir / staged_file.name
                if dest_file.exists():
                    bak_file = self.artifacts_dir / f"{staged_file.name}.bak"
                    try:
                        shutil.copy2(dest_file, bak_file)
                    except Exception:
                        pass
                shutil.move(str(staged_file), str(dest_file))

            shutil.rmtree(staging_dir, ignore_errors=True)

            # Invalidate in-memory caches to pick up newly trained model
            from app.services.forecast_service import forecast_service
            forecast_service.clear_cache()

            # Update DB
            run_record.status = "completed"
            run_record.completed_at = datetime.datetime.utcnow()
            run_record.epochs_trained = train_meta["totalEpochsTrained"]
            run_record.best_val_loss = train_meta["bestValLoss"]
            run_record.test_rmse = test_eval["metrics"]["rmse"]
            run_record.test_mae = test_eval["metrics"]["mae"]
            run_record.test_directional_accuracy = test_eval["metrics"]["directionalAccuracy"]
            run_record.train_samples = split_info["train_samples"]
            run_record.val_samples = split_info["val_samples"]
            run_record.test_samples = split_info["test_samples"]
            run_record.config_json = json.dumps(config_data)
            db.commit()

            self.current_job["status"] = "completed"
            self.current_job["completedAt"] = datetime.datetime.utcnow().isoformat()
            logger.info(f"Training job {job_id} successfully completed and atomically deployed!")

        except Exception as e:
            logger.exception(f"Training job {job_id} failed: {e}")
            self.current_job["status"] = "failed"
            self.current_job["error"] = str(e)
            run_record.status = "failed"
            run_record.error_message = str(e)
            run_record.completed_at = datetime.datetime.utcnow()
            db.commit()
        finally:
            db.close()


training_service = TrainingService()
