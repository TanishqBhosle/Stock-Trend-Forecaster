import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Stock Trend Forecaster API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts" / "lstm"
    DB_PATH: Path = BASE_DIR / "data" / "forecaster.db"
    
    # ML & Asset Configuration
    TICKER: str = "^GSPC"
    START_DATE: str = "2000-01-01"
    LOOKBACK_WINDOW: int = 60
    FEATURES: List[str] = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]
    
    # Chronological Split
    TRAIN_SPLIT_RATIO: float = 0.80
    VAL_SPLIT_RATIO: float = 0.10
    TEST_SPLIT_RATIO: float = 0.10
    
    # Model Hyperparameters
    INPUT_SIZE: int = 6
    HIDDEN_SIZE: int = 128
    NUM_LAYERS: int = 2
    DROPOUT: float = 0.2
    OUTPUT_SIZE: int = 1
    LEARNING_RATE: float = 0.001
    BATCH_SIZE: int = 64
    MAX_EPOCHS: int = 100
    PATIENCE: int = 15
    RANDOM_SEED: int = 42
    
    # Trend Signal Thresholds
    # Bullish > +0.005 (+0.5%), Bearish < -0.005 (-0.5%), Neutral in between
    BULLISH_THRESHOLD: float = 0.005
    BEARISH_THRESHOLD: float = -0.005
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/forecaster.db"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
