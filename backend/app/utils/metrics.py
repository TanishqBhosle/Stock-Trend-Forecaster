import numpy as np
from typing import Tuple, Dict, Any, List


def calculate_rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Computes Root Mean Squared Error:
    RMSE = sqrt(mean((actual - predicted)^2))
    Operates on original decimal return scale.
    """
    actual = np.asarray(actual, dtype=np.float64)
    predicted = np.asarray(predicted, dtype=np.float64)
    mse = np.mean((actual - predicted) ** 2)
    return float(np.sqrt(mse))


def calculate_mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    """
    Computes Mean Absolute Error:
    MAE = mean(abs(actual - predicted))
    Operates on original decimal return scale.
    """
    actual = np.asarray(actual, dtype=np.float64)
    predicted = np.asarray(predicted, dtype=np.float64)
    return float(np.mean(np.abs(actual - predicted)))


def calculate_directional_accuracy(
    actual: np.ndarray,
    predicted: np.ndarray,
    zero_threshold: float = 1e-7
) -> float:
    """
    Directional Accuracy = (number of correctly predicted directions / total valid predictions) * 100
    
    Zero-return convention:
    - If |x| <= zero_threshold, direction is 0 (neutral / flat).
    - If x > zero_threshold, direction is +1 (up / positive).
    - If x < -zero_threshold, direction is -1 (down / negative).
    
    A prediction is correct if sign(actual) == sign(predicted).
    When actual is 0 (flat), a predicted 0 is considered correct.
    """
    actual = np.asarray(actual, dtype=np.float64)
    predicted = np.asarray(predicted, dtype=np.float64)
    
    if len(actual) == 0:
        return 0.0

    def get_direction(arr: np.ndarray) -> np.ndarray:
        direction = np.zeros_like(arr, dtype=np.int32)
        direction[arr > zero_threshold] = 1
        direction[arr < -zero_threshold] = -1
        return direction

    actual_dir = get_direction(actual)
    pred_dir = get_direction(predicted)

    matches = np.sum(actual_dir == pred_dir)
    return float((matches / len(actual)) * 100.0)


def classify_direction(ret: float, threshold: float = 0.005) -> str:
    """
    Classifies a return into BULLISH, BEARISH, or NEUTRAL.
    Default threshold: ±0.5% (±0.005).
    """
    if ret > threshold:
        return "BULLISH"
    elif ret < -threshold:
        return "BEARISH"
    else:
        return "NEUTRAL"


def compute_all_metrics(
    actual: np.ndarray,
    predicted: np.ndarray
) -> Dict[str, float]:
    """
    Calculates RMSE, MAE, and Directional Accuracy.
    """
    rmse = calculate_rmse(actual, predicted)
    mae = calculate_mae(actual, predicted)
    da = calculate_directional_accuracy(actual, predicted)
    return {
        "rmse": rmse,
        "mae": mae,
        "directionalAccuracy": da
    }
