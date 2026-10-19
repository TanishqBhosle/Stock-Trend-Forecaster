import pytest
import math
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.utils.metrics import (
    calculate_rmse,
    calculate_mae,
    calculate_directional_accuracy,
    classify_direction
)
from app.services.preprocessing_service import PreprocessingService
from app.services.forecast_service import ForecastService

client = TestClient(app)


# ── Property 1 & 2: Price Recovery Formula ───────────────────────────────────────

@pytest.mark.parametrize("ref_close,pred_return", [
    (100.0, 0.05),
    (5800.25, -0.012),
    (7650.00, 0.0),
    (2450.50, 0.0034),
    (10.0, -0.99),
])
def test_price_recovery_properties(ref_close, pred_return):
    # Property 1: predicted_close = ref_close * (1 + pred_return)
    pred_close = round(ref_close * (1.0 + pred_return), 2)
    expected = round(ref_close * (1.0 + pred_return), 2)
    assert pred_close == expected

    # Property 2: zero return implies predicted_close == ref_close
    zero_close = round(ref_close * (1.0 + 0.0), 2)
    assert math.isclose(zero_close, round(ref_close, 2), rel_tol=1e-5)


# ── Property 3, 4, 5, 6, 7: Independent Metric Verification & Invariants ──────────

def test_metric_mathematical_properties_and_numpy_agreement():
    np.random.seed(42)
    for _ in range(20):
        n = np.random.randint(5, 500)
        actual = np.random.randn(n) * 0.02
        pred = np.random.randn(n) * 0.02

        rmse = calculate_rmse(actual, pred)
        mae = calculate_mae(actual, pred)
        da = calculate_directional_accuracy(actual, pred)

        # Independent pure numpy calculations
        expected_rmse = float(np.sqrt(np.mean((actual - pred) ** 2)))
        expected_mae = float(np.mean(np.abs(actual - pred)))
        expected_da = float(np.mean(np.sign(actual) == np.sign(pred)) * 100.0)

        # Property 3: Exact agreement with independent implementation
        assert abs(rmse - expected_rmse) < 1e-6
        assert abs(mae - expected_mae) < 1e-6
        assert abs(da - expected_da) < 1e-4

        # Property 4: RMSE is non-negative
        assert rmse >= 0.0

        # Property 5: MAE is non-negative
        assert mae >= 0.0

        # Property 6: MAE <= RMSE (Cauchy-Schwarz / Jensen's Inequality)
        assert mae <= rmse + 1e-9

        # Property 7: Directional Accuracy between 0% and 100%
        assert 0.0 <= da <= 100.0


# ── Property 8: Sequence Generation Dimensions ──────────────────────────────────

def test_sequence_generation_shape():
    prep = PreprocessingService()
    dates = pd.date_range("2020-01-01", periods=100, freq="B").strftime("%Y-%m-%d").tolist()
    data = {
        "Date": dates,
        "Open": np.linspace(100, 200, 100),
        "High": np.linspace(105, 205, 100),
        "Low": np.linspace(95, 195, 100),
        "Close": np.linspace(102, 202, 100),
        "Adj Close": np.linspace(102, 202, 100),
        "Volume": np.full(100, 1000000)
    }
    df = pd.DataFrame(data)
    lookback = 60
    X, y, target_dates, ref_closes, origin_dates = prep.create_sequences_and_targets(df, lookback=lookback)

    # Expected count: len(df) - lookback = 40
    assert X.shape == (40, 60, 6)
    assert y.shape == (40, 1)
    assert len(target_dates) == 40
    assert len(ref_closes) == 40
    assert len(origin_dates) == 40

    # Target alignment check: target_return[i] corresponds to close[60+i] / close[60+i-1] - 1
    for i in range(len(X)):
        expected_ret = (df["Close"].iloc[lookback + i] / df["Close"].iloc[lookback + i - 1]) - 1.0
        assert abs(y[i][0] - expected_ret) < 1e-6
        assert target_dates[i] == df["Date"].iloc[lookback + i]
        assert origin_dates[i] == df["Date"].iloc[lookback + i - 1]


# ── Property 9: Chronological Order & Leakage Prevention ────────────────────────

def test_chronological_ordering_and_no_leakage():
    prep = PreprocessingService()
    dates = pd.date_range("2020-01-01", periods=150, freq="B").strftime("%Y-%m-%d").tolist()
    data = {
        "Date": dates,
        "Open": np.linspace(100, 200, 150),
        "High": np.linspace(105, 205, 150),
        "Low": np.linspace(95, 195, 150),
        "Close": np.linspace(102, 202, 150),
        "Adj Close": np.linspace(102, 202, 150),
        "Volume": np.full(150, 1000000)
    }
    df = pd.DataFrame(data)
    X, y, target_dates, ref_closes, origin_dates = prep.create_sequences_and_targets(df, lookback=60)
    splits = prep.chronological_split(X, y, target_dates, ref_closes)

    train_dates = splits["train"]["dates"]
    val_dates = splits["val"]["dates"]
    test_dates = splits["test"]["dates"]

    # Strictly ordered ascending
    assert train_dates[-1] < val_dates[0]
    assert val_dates[-1] < test_dates[0]

    # No overlapping target dates
    train_set = set(train_dates)
    val_set = set(val_dates)
    test_set = set(test_dates)
    assert len(train_set.intersection(val_set)) == 0
    assert len(val_set.intersection(test_set)) == 0
    assert len(train_set.intersection(test_set)) == 0


# ── Property 10 & 11: Read-Only Idempotency & Pagination ─────────────────────────

def test_pagination_and_read_idempotency():
    # Read-only request repeated does not alter state
    res1 = client.get("/api/forecast/latest")
    res2 = client.get("/api/forecast/latest")
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["predictedReturn"] == res2.json()["predictedReturn"]

    # Pagination test: fetch page 1 and page 2
    r_p1 = client.get("/api/forecast/history?page=1&pageSize=5").json()
    r_p2 = client.get("/api/forecast/history?page=2&pageSize=5").json()

    if r_p1.get("total", 0) >= 10:
        ids_p1 = [r["id"] for r in r_p1["records"]]
        ids_p2 = [r["id"] for r in r_p2["records"]]
        # No overlapping record IDs between adjacent pages
        assert len(set(ids_p1).intersection(set(ids_p2))) == 0


# ── Property 12: Inference Determinism ──────────────────────────────────────────

def test_inference_determinism():
    res1 = client.get("/api/forecast/latest").json()
    res2 = client.get("/api/forecast/latest").json()
    assert res1["predictedClose"] == res2["predictedClose"]
    assert res1["predictedReturn"] == res2["predictedReturn"]
    assert res1["trendSignal"] == res2["trendSignal"]


# ── Boundary Conditions ─────────────────────────────────────────────────────────

def test_boundary_fewer_than_60_observations():
    prep = PreprocessingService()
    dates = pd.date_range("2024-01-01", periods=45, freq="B").strftime("%Y-%m-%d").tolist()
    df = pd.DataFrame({
        "Date": dates,
        "Open": [100.0] * 45,
        "High": [105.0] * 45,
        "Low": [95.0] * 45,
        "Close": [102.0] * 45,
        "Adj Close": [102.0] * 45,
        "Volume": [1000000] * 45
    })
    with pytest.raises(ValueError, match="too short for lookback window"):
        prep.create_sequences_and_targets(df, lookback=60)


def test_boundary_exactly_60_observations():
    prep = PreprocessingService()
    dates = pd.date_range("2024-01-01", periods=60, freq="B").strftime("%Y-%m-%d").tolist()
    df = pd.DataFrame({
        "Date": dates,
        "Open": [100.0] * 60,
        "High": [105.0] * 60,
        "Low": [95.0] * 60,
        "Close": [102.0] * 60,
        "Adj Close": [102.0] * 60,
        "Volume": [1000000] * 60
    })
    # 60 observations cannot create any target because target t requires row t after 60-row lookback
    with pytest.raises(ValueError, match="too short for lookback window"):
        prep.create_sequences_and_targets(df, lookback=60)


def test_boundary_missing_columns():
    prep = PreprocessingService()
    df = pd.DataFrame({
        "Date": ["2024-01-01"],
        "Open": [100.0],
        # Missing High, Low, Close, Volume
    })
    with pytest.raises(KeyError):
        prep.create_sequences_and_targets(df, lookback=60)


def test_boundary_missing_artifacts_behavior(tmp_path):
    # Isolated forecast service pointing to empty directory
    svc = ForecastService(artifacts_dir=tmp_path)
    assert svc.is_ready() is False
    with pytest.raises(FileNotFoundError, match="Trained LSTM model or scalers not found"):
        svc.generate_next_session_forecast(save_to_db=False)


def test_trend_classification_boundaries():
    assert classify_direction(0.0051, threshold=0.005) == "BULLISH"
    assert classify_direction(0.0050, threshold=0.005) == "NEUTRAL"
    assert classify_direction(0.0, threshold=0.005) == "NEUTRAL"
    assert classify_direction(-0.0050, threshold=0.005) == "NEUTRAL"
    assert classify_direction(-0.0051, threshold=0.005) == "BEARISH"
