import numpy as np
import pandas as pd
import pytest
from app.services.preprocessing_service import PreprocessingService


def create_synthetic_market_data(n_rows: int = 200) -> pd.DataFrame:
    dates = pd.date_range("2020-01-01", periods=n_rows, freq="B").strftime("%Y-%m-%d").tolist()
    closes = 3000.0 + np.cumsum(np.random.randn(n_rows) * 10)
    opens = closes + np.random.randn(n_rows) * 2
    highs = np.maximum(opens, closes) + np.random.rand(n_rows) * 5
    lows = np.minimum(opens, closes) - np.random.rand(n_rows) * 5
    adj_closes = closes.copy()
    volumes = np.random.randint(1_000_000, 50_000_000, size=n_rows).astype(float)

    return pd.DataFrame({
        "Date": dates,
        "Open": opens,
        "High": highs,
        "Low": lows,
        "Close": closes,
        "Adj Close": adj_closes,
        "Volume": volumes
    })


def test_sequence_creation_shape_and_target_alignment(tmp_path):
    svc = PreprocessingService(artifacts_dir=tmp_path)
    df = create_synthetic_market_data(n_rows=100)

    X_raw, y_raw, target_dates, ref_closes, origin_dates = svc.create_sequences_and_targets(df, lookback=60)

    # 100 rows with lookback 60 -> 40 sequences (indices 60 to 99)
    assert len(X_raw) == 40
    assert X_raw.shape == (40, 60, 6)
    assert y_raw.shape == (40, 1)

    # Verify first sequence target alignment:
    # Target index = 60
    # Expected target return = (Close[60] / Close[59]) - 1
    expected_ret_0 = (df["Close"].iloc[60] / df["Close"].iloc[59]) - 1.0
    assert pytest.approx(float(y_raw[0, 0]), rel=1e-5) == expected_ret_0
    assert target_dates[0] == df["Date"].iloc[60]
    assert origin_dates[0] == df["Date"].iloc[59]
    assert ref_closes[0] == df["Close"].iloc[59]

    # Verify input sequence: rows 0 to 59
    assert np.allclose(X_raw[0, :, 3], df["Close"].iloc[0:60].values)


def test_chronological_80_10_10_split(tmp_path):
    svc = PreprocessingService(artifacts_dir=tmp_path)
    df = create_synthetic_market_data(n_rows=160)
    # 160 rows - 60 lookback = 100 sequences
    X_raw, y_raw, target_dates, ref_closes, origin_dates = svc.create_sequences_and_targets(df, lookback=60)
    assert len(X_raw) == 100

    splits = svc.chronological_split(X_raw, y_raw, target_dates, ref_closes)
    info = splits["info"]

    assert info["train_samples"] == 80  # 80%
    assert info["val_samples"] == 10    # 10%
    assert info["test_samples"] == 10   # 10%

    # Verify time ordering: train dates strictly precede val dates, which precede test dates
    assert splits["train"]["dates"][-1] < splits["val"]["dates"][0]
    assert splits["val"]["dates"][-1] < splits["test"]["dates"][0]


def test_scalers_fitted_on_train_only(tmp_path):
    svc = PreprocessingService(artifacts_dir=tmp_path)
    df = create_synthetic_market_data(n_rows=160)
    X_raw, y_raw, target_dates, ref_closes, origin_dates = svc.create_sequences_and_targets(df, lookback=60)
    splits = svc.chronological_split(X_raw, y_raw, target_dates, ref_closes)

    train_X = splits["train"]["X"]
    train_y = splits["train"]["y"]
    val_X = splits["val"]["X"]

    feature_scaler, target_scaler = svc.fit_and_save_scalers(train_X, train_y)

    # Scaler mean must match train data mean, NOT val data mean
    train_flat = train_X.reshape(-1, 6)
    expected_means = np.mean(train_flat, axis=0)
    assert np.allclose(feature_scaler.mean_, expected_means, atol=1e-4)

    # Transform
    scaled_train_X = svc.transform_X(train_X, feature_scaler)
    scaled_val_X = svc.transform_X(val_X, feature_scaler)

    # Train scaled should have ~0 mean
    assert np.allclose(np.mean(scaled_train_X.reshape(-1, 6), axis=0), 0.0, atol=1e-2)
