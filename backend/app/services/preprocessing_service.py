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
        self.stationary_cols = [
            "Log_Return",
            "RSI_14",
            "Hist_Vol_20",
            "SMA_Dist_50",
            "HL_True_Range",
            "Volume_Z"
        ]

    def compute_stationary_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates stationary quantitative features to overcome non-stationarity of raw OHLC prices:
        1. Log Returns: ln(Close_t / Close_{t-1})
        2. RSI 14: Relative Strength Index scaled to [-1, 1]
        3. Hist_Vol_20: 20-day annualized rolling volatility
        4. SMA_Dist_50: Normalized distance from 50-day SMA: (Close - SMA_50) / SMA_50
        5. HL_True_Range: High-Low True Range normalized by prior close
        6. Volume_Z: 20-day rolling z-score of Volume
        """
        df = df.copy()
        closes = df["Close"].astype(float)
        highs = df["High"].astype(float)
        lows = df["Low"].astype(float)
        volumes = df["Volume"].astype(float)

        # 1. Log Returns
        df["Log_Return"] = np.log(closes / closes.shift(1)).fillna(0.0)

        # 2. RSI 14
        delta = closes.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / (loss + 1e-8)
        rsi = 100.0 - (100.0 / (1.0 + rs))
        # Normalize RSI from [0, 100] to [-1, 1]
        df["RSI_14"] = ((rsi - 50.0) / 50.0).fillna(0.0)

        # 3. 20-day Historical Volatility (annualized)
        df["Hist_Vol_20"] = (df["Log_Return"].rolling(window=20).std() * np.sqrt(252)).fillna(0.0)

        # 4. 50-day SMA Distance
        sma_50 = closes.rolling(window=50).mean()
        df["SMA_Dist_50"] = ((closes - sma_50) / (sma_50 + 1e-8)).fillna(0.0)

        # 5. High-Low True Range normalized by previous close
        prev_close = closes.shift(1).fillna(closes)
        tr1 = highs - lows
        tr2 = (highs - prev_close).abs()
        tr3 = (lows - prev_close).abs()
        true_range = np.maximum(tr1, np.maximum(tr2, tr3))
        df["HL_True_Range"] = (true_range / (prev_close + 1e-8)).fillna(0.0)

        # 6. Volume Z-Score (20-day window)
        vol_mean = volumes.rolling(window=20).mean()
        vol_std = volumes.rolling(window=20).std()
        df["Volume_Z"] = ((volumes - vol_mean) / (vol_std + 1e-8)).clip(-3.0, 3.0).fillna(0.0)

        return df

    def create_stationary_sequences_and_targets(
        self,
        df: pd.DataFrame,
        lookback: int = settings.LOOKBACK_WINDOW
    ) -> Tuple[np.ndarray, np.ndarray, List[str], List[float], List[str]]:
        """
        Generates sequence tensors using stationary quantitative features.
        """
        df_feat = self.compute_stationary_features(df)
        # Drop warmup rows from 50-day SMA
        df_clean = df_feat.iloc[50:].reset_index(drop=True)
        return self._build_sequence_tensors(df_clean, self.stationary_cols, lookback)

    def create_sequences_and_targets(
        self,
        df: pd.DataFrame,
        lookback: int = settings.LOOKBACK_WINDOW
    ) -> Tuple[np.ndarray, np.ndarray, List[str], List[float], List[str]]:
        """
        Builds chronological (60, 6) sequences using standard features.
        Target: target_return[t] = (Close[t] / Close[t-1]) - 1.
        Inputs for target at index t: rows [t-lookback : t].
        """
        return self._build_sequence_tensors(df, self.feature_cols, lookback)

    def _build_sequence_tensors(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        lookback: int
    ) -> Tuple[np.ndarray, np.ndarray, List[str], List[float], List[str]]:
        required_cols = list(feature_cols) + ["Date", "Close"]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise KeyError(f"DataFrame is missing required feature/date columns: {missing}")

        N = len(df)
        if N <= lookback:
            raise ValueError(f"Data length {N} is too short for lookback window {lookback}.")

        features_data = df[feature_cols].values.astype(np.float64)
        closes = df["Close"].values.astype(np.float64)
        dates = df["Date"].tolist()

        X_list = []
        y_list = []
        target_dates = []
        origin_dates = []
        reference_closes = []

        for t in range(lookback, N):
            seq_x = features_data[t - lookback : t]  # Shape: (lookback, num_features)
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
                f"Scalers not found at {self.feature_scaler_path} and {self.target_scaler_path}."
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
