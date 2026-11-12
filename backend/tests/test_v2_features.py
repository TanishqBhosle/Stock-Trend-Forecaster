import pytest
import torch
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import engine, Base
from app.ml.loss import DirectionalHuberLoss, get_loss_criterion
from app.services.preprocessing_service import preprocessing_service


@pytest.fixture(scope="session", autouse=True)
def setup_tables():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_directional_huber_loss():
    """Validates Directional Huber Loss penalizes sign disagreements."""
    criterion = DirectionalHuberLoss(delta=0.01, penalty_weight=1.0)

    # Prediction and truth have SAME sign (both positive)
    y_pred_correct = torch.tensor([[0.01]], dtype=torch.float32)
    y_true_pos = torch.tensor([[0.015]], dtype=torch.float32)
    loss_correct = criterion(y_pred_correct, y_true_pos).item()

    # Prediction has WRONG sign (predicted negative, actual positive)
    y_pred_wrong = torch.tensor([[-0.01]], dtype=torch.float32)
    loss_wrong = criterion(y_pred_wrong, y_true_pos).item()

    # Wrong direction loss MUST be strictly higher due to sign penalty
    assert loss_wrong > loss_correct
    assert loss_correct >= 0.0


def test_stationary_feature_engineering():
    """Validates stationary quantitative features computation."""
    dates = pd.date_range("2024-01-01", periods=80, freq="B").strftime("%Y-%m-%d").tolist()
    prices = [5000.0 + i * 2.5 + (i % 3) * 1.5 for i in range(80)]
    df = pd.DataFrame({
        "Date": dates,
        "Open": [p - 1.0 for p in prices],
        "High": [p + 5.0 for p in prices],
        "Low": [p - 5.0 for p in prices],
        "Close": prices,
        "Adj Close": prices,
        "Volume": [1000000 + (i % 5) * 50000 for i in range(80)]
    })

    feat_df = preprocessing_service.compute_stationary_features(df)
    for col in preprocessing_service.stationary_cols:
        assert col in feat_df.columns
        assert not np.isinf(feat_df[col].values).any()
        assert not feat_df[col].isna().all()


def test_backtest_endpoint(client):
    """Validates POST /api/backtest/run endpoint executes with realistic metrics."""
    payload = {
        "ticker": "^GSPC",
        "initialCapital": 100000.0,
        "bullishThreshold": 0.0020,
        "bearishThreshold": -0.0020,
        "transactionCostPct": 0.0005,
        "slippagePct": 0.0002,
        "strategyMode": "long_only"
    }
    response = client.post("/api/backtest/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "totalReturn" in data
    assert "sharpeRatio" in data
    assert "maxDrawdown" in data
    assert "equityCurve" in data
    assert len(data["equityCurve"]) > 0
    assert data["dataProvenance"] == "Verified Out-of-Sample PyTorch Model Inference"


def test_watchlist_crud(client):
    """Validates Watchlist persistence endpoints."""
    # 1. Get watchlist
    res = client.get("/api/watchlist?userId=test_user_1")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1

    # 2. Add ticker
    add_res = client.post("/api/watchlist?userId=test_user_1", json={
        "ticker": "NVDA",
        "name": "Nvidia Corporation",
        "notes": "AI leader"
    })
    assert add_res.status_code == 201
    assert add_res.json()["ticker"] == "NVDA"

    # 3. Delete ticker
    del_res = client.delete("/api/watchlist/NVDA?userId=test_user_1")
    assert del_res.status_code == 200


def test_portfolio_crud(client):
    """Validates Portfolio persistence endpoints."""
    # 1. Get portfolio
    res = client.get("/api/portfolio?userId=test_user_2")
    assert res.status_code == 200
    holdings = res.json()
    assert len(holdings) >= 1

    # 2. Add holding
    add_res = client.post("/api/portfolio?userId=test_user_2", json={
        "ticker": "AAPL",
        "shares": 15.0,
        "avgBuyPrice": 220.0,
        "purchaseDate": "2024-05-10",
        "notes": "Tech core"
    })
    assert add_res.status_code == 201
    created = add_res.json()
    holding_id = created["id"]
    assert created["ticker"] == "AAPL"
    assert created["shares"] == 15.0

    # 3. Update holding
    upd_res = client.put(f"/api/portfolio/{holding_id}?userId=test_user_2", json={
        "shares": 20.0
    })
    assert upd_res.status_code == 200
    assert upd_res.json()["shares"] == 20.0

    # 4. Delete holding
    del_res = client.delete(f"/api/portfolio/{holding_id}?userId=test_user_2")
    assert del_res.status_code == 200
