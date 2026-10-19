import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_api_status():
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["apiStatus"] == "operational"
    assert "activeTicker" in data


def test_api_model_config():
    res = client.get("/api/model/config")
    assert res.status_code == 200
    data = res.json()
    assert data["architecture"] == "2-layer Stacked LSTM"
    assert data["hiddenSize"] == 128
    assert data["lookback"] == 60
    assert data["features"] == ["Open", "High", "Low", "Close", "Adj Close", "Volume"]


def test_api_forecast_requires_training_or_succeeds():
    # If not trained yet, it returns 400 with a clear error explaining training is required.
    # If already trained, returns 200 with forecast.
    res = client.get("/api/forecast/latest")
    assert res.status_code in [200, 400]
    if res.status_code == 400:
        assert "training" in res.json()["detail"].lower()
    else:
        data = res.json()
        assert "predictedReturn" in data
        assert "predictedClose" in data
        assert "trendSignal" in data
