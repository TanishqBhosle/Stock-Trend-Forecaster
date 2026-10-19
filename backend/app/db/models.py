import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text
from app.db.database import Base


class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String(20), index=True, nullable=False, default="^GSPC")
    origin_date = Column(String(30), nullable=False)  # Trading date of reference close
    forecast_date = Column(String(30), nullable=False)  # Date the forecast was run
    forecast_for = Column(String(30), nullable=False)  # Trading date being predicted
    reference_close = Column(Float, nullable=False)
    predicted_return = Column(Float, nullable=False)
    predicted_close = Column(Float, nullable=False)
    signal = Column(String(20), nullable=False)  # BULLISH / NEUTRAL / BEARISH
    actual_return = Column(Float, nullable=True)
    actual_close = Column(Float, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    model_version = Column(String(50), nullable=False, default="lstm-v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    run_id = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(String(30), nullable=False, default="queued")  # queued, running, completed, failed
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    epochs_trained = Column(Integer, nullable=True)
    best_val_loss = Column(Float, nullable=True)
    test_rmse = Column(Float, nullable=True)
    test_mae = Column(Float, nullable=True)
    test_directional_accuracy = Column(Float, nullable=True)
    train_samples = Column(Integer, nullable=True)
    val_samples = Column(Integer, nullable=True)
    test_samples = Column(Integer, nullable=True)
    config_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)


class MarketDataMeta(Base):
    __tablename__ = "market_data_meta"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), unique=True, index=True, nullable=False)
    start_date = Column(String(30), nullable=False)
    end_date = Column(String(30), nullable=False)
    row_count = Column(Integer, nullable=False)
    latest_close = Column(Float, nullable=False)
    last_refreshed_at = Column(DateTime, default=datetime.datetime.utcnow)
