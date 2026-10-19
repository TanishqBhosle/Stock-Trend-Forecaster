import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_contract_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert "version" in data
    assert "timestamp" in data


def test_contract_status_endpoint():
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["apiStatus"] == "operational"
    assert data["activeTicker"] == "^GSPC"
    assert isinstance(data["modelAvailability"], bool)


def test_contract_market_summary_endpoint():
    res = client.get("/api/market/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["ticker"] == "^GSPC"
    assert isinstance(data["currentPrice"], (int, float))
    assert isinstance(data["totalObservations"], int)
    assert data["totalObservations"] > 6000


def test_contract_market_history_valid_and_invalid_ranges():
    # Valid ranges: 1M, 3M, 6M, 1Y, MAX
    for r in ["1M", "3M", "6M", "1Y", "MAX"]:
        res = client.get(f"/api/market/history?range={r}")
        assert res.status_code == 200
        data = res.json()
        assert data["range"] == r
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0
        first_row = data["data"][0]
        for field in ["date", "open", "high", "low", "close", "adjClose", "volume"]:
            assert field in first_row

    # Invalid range should return 422 Unprocessable Entity
    bad_res = client.get("/api/market/history?range=INVALID_RANGE")
    assert bad_res.status_code == 422


def test_contract_forecast_latest():
    res = client.get("/api/forecast/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["ticker"] == "^GSPC"
    assert isinstance(data["referenceClose"], float)
    assert isinstance(data["predictedReturn"], float)
    assert isinstance(data["predictedClose"], float)
    assert data["trendSignal"] in ["BULLISH", "NEUTRAL", "BEARISH"]
    assert data["lookbackDays"] == 60
    assert data["inputFeatureCount"] == 6

    # Verify formula
    expected_close = round(data["referenceClose"] * (1.0 + data["predictedReturn"]), 2)
    assert abs(data["predictedClose"] - expected_close) < 0.02


def test_contract_compat_v1_single_asset_enforcement():
    # Primary asset ^GSPC succeeds
    res_gspc = client.get("/api/v1/forecast/^GSPC")
    assert res_gspc.status_code == 200
    assert res_gspc.json()["ticker"] == "^GSPC"

    # Any other ticker fails with 400 Bad Request to prevent fabricated multi-asset predictions
    res_aapl = client.get("/api/v1/forecast/AAPL")
    assert res_aapl.status_code == 400
    assert "Single-asset model only supports ^GSPC" in res_aapl.json()["detail"]


def test_contract_http_method_not_allowed():
    # /api/health only allows GET
    res = client.post("/api/health")
    assert res.status_code == 405

    # /api/model/train only allows POST
    res_train_get = client.get("/api/model/train")
    assert res_train_get.status_code == 405


def test_contract_cors_headers():
    res = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    # FastAPI CORSMiddleware responds to OPTIONS
    assert res.status_code in [200, 204]
    assert "access-control-allow-origin" in res.headers
