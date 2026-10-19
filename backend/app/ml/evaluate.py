from typing import Dict, List, Any, Tuple
import numpy as np
import torch
from app.ml.lstm_model import LSTMRegressor, get_device
from app.utils.metrics import compute_all_metrics, classify_direction
from app.core.logging import logger


def evaluate_model(
    model: LSTMRegressor,
    X_scaled: np.ndarray,
    y_raw: np.ndarray,
    target_scaler: Any,
    dates: List[str],
    ref_closes: List[float],
    evaluation_type: str = "held_out_test",
    batch_size: int = 128
) -> Dict[str, Any]:
    """
    Evaluates PyTorch LSTM on a test/validation split.
    Model outputs predictions in scaled return space, which are inverse-transformed to original decimal return scale.
    Calculates RMSE, MAE, Directional Accuracy, and aligned prediction records.
    """
    device = get_device()
    model.eval()
    model.to(device)

    preds_scaled_list = []
    num_samples = len(X_scaled)

    with torch.no_grad():
        for i in range(0, num_samples, batch_size):
            batch_x = torch.from_numpy(X_scaled[i : i + batch_size]).float().to(device)
            out = model(batch_x)
            preds_scaled_list.append(out.cpu().numpy())

    preds_scaled = np.vstack(preds_scaled_list)
    preds_return = target_scaler.inverse_transform(preds_scaled).flatten()
    actual_return = y_raw.flatten()

    metrics = compute_all_metrics(actual_return, preds_return)
    metrics["sampleCount"] = num_samples
    metrics["startDate"] = dates[0] if dates else ""
    metrics["endDate"] = dates[-1] if dates else ""
    metrics["evaluationType"] = evaluation_type

    logger.info(
        f"{evaluation_type.upper()} Evaluation - Samples: {num_samples} | "
        f"RMSE: {metrics['rmse']:.6f} | MAE: {metrics['mae']:.6f} | "
        f"Directional Accuracy: {metrics['directionalAccuracy']:.2f}%"
    )

    prediction_points = []
    for i in range(num_samples):
        act_ret = float(actual_return[i])
        pred_ret = float(preds_return[i])
        ref_c = float(ref_closes[i])
        act_c = round(ref_c * (1.0 + act_ret), 2)
        pred_c = round(ref_c * (1.0 + pred_ret), 2)
        act_dir = classify_direction(act_ret)
        pred_dir = classify_direction(pred_ret)

        prediction_points.append({
            "date": dates[i],
            "actualReturn": act_ret,
            "predictedReturn": pred_ret,
            "actualClose": act_c,
            "predictedClose": pred_c,
            "actualDirection": act_dir,
            "predictedDirection": pred_dir,
            "isCorrect": (act_dir == pred_dir)
        })

    return {
        "metrics": metrics,
        "predictions": prediction_points
    }
