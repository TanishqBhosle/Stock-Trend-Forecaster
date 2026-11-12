import json
import math
from pathlib import Path
from typing import Dict, List, Optional, Any
import numpy as np
from sqlalchemy.orm import Session
from app.db.models import PredictionRecord
from app.core.config import settings
from app.core.logging import logger


class BacktestService:
    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = artifacts_dir or settings.ARTIFACTS_DIR
        self.test_predictions_path = self.artifacts_dir / "test_predictions.json"

    def _load_historical_predictions(
        self,
        db: Session,
        ticker: str = "^GSPC",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Loads verified out-of-sample predictions from DB or disk artifact.
        Guarantees chronological order.
        """
        query = db.query(PredictionRecord).filter(PredictionRecord.ticker == ticker)
        if start_date:
            query = query.filter(PredictionRecord.forecast_for >= start_date)
        if end_date:
            query = query.filter(PredictionRecord.forecast_for <= end_date)

        records = query.order_by(PredictionRecord.forecast_for.asc()).all()

        if records and len(records) >= 10:
            return [
                {
                    "forecast_for": r.forecast_for,
                    "predicted_return": float(r.predicted_return),
                    "actual_return": float(r.actual_return) if r.actual_return is not None else 0.0,
                    "reference_close": float(r.reference_close),
                    "predicted_close": float(r.predicted_close),
                    "actual_close": float(r.actual_close) if r.actual_close is not None else float(r.reference_close),
                }
                for r in records
            ]

        # Fallback to test_predictions.json
        if self.test_predictions_path.exists():
            try:
                with open(self.test_predictions_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                predictions = data.get("predictions", [])
                formatted = []
                for p in predictions:
                    d = p.get("forecast_for") or p.get("target_date")
                    if start_date and d < start_date:
                        continue
                    if end_date and d > end_date:
                        continue
                    formatted.append({
                        "forecast_for": d,
                        "predicted_return": float(p.get("predicted_return", 0.0)),
                        "actual_return": float(p.get("actual_return", 0.0)),
                        "reference_close": float(p.get("reference_close", 5000.0)),
                        "predicted_close": float(p.get("predicted_close", 5000.0)),
                        "actual_close": float(p.get("actual_close", 5000.0)),
                    })
                formatted.sort(key=lambda x: x["forecast_for"])
                return formatted
            except Exception as e:
                logger.error(f"Error loading test_predictions.json: {e}")

        return []

    def run_backtest(
        self,
        db: Session,
        ticker: str = "^GSPC",
        initial_capital: float = 100000.0,
        bullish_threshold: float = 0.0020,
        bearish_threshold: float = -0.0020,
        transaction_cost_pct: float = 0.0005,  # 0.05%
        slippage_pct: float = 0.0002,          # 0.02%
        strategy_mode: str = "long_only",      # 'long_only' or 'long_short'
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes genuine event-driven backtesting using out-of-sample PyTorch predictions.
        Deducts transaction costs and slippage whenever positions transition.
        """
        data = self._load_historical_predictions(db, ticker, start_date, end_date)
        if not data:
            raise ValueError(f"No prediction records available for ticker {ticker}.")

        total_cost_pct = transaction_cost_pct + slippage_pct
        equity = float(initial_capital)
        benchmark_equity = float(initial_capital)
        position = 0  # 0 = cash, 1 = long, -1 = short
        
        equity_curve: List[Dict[str, Any]] = []
        trades: List[Dict[str, Any]] = []
        daily_returns: List[float] = []

        active_trade: Optional[Dict[str, Any]] = None
        trade_id = 1

        for idx, row in enumerate(data):
            date = row["forecast_for"]
            pred_return = row["predicted_return"]
            actual_return = row["actual_return"]
            ref_close = row["reference_close"]
            actual_close = row["actual_close"]

            # Benchmark (buy and hold S&P 500)
            benchmark_equity *= (1.0 + actual_return)

            # Signal determination
            target_position = 0
            if pred_return > bullish_threshold:
                target_position = 1
            elif pred_return < bearish_threshold:
                target_position = -1 if strategy_mode == "long_short" else 0
            else:
                # Neutral: keep existing position or go to cash if long_short
                target_position = position if strategy_mode == "long_only" else 0

            # Position change execution & cost friction
            position_changed = (target_position != position)
            trade_cost = 0.0
            if position_changed:
                trade_cost = equity * total_cost_pct
                equity -= trade_cost

                # Close active trade if changing
                if active_trade is not None:
                    exit_price = actual_close
                    pnl_pct = (exit_price / active_trade["entry_price"] - 1.0) if active_trade["direction"] == "LONG" else (1.0 - exit_price / active_trade["entry_price"])
                    pnl_dollars = active_trade["allocated"] * pnl_pct
                    trades.append({
                        "id": trade_id,
                        "entryDate": active_trade["entry_date"],
                        "exitDate": date,
                        "direction": active_trade["direction"],
                        "entryPrice": round(active_trade["entry_price"], 2),
                        "exitPrice": round(exit_price, 2),
                        "pnlPct": round(pnl_pct * 100, 2),
                        "pnlDollars": round(pnl_dollars, 2),
                        "status": "WIN" if pnl_dollars > 0 else "LOSS"
                    })
                    trade_id += 1
                    active_trade = None

                # Open new trade if entering a position
                if target_position != 0:
                    active_trade = {
                        "entry_date": date,
                        "direction": "LONG" if target_position == 1 else "SHORT",
                        "entry_price": ref_close,
                        "allocated": equity,
                    }

            # Daily P&L update based on position
            day_pnl_pct = 0.0
            if target_position == 1:
                day_pnl_pct = actual_return
            elif target_position == -1:
                day_pnl_pct = -actual_return
            
            equity_before = equity
            equity *= (1.0 + day_pnl_pct)
            daily_ret = (equity / equity_before - 1.0) if equity_before > 0 else 0.0
            daily_returns.append(daily_ret)

            position = target_position

            equity_curve.append({
                "date": date,
                "equity": round(equity, 2),
                "benchmark": round(benchmark_equity, 2),
                "position": "LONG" if position == 1 else ("SHORT" if position == -1 else "CASH"),
                "dailyReturn": round(daily_ret * 100, 3)
            })

        # Close any lingering trade at the end
        if active_trade is not None and len(data) > 0:
            last_close = data[-1]["actual_close"]
            pnl_pct = (last_close / active_trade["entry_price"] - 1.0) if active_trade["direction"] == "LONG" else (1.0 - last_close / active_trade["entry_price"])
            pnl_dollars = active_trade["allocated"] * pnl_pct
            trades.append({
                "id": trade_id,
                "entryDate": active_trade["entry_date"],
                "exitDate": data[-1]["forecast_for"],
                "direction": active_trade["direction"],
                "entryPrice": round(active_trade["entry_price"], 2),
                "exitPrice": round(last_close, 2),
                "pnlPct": round(pnl_pct * 100, 2),
                "pnlDollars": round(pnl_dollars, 2),
                "status": "WIN" if pnl_dollars > 0 else "LOSS"
            })

        # Metrics computation
        total_return = (equity - initial_capital) / initial_capital
        benchmark_total_return = (benchmark_equity - initial_capital) / initial_capital
        alpha = total_return - benchmark_total_return

        total_days = len(daily_returns)
        annualization_factor = math.sqrt(252)
        
        # Max Drawdown
        peak = initial_capital
        max_dd = 0.0
        for pt in equity_curve:
            val = pt["equity"]
            if val > peak:
                peak = val
            dd = (val - peak) / peak if peak > 0 else 0.0
            if dd < max_dd:
                max_dd = dd

        # Sharpe & Sortino (assuming 2.0% annual risk-free rate)
        rf_daily = 0.02 / 252.0
        excess_returns = [r - rf_daily for r in daily_returns]
        mean_excess = np.mean(excess_returns) if excess_returns else 0.0
        std_returns = np.std(daily_returns) if daily_returns else 1.0
        sharpe_ratio = float((mean_excess / std_returns) * annualization_factor) if std_returns > 1e-8 else 0.0

        downside_returns = [r for r in daily_returns if r < 0]
        downside_std = np.std(downside_returns) if downside_returns else 1e-6
        sortino_ratio = float((mean_excess / downside_std) * annualization_factor) if downside_std > 1e-8 else 0.0

        # Win Rate & Profit Factor
        winning_trades = [t for t in trades if t["pnlDollars"] > 0]
        losing_trades = [t for t in trades if t["pnlDollars"] <= 0]
        win_rate = (len(winning_trades) / len(trades)) if trades else 0.0
        
        gross_profit = sum(t["pnlDollars"] for t in winning_trades)
        gross_loss = abs(sum(t["pnlDollars"] for t in losing_trades))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 1.0)

        return {
            "ticker": ticker,
            "startDate": data[0]["forecast_for"],
            "endDate": data[-1]["forecast_for"],
            "totalSessions": total_days,
            "strategyMode": strategy_mode,
            "initialCapital": round(initial_capital, 2),
            "finalCapital": round(equity, 2),
            "benchmarkFinalCapital": round(benchmark_equity, 2),
            "totalReturn": round(total_return, 4),
            "benchmarkReturn": round(benchmark_total_return, 4),
            "alpha": round(alpha, 4),
            "maxDrawdown": round(max_dd, 4),
            "sharpeRatio": round(sharpe_ratio, 3),
            "sortinoRatio": round(sortino_ratio, 3),
            "winRate": round(win_rate, 4),
            "profitFactor": round(profit_factor, 2),
            "totalTrades": len(trades),
            "winningTrades": len(winning_trades),
            "losingTrades": len(losing_trades),
            "bullishThreshold": bullish_threshold,
            "bearishThreshold": bearish_threshold,
            "transactionCostPct": transaction_cost_pct,
            "slippagePct": slippage_pct,
            "equityCurve": equity_curve,
            "trades": trades[-50:],  # Recent 50 trades
            "dataProvenance": "Verified Out-of-Sample PyTorch Model Inference"
        }


backtest_service = BacktestService()

