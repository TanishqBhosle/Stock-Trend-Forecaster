from typing import Dict, List, Any, Optional
import numpy as np
import torch
from app.ml.lstm_model import LSTMRegressor, get_device
from app.utils.metrics import compute_all_metrics, classify_direction
from app.core.logging import logger


def run_walk_forward_evaluation(
    model: LSTMRegressor,
    X_scaled: np.ndarray,
    y_raw: np.ndarray,
    target_scaler: Any,
    dates: List[str],
    ref_closes: List[float],
    origin_dates: Optional[List[str]] = None,
    step_size: int = 1,
    max_steps: Optional[int] = None
) -> Dict[str, Any]:
    """
    Genuine chronological walk-forward evaluation.
    Evaluates one trading session at a time, sequentially advancing the origin date.
    Uses a fixed trained model with expanding historical input context and fixed weights.
    Labeled explicitly as 'fixed-model walk-forward evaluation'.
    """
    device = get_device()
    model.eval()
    model.to(device)

    total_samples = len(X_scaled)
    steps_to_run = total_samples if max_steps is None else min(max_steps, total_samples)

    actual_returns: List[float] = []
    predicted_returns: List[float] = []
    prediction_records: List[Dict[str, Any]] = []

    with torch.no_grad():
        for i in range(0, steps_to_run, step_size):
            # Input sequence is strictly the 60 sessions prior to target session
            single_seq = torch.from_numpy(X_scaled[i : i + 1]).float().to(device)
            out_scaled = model(single_seq).cpu().numpy()
            pred_ret = float(target_scaler.inverse_transform(out_scaled)[0, 0])
            act_ret = float(y_raw[i, 0])

            actual_returns.append(act_ret)
            predicted_returns.append(pred_ret)

            ref_c = float(ref_closes[i])
            act_c = round(ref_c * (1.0 + act_ret), 2)
            pred_c = round(ref_c * (1.0 + pred_ret), 2)

            act_dir = classify_direction(act_ret)
            pred_dir = classify_direction(pred_ret)

            origin = origin_dates[i] if origin_dates and i < len(origin_dates) else None

            prediction_records.append({
                "date": dates[i],
                "originDate": origin,
                "actualReturn": act_ret,
                "predictedReturn": pred_ret,
                "actualClose": act_c,
                "predictedClose": pred_c,
                "actualDirection": act_dir,
                "predictedDirection": pred_dir,
                "isCorrect": (act_dir == pred_dir)
            })

    metrics = compute_all_metrics(np.array(actual_returns), np.array(predicted_returns))
    metrics["sampleCount"] = len(actual_returns)
    metrics["startDate"] = dates[0] if dates else ""
    metrics["endDate"] = dates[steps_to_run - 1] if dates else ""
    metrics["evaluationType"] = "fixed_model_walk_forward"

    logger.info(
        f"Walk-Forward Evaluation Complete ({metrics['sampleCount']} steps) | "
        f"RMSE: {metrics['rmse']:.6f} | MAE: {metrics['mae']:.6f} | "
        f"Directional Accuracy: {metrics['directionalAccuracy']:.2f}%"
    )

    return {
        "metrics": metrics,
        "predictions": prediction_records,
        "evaluationLabel": "Fixed-Model Walk-Forward Evaluation",
        "description": "Sequential one-step forecasting over held-out periods using preceding 60 sessions without future data leakage."
    }
