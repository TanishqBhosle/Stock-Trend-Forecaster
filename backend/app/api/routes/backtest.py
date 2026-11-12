from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.backtest_service import backtest_service

router = APIRouter(tags=["Backtest"])


class BacktestRequest(BaseModel):
    ticker: str = Field("^GSPC", description="Asset ticker symbol")
    initialCapital: float = Field(100000.0, gt=0, description="Starting capital in USD")
    bullishThreshold: float = Field(0.0020, description="Predicted return required to enter long (+0.20%)")
    bearishThreshold: float = Field(-0.0020, description="Predicted return required to enter short/exit (-0.20%)")
    transactionCostPct: float = Field(0.0005, ge=0, description="Brokerage commission / fee (0.05%)")
    slippagePct: float = Field(0.0002, ge=0, description="Market impact / slippage (0.02%)")
    strategyMode: str = Field("long_only", description="'long_only' or 'long_short'")
    startDate: Optional[str] = Field(None, description="Start date YYYY-MM-DD")
    endDate: Optional[str] = Field(None, description="End date YYYY-MM-DD")


@router.post("/backtest/run")
@router.post("/v1/backtest/run")
def run_model_backtest(
    payload: BacktestRequest,
    db: Session = Depends(get_db)
):
    """
    Executes backtesting against verified historical out-of-sample PyTorch LSTM model predictions.
    Incorporates explicit transaction friction and slippage.
    """
    try:
        results = backtest_service.run_backtest(
            db=db,
            ticker=payload.ticker,
            initial_capital=payload.initialCapital,
            bullish_threshold=payload.bullishThreshold,
            bearish_threshold=payload.bearishThreshold,
            transaction_cost_pct=payload.transactionCostPct,
            slippage_pct=payload.slippagePct,
            strategy_mode=payload.strategyMode,
            start_date=payload.startDate,
            end_date=payload.endDate
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest execution failed: {str(e)}")
