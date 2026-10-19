import numpy as np
import pytest
import torch
from sklearn.preprocessing import StandardScaler
from app.ml.lstm_model import LSTMRegressor
from app.ml.walk_forward import run_walk_forward_evaluation


def test_walk_forward_date_alignment_and_no_leakage():
    # Setup dummy model and data
    model = LSTMRegressor(input_size=6, hidden_size=32, num_layers=2, dropout=0.0, output_size=1)
    model.eval()

    n_samples = 15
    X_scaled = np.random.randn(n_samples, 60, 6).astype(np.float32)
    y_raw = np.random.uniform(-0.02, 0.02, (n_samples, 1)).astype(np.float32)

    target_scaler = StandardScaler()
    target_scaler.fit(y_raw)

    dates = [f"2023-01-{i+1:02d}" for i in range(n_samples)]
    origin_dates = [f"2023-01-{i:02d}" for i in range(n_samples)]
    ref_closes = [100.0 + i * 2.0 for i in range(n_samples)]

    wf = run_walk_forward_evaluation(
        model=model,
        X_scaled=X_scaled,
        y_raw=y_raw,
        target_scaler=target_scaler,
        dates=dates,
        ref_closes=ref_closes,
        origin_dates=origin_dates,
        step_size=1
    )

    metrics = wf["metrics"]
    predictions = wf["predictions"]

    assert metrics["sampleCount"] == n_samples
    assert metrics["startDate"] == dates[0]
    assert metrics["endDate"] == dates[-1]
    assert len(predictions) == n_samples

    # Check each step:
    for i, pred in enumerate(predictions):
        assert pred["date"] == dates[i]
        assert pred["originDate"] == origin_dates[i]
        assert pytest.approx(pred["actualReturn"], rel=1e-5) == float(y_raw[i, 0])
        # Implied price formula verification:
        expected_act_close = round(ref_closes[i] * (1.0 + float(y_raw[i, 0])), 2)
        assert pred["actualClose"] == expected_act_close
        expected_pred_close = round(ref_closes[i] * (1.0 + pred["predictedReturn"]), 2)
        assert pred["predictedClose"] == expected_pred_close
