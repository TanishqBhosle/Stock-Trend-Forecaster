import os
import random
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from app.core.config import settings
from app.core.logging import logger


def set_seed(seed: int = 42) -> None:
    """Sets random seeds for reproducibility across Python, NumPy, and PyTorch."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def get_device() -> torch.device:
    """Returns CUDA device if available, else CPU."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


class LSTMRegressor(nn.Module):
    """
    Genuine PyTorch Stacked LSTM Regression Model.
    Accepts (batch_size, lookback=60, input_size=6)
    Outputs (batch_size, 1) representing the predicted next-session return.
    """
    def __init__(
        self,
        input_size: int = 6,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        output_size: int = 1
    ):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.dropout_rate = dropout
        self.output_size = output_size

        # PyTorch applies dropout between LSTM layers when num_layers > 1
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            batch_first=True
        )

        self.linear = nn.Linear(hidden_size, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Args:
            x: Tensor of shape (batch_size, lookback, input_size)
        Returns:
            Tensor of shape (batch_size, 1)
        """
        # lstm_out shape: (batch_size, seq_len, hidden_size)
        lstm_out, _ = self.lstm(x)
        # Take the output of the final time step
        last_step_out = lstm_out[:, -1, :]
        out = self.linear(last_step_out)
        return out


def save_model_checkpoint(
    model: nn.Module,
    filepath: Path,
    metadata: Optional[dict] = None
) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "state_dict": model.state_dict(),
        "input_size": model.input_size,
        "hidden_size": model.hidden_size,
        "num_layers": model.num_layers,
        "dropout": model.dropout_rate,
        "output_size": model.output_size,
        "metadata": metadata or {}
    }
    torch.save(payload, filepath)
    logger.info(f"Saved PyTorch LSTM checkpoint to {filepath}")


def load_model_checkpoint(
    filepath: Path,
    device: Optional[torch.device] = None
) -> Tuple[LSTMRegressor, dict]:
    if not filepath.exists():
        raise FileNotFoundError(f"Model checkpoint not found at {filepath}")
    
    if device is None:
        device = get_device()
        
    checkpoint = torch.load(filepath, map_location=device)
    model = LSTMRegressor(
        input_size=checkpoint.get("input_size", settings.INPUT_SIZE),
        hidden_size=checkpoint.get("hidden_size", settings.HIDDEN_SIZE),
        num_layers=checkpoint.get("num_layers", settings.NUM_LAYERS),
        dropout=checkpoint.get("dropout", settings.DROPOUT),
        output_size=checkpoint.get("output_size", settings.OUTPUT_SIZE)
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()
    logger.info(f"Loaded PyTorch LSTM checkpoint from {filepath} onto {device}")
    return model, checkpoint.get("metadata", {})
