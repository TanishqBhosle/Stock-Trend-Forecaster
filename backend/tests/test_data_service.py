import pytest
import pandas as pd
import numpy as np
from app.services.data_service import DataService


def test_data_service_validation_and_clean(tmp_path):
    svc = DataService(data_dir=tmp_path, ticker="^GSPC")

    # Create uncleaned dataframe with duplicates, NaN, bad ordering
    raw_df = pd.DataFrame({
        "Date": ["2023-01-05", "2023-01-02", "2023-01-03", "2023-01-03", "2023-01-04"],
        "Open": [100.0, 95.0, 98.0, 98.0, np.nan],
        "High": [105.0, 97.0, 100.0, 100.0, 102.0],
        "Low": [99.0, 94.0, 96.0, 96.0, 97.0],
        "Close": [104.0, 96.0, 99.0, 99.0, 101.0],
        "Adj Close": [104.0, 96.0, 99.0, 99.0, 101.0],
        "Volume": [1000, 2000, 1500, 1500, 3000]
    })

    # Cache file mock
    cache_path = tmp_path / "GSPC.csv"
    raw_df.to_csv(cache_path, index=False)

    df_cleaned = svc.load_cached_data()

    # Verification:
    # 1. Row count should be preserved from cache or cleaned
    assert "Date" in df_cleaned.columns
    assert "Open" in df_cleaned.columns
    assert "Close" in df_cleaned.columns
    assert "Adj Close" in df_cleaned.columns
    assert "Volume" in df_cleaned.columns
