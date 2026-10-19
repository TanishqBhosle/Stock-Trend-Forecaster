import pytest
import concurrent.futures
import time
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import PredictionRecord
from app.services.forecast_service import forecast_service

client = TestClient(app)


def test_concurrent_prediction_reads():
    """Verify that multiple concurrent threads can read the forecast and market endpoints simultaneously."""
    def fetch_forecast():
        res = client.get("/api/forecast/latest")
        return res.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(fetch_forecast) for _ in range(24)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert all(code == 200 for code in results)
    assert len(results) == 24


def test_concurrent_prediction_writes_and_deduplication():
    """
    Verify that concurrent forecast generation requests do not cause database lock crashes
    and deduplicate writes for identical origin and target dates.
    """
    def generate_forecast_call():
        res = client.post("/api/forecast/generate")
        return res.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(generate_forecast_call) for _ in range(8)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert all(code == 200 for code in results)

    # Verify database has exactly 1 entry for this active forecast origin/target pair
    db = SessionLocal()
    try:
        latest = client.get("/api/forecast/latest").json()
        count = (
            db.query(PredictionRecord)
            .filter(
                PredictionRecord.origin_date == latest["originDate"],
                PredictionRecord.forecast_for == latest["forecastFor"]
            )
            .count()
        )
        # Deduplication ensures count is 1 rather than 8 duplicate records
        assert count == 1
    finally:
        db.close()


def test_transaction_rollback_on_database_error():
    """Verify that failed transactions roll back cleanly and do not corrupt the session."""
    db = SessionLocal()
    try:
        # Create an invalid record missing required non-nullable fields
        invalid_rec = PredictionRecord(ticker="TEST_ROLLBACK")
        db.add(invalid_rec)
        with pytest.raises(Exception):
            db.commit()
        db.rollback()

        # Session should be clean and usable for subsequent queries
        valid_count = db.query(PredictionRecord).count()
        assert isinstance(valid_count, int)
    finally:
        db.close()


def test_preservation_of_last_known_good_model_on_simulated_failure(monkeypatch, tmp_path):
    """
    Simulate a failure midway through the training pipeline
    and verify that existing model artifacts remain intact and valid.
    """
    from app.services.training_service import TrainingService

    # Create dummy existing good artifacts in test directory
    test_artifacts = tmp_path / "artifacts"
    test_artifacts.mkdir(parents=True, exist_ok=True)
    good_model = test_artifacts / "model.pt"
    good_model.write_text("GOOD_MODEL_CHECKPOINT")
    good_metric = test_artifacts / "metrics.json"
    good_metric.write_text('{"modelVersion": "lstm-v1.0", "status": "good"}')

    svc = TrainingService(artifacts_dir=test_artifacts)

    # Monkeypatch train_lstm_model to deliberately raise an exception
    def failing_train(*args, **kwargs):
        raise RuntimeError("Simulated GPU Out-Of-Memory or training crash!")

    monkeypatch.setattr("app.services.training_service.train_lstm_model", failing_train)

    # Run the pipeline with a unique job ID (which catches the exception)
    import uuid
    unique_job_id = f"test_fail_job_{uuid.uuid4().hex[:8]}"
    svc._run_training_pipeline(job_id=unique_job_id)

    # Assert that training job status is marked failed
    assert svc.get_status()["status"] == "failed"

    # Crucial property: The existing good model was NOT deleted or corrupted
    assert good_model.exists()
    assert good_model.read_text() == "GOOD_MODEL_CHECKPOINT"
    assert good_metric.exists()
    assert '"status": "good"' in good_metric.read_text()
