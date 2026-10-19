import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.database import get_db
from app.db.models import TrainingRun
from app.services.training_service import training_service
from app.services.evaluation_service import evaluation_service
from app.schemas.model import ModelStatusResponse, TrainJobResponse, TrainingHistoryResponse
from app.core.logging import logger

router = APIRouter(prefix="/model", tags=["Model Management"])


@router.get("/status", response_model=ModelStatusResponse)
def get_model_status():
    """Returns whether the model is trained, weights/scalers exist, and current training job status."""
    is_trained = training_service.is_model_trained()
    job = training_service.get_status()
    metrics = evaluation_service.get_metrics()

    model_pt = settings.ARTIFACTS_DIR / "model.pt"
    f_scaler = settings.ARTIFACTS_DIR / "feature_scaler.pkl"
    t_scaler = settings.ARTIFACTS_DIR / "target_scaler.pkl"

    return {
        "isTrained": is_trained,
        "modelVersion": "lstm-v1.0",
        "weightsExist": model_pt.exists(),
        "scalersExist": f_scaler.exists() and t_scaler.exists(),
        "lastTrainedAt": metrics.get("evaluatedAt"),
        "trainingJobStatus": job.get("status"),
        "heldOutTestMetrics": metrics.get("testMetrics")
    }


@router.get("/config")
def get_model_config():
    """Returns the model hyperparameters, feature list, and split configuration."""
    config_file = settings.ARTIFACTS_DIR / "config.json"
    if config_file.exists():
        with open(config_file, "r") as f:
            return json.load(f)

    # Return default architecture config if artifacts haven't been written yet
    return {
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
        "split": {
            "train": f"{int(settings.TRAIN_SPLIT_RATIO*100)}%",
            "val": f"{int(settings.VAL_SPLIT_RATIO*100)}%",
            "test": f"{int(settings.TEST_SPLIT_RATIO*100)}%",
            "method": "Chronological (80/10/10, no shuffling across boundaries)"
        }
    }


@router.get("/metrics")
def get_model_metrics():
    """Returns held-out test and walk-forward evaluation metrics."""
    return evaluation_service.get_metrics()


@router.post("/train", response_model=TrainJobResponse)
def train_model():
    """
    Initiates real PyTorch LSTM training on historical data (2000 to present).
    Runs asynchronously in the background. Protects against concurrent runs.
    """
    job_info = training_service.start_training_job()
    return {
        "jobId": job_info["jobId"],
        "status": job_info["status"],
        "message": job_info["message"]
    }


@router.get("/runs")
def get_training_runs(db: Session = Depends(get_db)):
    """Returns all historical training experiment runs recorded in SQLite."""
    runs = db.query(TrainingRun).order_by(TrainingRun.started_at.desc()).all()
    results = []
    for r in runs:
        config = {}
        if r.config_json:
            try:
                config = json.loads(r.config_json)
            except Exception:
                pass
        results.append({
            "id": r.run_id,
            "name": f"LSTM Run ({r.run_id[:8]})",
            "status": r.status,
            "startedAt": r.started_at.isoformat() if r.started_at else None,
            "completedAt": r.completed_at.isoformat() if r.completed_at else None,
            "epochsTrained": r.epochs_trained,
            "bestValLoss": r.best_val_loss,
            "testRmse": r.test_rmse,
            "testMae": r.test_mae,
            "testDirectionalAccuracy": r.test_directional_accuracy,
            "trainSamples": r.train_samples,
            "valSamples": r.val_samples,
            "testSamples": r.test_samples,
            "config": config,
            "error": r.error_message
        })
    return {"runs": results, "total": len(results)}
