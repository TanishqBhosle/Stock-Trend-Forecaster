import numpy as np
import pytest
from app.utils.metrics import (
    calculate_rmse,
    calculate_mae,
    calculate_directional_accuracy,
    classify_direction,
    compute_all_metrics
)


def test_rmse_calculation():
    actual = np.array([0.01, 0.02, -0.01, 0.0])
    predicted = np.array([0.015, 0.01, -0.005, 0.002])
    # diffs = [-0.005, 0.01, -0.005, -0.002]
    # diffs^2 = [0.000025, 0.0001, 0.000025, 0.000004] -> mean = 0.0000385 -> sqrt = 0.0062048
    rmse = calculate_rmse(actual, predicted)
    expected = float(np.sqrt(np.mean((actual - predicted) ** 2)))
    assert pytest.approx(rmse, rel=1e-5) == expected


def test_mae_calculation():
    actual = np.array([0.01, 0.02, -0.01, 0.0])
    predicted = np.array([0.015, 0.01, -0.005, 0.002])
    mae = calculate_mae(actual, predicted)
    expected = float(np.mean(np.abs(actual - predicted)))
    assert pytest.approx(mae, rel=1e-5) == expected


def test_directional_accuracy_all_correct():
    actual = np.array([0.01, 0.02, -0.01, -0.03])
    predicted = np.array([0.005, 0.03, -0.002, -0.01])
    da = calculate_directional_accuracy(actual, predicted)
    assert da == 100.0


def test_directional_accuracy_mixed():
    actual = np.array([0.01, -0.02, 0.03, -0.01])
    predicted = np.array([0.02, 0.01, 0.005, -0.02])
    # index 0: + vs + (match)
    # index 1: - vs + (mismatch)
    # index 2: + vs + (match)
    # index 3: - vs - (match)
    # 3 out of 4 = 75.0%
    da = calculate_directional_accuracy(actual, predicted)
    assert da == 75.0


def test_directional_accuracy_with_zeros():
    actual = np.array([0.0, 0.01, -0.01, 0.0])
    predicted = np.array([0.0, -0.01, -0.02, 0.005])
    # index 0: 0 vs 0 (match)
    # index 1: + vs - (mismatch)
    # index 2: - vs - (match)
    # index 3: 0 vs + (mismatch)
    # 2 out of 4 = 50.0%
    da = calculate_directional_accuracy(actual, predicted)
    assert da == 50.0


def test_classify_direction():
    assert classify_direction(0.006) == "BULLISH"
    assert classify_direction(-0.007) == "BEARISH"
    assert classify_direction(0.002) == "NEUTRAL"
    assert classify_direction(-0.003) == "NEUTRAL"
    assert classify_direction(0.0) == "NEUTRAL"
