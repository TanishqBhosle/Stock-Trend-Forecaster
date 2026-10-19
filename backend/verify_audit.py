import json
import numpy as np

def run_verification():
    with open('backend/artifacts/lstm/metrics.json') as f:
        saved_metrics = json.load(f)

    with open('backend/artifacts/lstm/test_predictions.json') as f:
        test_preds = json.load(f)

    with open('backend/artifacts/lstm/walk_forward_predictions.json') as f:
        wf_preds = json.load(f)

    actual_test = np.array([p['actualReturn'] for p in test_preds], dtype=np.float64)
    pred_test = np.array([p['predictedReturn'] for p in test_preds], dtype=np.float64)

    # 1. Recalculate test metrics
    rmse = np.sqrt(np.mean((actual_test - pred_test) ** 2))
    mae = np.mean(np.abs(actual_test - pred_test))
    sign_actual = np.sign(actual_test)
    sign_pred = np.sign(pred_test)
    da = np.mean(sign_actual == sign_pred) * 100.0

    print("=== 1. HELD-OUT TEST METRICS VERIFICATION ===")
    print(f"Sample Count: {len(test_preds)}")
    print(f"Independent Recalculated RMSE: {rmse:.6f} vs Saved: {saved_metrics['testMetrics']['rmse']:.6f} (Match: {abs(rmse - saved_metrics['testMetrics']['rmse']) < 1e-6})")
    print(f"Independent Recalculated MAE:  {mae:.6f} vs Saved: {saved_metrics['testMetrics']['mae']:.6f} (Match: {abs(mae - saved_metrics['testMetrics']['mae']) < 1e-6})")
    print(f"Independent Recalculated DA:   {da:.2f}% vs Saved: {saved_metrics['testMetrics']['directionalAccuracy']:.2f}% (Match: {abs(da - saved_metrics['testMetrics']['directionalAccuracy']) < 1e-2})")

    # 2. Recalculate Walk-Forward metrics
    actual_wf = np.array([p['actualReturn'] for p in wf_preds], dtype=np.float64)
    pred_wf = np.array([p['predictedReturn'] for p in wf_preds], dtype=np.float64)
    wf_rmse = np.sqrt(np.mean((actual_wf - pred_wf) ** 2))
    wf_mae = np.mean(np.abs(actual_wf - pred_wf))
    wf_da = np.mean(np.sign(actual_wf) == np.sign(pred_wf)) * 100.0

    print("\n=== 2. WALK-FORWARD METRICS VERIFICATION ===")
    print(f"Sample Count: {len(wf_preds)}")
    print(f"Independent Recalculated WF RMSE: {wf_rmse:.6f} vs Saved: {saved_metrics['walkForwardMetrics']['rmse']:.6f} (Match: {abs(wf_rmse - saved_metrics['walkForwardMetrics']['rmse']) < 1e-6})")
    print(f"Independent Recalculated WF MAE:  {wf_mae:.6f} vs Saved: {saved_metrics['walkForwardMetrics']['mae']:.6f} (Match: {abs(wf_mae - saved_metrics['walkForwardMetrics']['mae']) < 1e-6})")
    print(f"Independent Recalculated WF DA:   {wf_da:.2f}% vs Saved: {saved_metrics['walkForwardMetrics']['directionalAccuracy']:.2f}% (Match: {abs(wf_da - saved_metrics['walkForwardMetrics']['directionalAccuracy']) < 1e-2})")

    # 3. Zero-return baseline on exactly the same held-out test observations
    zero_preds = np.zeros_like(actual_test)
    zero_rmse = np.sqrt(np.mean((actual_test - zero_preds) ** 2))
    zero_mae = np.mean(np.abs(actual_test - zero_preds))

    # Naive directional accuracy where baseline predicts positive drift (market historical direction)
    # or persistence baseline (Close[t] - Close[t-1])
    positive_drift_da = np.mean(np.sign(actual_test) == 1) * 100.0

    print("\n=== 3. ZERO-RETURN BASELINE COMPARISON ===")
    print(f"Zero-Return Baseline (Return = 0.0) RMSE: {zero_rmse:.6f}")
    print(f"LSTM Model RMSE:                          {rmse:.6f} (LSTM improvement: {(zero_rmse - rmse) / zero_rmse * 100:.3f}%)")
    print(f"Zero-Return Baseline (Return = 0.0) MAE:  {zero_mae:.6f}")
    print(f"LSTM Model MAE:                           {mae:.6f} (LSTM improvement: {(zero_mae - mae) / zero_mae * 100:.3f}%)")
    print(f"Upward Drift Baseline Directional Acc:    {positive_drift_da:.2f}%")
    print(f"LSTM Model Directional Accuracy:          {da:.2f}%")

if __name__ == '__main__':
    run_verification()
