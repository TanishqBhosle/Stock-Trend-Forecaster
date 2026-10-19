"""CLI script to run data download, model training, and evaluation directly."""
import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.services.data_service import data_service
from app.services.training_service import training_service
from app.services.forecast_service import forecast_service
from app.db.database import Base, engine


def main():
    setup_logging()
    logger.info("Setting up database...")
    Base.metadata.create_all(bind=engine)

    logger.info("Step 1: Downloading & cleaning historical market data from 2000 to present...")
    df = data_service.download_and_clean_data(force_refresh=True)
    logger.info(
        f"Data downloaded successfully: {len(df)} rows from {df['Date'].iloc[0]} to {df['Date'].iloc[-1]}"
    )

    logger.info("Step 2: Running LSTM training pipeline...")
    training_service._run_training_pipeline(job_id="cli_training_run")

    logger.info("Step 3: Generating next-session forecast...")
    forecast = forecast_service.generate_next_session_forecast(save_to_db=True)
    logger.info("=== NEXT TRADING SESSION FORECAST ===")
    logger.info(f"Ticker: {forecast['ticker']}")
    logger.info(f"Origin Date: {forecast['originDate']} (Close: ${forecast['referenceClose']:.2f})")
    logger.info(f"Forecast For: {forecast['forecastFor']}")
    logger.info(f"Predicted Return: {forecast['predictedReturn']:.6f} ({forecast['predictedReturnPct']:+.2f}%)")
    logger.info(f"Predicted Close: ${forecast['predictedClose']:.2f}")
    logger.info(f"Movement: {forecast['expectedMovement']}")
    logger.info(f"Signal: {forecast['trendSignal']}")
    logger.info(f"Model: {forecast['modelVersion']}")
    logger.info("====================================")


if __name__ == "__main__":
    main()
