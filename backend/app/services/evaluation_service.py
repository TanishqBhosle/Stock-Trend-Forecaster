import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.core.logging import logger
from app.services.preprocessing_service import preprocessing_service
from app.services.data_service import data_service
from app.ml.lstm_model import load_model_checkpoint
from app.ml.walk_forward import run_walk_forward_evaluation


class EvaluationService:
    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = artifacts_dir or settings.ARTIFACTS_DIR

    def get_metrics(self) -> Dict[str, Any]:
        metrics_file = self.artifacts_dir / "metrics.json"
        if not metrics_file.exists():
            return {
                "available": False,
                "reason": "Model artifacts not present. Run POST /api/model/train to generate real evaluation results."
            }
        with open(metrics_file, "r") as f:
            return json.load(f)

    def get_test_evaluation(self) -> Dict[str, Any]:
        metrics = self.get_metrics()
        if not metrics.get("available"):
            return metrics

        preds_file = self.artifacts_dir / "test_predictions.json"
        predictions = []
        if preds_file.exists():
            with open(preds_file, "r") as f:
                predictions = json.load(f)

        return {
            "metrics": metrics["testMetrics"],
            "predictions": predictions,
            "note": "Evaluated strictly on held-out chronological test split (10%)."
        }

    def get_walk_forward_results(self) -> Dict[str, Any]:
        metrics = self.get_metrics()
        if not metrics.get("available"):
            return metrics

        preds_file = self.artifacts_dir / "walk_forward_predictions.json"
        predictions = []
        if preds_file.exists():
            with open(preds_file, "r") as f:
                predictions = json.load(f)

        return {
            "metrics": metrics["walkForwardMetrics"],
            "predictions": predictions,
            "evaluationLabel": "Fixed-Model Walk-Forward Evaluation",
            "description": "Sequential one-step forecasting over held-out period without future data leakage."
        }

    def run_walk_forward(self, step_size: int = 1, max_steps: Optional[int] = None) -> Dict[str, Any]:
        """Runs or re-runs walk-forward evaluation on the test set."""
        model_path = self.artifacts_dir / "model.pt"
        if not model_path.exists():
            raise FileNotFoundError("Model checkpoint not found. Training required.")

        df = data_service.load_cached_data()
        X_raw, y_raw, target_dates, ref_closes, origin_dates = (
            preprocessing_service.create_sequences_and_targets(df)
        )
        splits = preprocessing_service.chronological_split(X_raw, y_raw, target_dates, ref_closes)
        test_set = splits["test"]

        feature_scaler, target_scaler = preprocessing_service.load_scalers()
        X_test_scaled = preprocessing_service.transform_X(test_set["X"], feature_scaler)

        model, _ = load_model_checkpoint(model_path)
        val_end_idx = splits["info"]["train_samples"] + splits["info"]["val_samples"]
        test_origins = origin_dates[val_end_idx:]

        wf_result = run_walk_forward_evaluation(
            model=model,
            X_scaled=X_test_scaled,
            y_raw=test_set["y"],
            target_scaler=target_scaler,
            dates=test_set["dates"],
            ref_closes=test_set["ref_closes"],
            origin_dates=test_origins,
            step_size=step_size,
            max_steps=max_steps
        )
        return wf_result

    def get_training_history(self) -> Dict[str, Any]:
        history_file = self.artifacts_dir / "training_history.json"
        if not history_file.exists():
            return {
                "available": False,
                "message": "No training history recorded yet. Model training required."
            }
        with open(history_file, "r") as f:
            return json.load(f)


evaluation_service = EvaluationService()
