import json
import pandas as pd
import numpy as np
import joblib

def verify_pipeline():
    df = pd.read_csv('backend/data/GSPC.csv')
    print("=== DATASET INSPECTION ===")
    print(f"Total rows in GSPC.csv: {len(df)}")
    print(f"Date range: {df['Date'].iloc[0]} to {df['Date'].iloc[-1]}")
    print(f"Columns: {list(df.columns)}")
    print(f"Missing values: {df.isnull().sum().to_dict()}")
    print(f"Duplicate dates: {df['Date'].duplicated().sum()}")
    dates_sorted = df['Date'].is_monotonic_increasing
    print(f"Dates strictly sorted ascending: {dates_sorted}")

    # Check sequence creation logic
    lookback = 60
    # Exactly 6 features: Open, High, Low, Close, Adj Close, Volume
    feature_cols = ['Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']
    features_raw = df[feature_cols].values
    close_raw = df['Close'].values

    # Target calculation
    returns_target = (close_raw[1:] / close_raw[:-1]) - 1.0
    # Sequences start at index `lookback-1`
    # sequence i: inputs are rows i - lookback + 1 to i (inclusive: length = lookback)
    # target is returns_target[i], which corresponds to close[i+1] / close[i] - 1
    total_sequences = len(df) - lookback
    print(f"\n=== SEQUENCE CREATION INSPECTION ===")
    print(f"Lookback window: {lookback}")
    print(f"Calculated sequences: {total_sequences}")

    # Chronological Split: 80% train, 10% val, 10% test
    n_train = int(total_sequences * 0.80)
    n_val = int(total_sequences * 0.10)
    n_test = total_sequences - n_train - n_val
    print(f"\n=== 80/10/10 SPLIT SAMPLES ===")
    print(f"Train sequences (80%): {n_train}")
    print(f"Val sequences (10%):   {n_val}")
    print(f"Test sequences (10%):  {n_test}")
    print(f"Total:                 {n_train + n_val + n_test}")

    # Target dates
    # Sequence index i has target date df['Date'].iloc[i + 1]
    # For train: i from (lookback - 1) to (lookback - 1 + n_train - 1)
    train_first_target_date = df['Date'].iloc[lookback]
    train_last_target_date = df['Date'].iloc[lookback + n_train - 1]
    val_first_target_date = df['Date'].iloc[lookback + n_train]
    val_last_target_date = df['Date'].iloc[lookback + n_train + n_val - 1]
    test_first_target_date = df['Date'].iloc[lookback + n_train + n_val]
    test_last_target_date = df['Date'].iloc[-1]

    print(f"Train target date range: {train_first_target_date} to {train_last_target_date} ({n_train} samples)")
    print(f"Val target date range:   {val_first_target_date} to {val_last_target_date} ({n_val} samples)")
    print(f"Test target date range:  {test_first_target_date} to {test_last_target_date} ({n_test} samples)")

    # Verify scalers
    feat_scaler = joblib.load('backend/artifacts/lstm/feature_scaler.pkl')
    target_scaler = joblib.load('backend/artifacts/lstm/target_scaler.pkl')
    
    # Check that feature scaler was fit on train sequences only:
    # Train sequences span X_train_raw: (n_train, 60, 6)
    # create_sequences_and_targets uses df[lookback:]
    from app.services.preprocessing_service import preprocessing_service
    X_raw, y_raw, target_dates, reference_closes, origin_dates = preprocessing_service.create_sequences_and_targets(df, lookback=60)
    split_result = preprocessing_service.chronological_split(X_raw, y_raw, target_dates, reference_closes)
    
    X_train = split_result['train']['X']
    y_train = split_result['train']['y']
    
    X_train_flat = X_train.reshape(-1, 6)
    expected_mean = np.mean(X_train_flat, axis=0)
    expected_var = np.var(X_train_flat, axis=0)
    
    scaler_mean = feat_scaler.mean_
    scaler_var = feat_scaler.var_
    
    mean_match = np.allclose(scaler_mean, expected_mean, atol=1e-4)
    var_match = np.allclose(scaler_var, expected_var, atol=1e-4)
    
    print(f"\n=== SCALER INTEGRITY (NO LEAKAGE) ===")
    print(f"Scaler features count: {len(scaler_mean)}")
    print(f"Scaler Mean:   {scaler_mean}")
    print(f"Expected Mean: {expected_mean}")
    print(f"Feature scaler mean strictly matches X_train mean: {mean_match}")
    print(f"Feature scaler variance strictly matches X_train variance: {var_match}")
    
    expected_y_mean = np.mean(y_train)
    expected_y_var = np.var(y_train)
    y_mean_match = np.allclose(target_scaler.mean_[0], expected_y_mean, atol=1e-4)
    y_var_match = np.allclose(target_scaler.var_[0], expected_y_var, atol=1e-4)
    print(f"Target scaler mean strictly matches y_train mean: {y_mean_match}")
    print(f"Target scaler variance strictly matches y_train variance: {y_var_match}")
    
    # Target alignment check
    with open('backend/artifacts/lstm/test_predictions.json') as f:
        test_preds = json.load(f)
    print(f"\n=== TARGET DATE ALIGNMENT ===")
    test_dates = split_result['test']['dates']
    print(f"First test target date in artifact: {test_preds[0]['date']} (Expected: {test_dates[0]})")
    print(f"Last test target date in artifact:  {test_preds[-1]['date']} (Expected: {test_dates[-1]})")
    all_dates_match = [p['date'] for p in test_preds] == test_dates
    print(f"All 668 target dates match 100%: {all_dates_match}")

if __name__ == '__main__':
    verify_pipeline()
