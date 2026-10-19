from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.evaluation_service import evaluation_service
from app.schemas.metrics import WalkForwardRunRequest
from app.core.logging import logger

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


@router.get("/test")
def get_test_evaluation():
    """Returns evaluation metrics and date-aligned predictions on the held-out test split."""
    try:
        results = evaluation_service.get_test_evaluation()
        return results
    except Exception as e:
        logger.error(f"Error retrieving test evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve test evaluation: {str(e)}")


@router.get("/walk-forward")
def get_walk_forward_evaluation():
    """Returns results of fixed-model walk-forward evaluation on the held-out period."""
    try:
        results = evaluation_service.get_walk_forward_results()
        return results
    except Exception as e:
        logger.error(f"Error retrieving walk-forward evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve walk-forward evaluation: {str(e)}")


@router.post("/walk-forward/run")
def run_walk_forward(req: WalkForwardRunRequest):
    """Executes a walk-forward evaluation pass using the trained LSTM model."""
    try:
        results = evaluation_service.run_walk_forward(
            step_size=req.stepSize,
            max_steps=req.maxSteps
        )
        return results
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing walk-forward evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Walk-forward evaluation failed: {str(e)}")


@router.get("/training-history")
def get_training_history():
    """Returns epoch-by-epoch training and validation loss progression."""
    try:
        return evaluation_service.get_training_history()
    except Exception as e:
        logger.error(f"Error retrieving training history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve training history: {str(e)}")
