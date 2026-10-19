import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib
from app.core.config import settings
from app.core.logging import logger


class PreprocessingService:
    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = artifacts_dir or settings.ARTIFACTS_DIR
        self.feature_scaler_path = self.artifacts_dir / "feature_scaler.pkl"
        self.target_scaler_path = self.artifacts_dir / "target_scaler.pkl"
        self.feature_cols = settings.FEATURES  # ["Open", "High", "Low", "Close", "Adj Close", "Volume"]

    def create_sequences_and_targets(
        self,
        df: pd.DataFrame,
        lookback: int = settings.LOOKBACK_WINDOW
    ) -> Tuple[np.ndarray, np.ndarray, List[str], List[float], List[str]]:
        """
        Builds chronological (60, 6) sequences.
        Target: target_return[t] = (Close[t] / Close[t-1]) - 1.
        Inputs for target at index t: rows [t-lookback : t].
        
        Returns:
            X_raw: (num_sequences, lookback, 6)
            y_raw: (num_sequences, 1) - decimal return
            target_dates: list of dates corresponding to target t
            reference_closes: list of Close[t-1]
            origin_dates: list of dates corresponding to t-1
        """
        required_cols = list(self.feature_cols) + ["Date"]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise KeyError(f"DataFrame is missing required feature/date columns: {missing}")

        N = len(df)
        if N <= lookback:
            raise ValueError(f"Data length {N} is too short for lookback window {lookback}.")

        features_data = df[self.feature_cols].values.astype(np.float64)
        closes = df["Close"].values.astype(np.float64)
        dates = df["Date"].tolist()

        X_list = []
        y_list = []
        target_dates = []
        origin_dates = []
        reference_closes = []

        for t in range(lookback, N):
            seq_x = features_data[t - lookback : t]  # Shape: (60, 6)
            ref_close = closes[t - 1]
            target_close = closes[t]
            target_return = (target_close / ref_close) - 1.0

            X_list.append(seq_x)
            y_list.append([target_return])
            target_dates.append(dates[t])
            origin_dates.append(dates[t - 1])
            reference_closes.append(ref_close)

        X_raw = np.array(X_list, dtype=np.float32)
        y_raw = np.array(y_list, dtype=np.float32)

        return X_raw, y_raw, target_dates, reference_closes, origin_dates

    def chronological_split(
        self,
        X_raw: np.ndarray,
        y_raw: np.ndarray,
        target_dates: List[str],
        reference_closes: List[float],
        train_ratio: float = settings.TRAIN_SPLIT_RATIO,
        val_ratio: float = settings.VAL_SPLIT_RATIO
    ) -> Dict[str, Any]:
        """
        Performs strict chronological 80/10/10 split by target sequence index.
        No future data leakage.
        """
        num_samples = len(X_raw)
        train_end = int(num_samples * train_ratio)
        val_end = int(num_samples * (train_ratio + val_ratio))

        train_data = {
            "X": X_raw[:train_end],
            "y": y_raw[:train_end],
            "dates": target_dates[:train_end],
            "ref_closes": reference_closes[:train_end]
        }
        val_data = {
            "X": X_raw[train_end:val_end],
            "y": y_raw[train_end:val_end],
            "dates": target_dates[train_end:val_end],
            "ref_closes": reference_closes[train_end:val_end]
        }
        test_data = {
            "X": X_raw[val_end:],
            "y": y_raw[val_end:],
            "dates": target_dates[val_end:],
            "ref_closes": reference_closes[val_end:]
        }

        split_info = {
            "total_samples": num_samples,
            "train_samples": len(train_data["X"]),
            "val_samples": len(val_data["X"]),
            "test_samples": len(test_data["X"]),
            "train_dates": (train_data["dates"][0], train_data["dates"][-1]),
            "val_dates": (val_data["dates"][0], val_data["dates"][-1]),
            "test_dates": (test_data["dates"][0], test_data["dates"][-1]),
        }
        logger.info(f"Chronological split completed: {split_info}")

        return {
            "train": train_data,
            "val": val_data,
            "test": test_data,
            "info": split_info
        }

    def fit_scalers(
        self,
        X_train_raw: np.ndarray,
        y_train_raw: np.ndarray
    ) -> Tuple[StandardScaler, StandardScaler]:
        """
        Fits StandardScaler on TRAINING sequences only.
        Feature scaler is fit on (N_train * 60, 6) reshaped 2D matrix.
        Target scaler is fit on (N_train, 1).
        Does not write to disk immediately to allow atomic deployment.
        """
        feature_scaler = StandardScaler()
        N, seq_len, num_features = X_train_raw.shape
        X_train_flat = X_train_raw.reshape(-1, num_features)
        feature_scaler.fit(X_train_flat)

        target_scaler = StandardScaler()
        target_scaler.fit(y_train_raw)

        return feature_scaler, target_scaler

    def save_scalers(
        self,
        feature_scaler: StandardScaler,
        target_scaler: StandardScaler,
        target_dir: Optional[Path] = None
    ) -> None:
        """Saves fitted scalers to specified or default artifacts directory."""
        dest_dir = target_dir or self.artifacts_dir
        dest_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(feature_scaler, dest_dir / "feature_scaler.pkl")
        joblib.dump(target_scaler, dest_dir / "target_scaler.pkl")
        logger.info(f"Saved feature scaler and target scaler to {dest_dir}")

    def fit_and_save_scalers(
        self,
        X_train_raw: np.ndarray,
        y_train_raw: np.ndarray
    ) -> Tuple[StandardScaler, StandardScaler]:
        feature_scaler, target_scaler = self.fit_scalers(X_train_raw, y_train_raw)
        self.save_scalers(feature_scaler, target_scaler)
        return feature_scaler, target_scaler

    def load_scalers(self) -> Tuple[StandardScaler, StandardScaler]:
        if not self.feature_scaler_path.exists() or not self.target_scaler_path.exists():
            raise FileNotFoundError(
                f"Scalers not found at {self.feature_scaler_path} and {self.target_scaler_path}. Model training required."
            )
        feature_scaler = joblib.load(self.feature_scaler_path)
        target_scaler = joblib.load(self.target_scaler_path)
        return feature_scaler, target_scaler

    def transform_X(self, X_raw: np.ndarray, feature_scaler: StandardScaler) -> np.ndarray:
        N, seq_len, num_features = X_raw.shape
        X_flat = X_raw.reshape(-1, num_features)
        X_scaled_flat = feature_scaler.transform(X_flat)
        return X_scaled_flat.reshape(N, seq_len, num_features).astype(np.float32)

    def transform_y(self, y_raw: np.ndarray, target_scaler: StandardScaler) -> np.ndarray:
        return target_scaler.transform(y_raw).astype(np.float32)

    def inverse_transform_y(self, y_scaled: np.ndarray, target_scaler: StandardScaler) -> np.ndarray:
        return target_scaler.inverse_transform(y_scaled).astype(np.float64)


preprocessing_service = PreprocessingService()
