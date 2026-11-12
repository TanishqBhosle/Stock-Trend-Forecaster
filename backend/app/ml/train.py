import copy
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from app.ml.lstm_model import LSTMRegressor, set_seed, get_device
from app.ml.loss import get_loss_criterion, DirectionalHuberLoss
from app.core.config import settings
from app.core.logging import logger


def train_lstm_model(
    X_train_scaled: np.ndarray,
    y_train_scaled: np.ndarray,
    X_val_scaled: np.ndarray,
    y_val_scaled: np.ndarray,
    hidden_size: int = settings.HIDDEN_SIZE,
    num_layers: int = settings.NUM_LAYERS,
    dropout: float = settings.DROPOUT,
    lr: float = settings.LEARNING_RATE,
    batch_size: int = settings.BATCH_SIZE,
    max_epochs: int = settings.MAX_EPOCHS,
    patience: int = settings.PATIENCE,
    seed: int = settings.RANDOM_SEED,
    loss_type: str = "directional_huber",
    loss_delta: float = 0.01,
    directional_penalty_weight: float = 0.5
) -> Tuple[LSTMRegressor, Dict[str, Any]]:
    """
    Trains PyTorch LSTM Regressor with early stopping on validation loss.
    Supports Directional Huber Loss with sign-penalty to prevent mean-convergence.
    """
    set_seed(seed)
    device = get_device()
    logger.info(f"Initiating LSTM training on {device} (Loss={loss_type}, Max epochs={max_epochs}, batch={batch_size}, lr={lr})")

    # Prepare PyTorch Tensors and DataLoaders
    train_dataset = TensorDataset(
        torch.from_numpy(X_train_scaled).float(),
        torch.from_numpy(y_train_scaled).float()
    )
    val_dataset = TensorDataset(
        torch.from_numpy(X_val_scaled).float(),
        torch.from_numpy(y_val_scaled).float()
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    input_size = X_train_scaled.shape[2]  # Features count
    model = LSTMRegressor(
        input_size=input_size,
        hidden_size=hidden_size,
        num_layers=num_layers,
        dropout=dropout,
        output_size=1
    ).to(device)

    criterion = get_loss_criterion(
        loss_type=loss_type,
        delta=loss_delta,
        penalty_weight=directional_penalty_weight
    )
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    best_val_loss = float("inf")
    best_epoch = 0
    best_model_weights = None
    epochs_no_improve = 0

    history: List[Dict[str, float]] = []

    for epoch in range(1, max_epochs + 1):
        # Training loop
        model.train()
        train_losses = []
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)

            optimizer.zero_grad()
            preds = model(batch_x)
            loss = criterion(preds, batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            train_losses.append(loss.item())

        avg_train_loss = float(np.mean(train_losses))

        # Validation loop
        model.eval()
        val_losses = []
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                preds = model(batch_x)
                loss = criterion(preds, batch_y)
                val_losses.append(loss.item())

        avg_val_loss = float(np.mean(val_losses))
        history.append({
            "epoch": epoch,
            "train_loss": avg_train_loss,
            "val_loss": avg_val_loss
        })

        if epoch % 5 == 0 or epoch == 1:
            logger.info(f"Epoch [{epoch:03d}/{max_epochs:03d}] - Train Loss: {avg_train_loss:.6f} - Val Loss: {avg_val_loss:.6f}")

        # Early stopping check
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            best_epoch = epoch
            best_model_weights = copy.deepcopy(model.state_dict())
            epochs_no_improve = 0
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                logger.info(f"Early stopping triggered at epoch {epoch}. Best epoch was {best_epoch} with val loss {best_val_loss:.6f}")
                break

    # Restore best weights
    if best_model_weights is not None:
        model.load_state_dict(best_model_weights)
        logger.info(f"Loaded best model weights from epoch {best_epoch}")

    training_metadata = {
        "best_epoch": best_epoch,
        "best_val_loss": best_val_loss,
        "total_epochs": epoch,
        "loss_type": loss_type,
        "history": history
    }

    return model, training_metadata
