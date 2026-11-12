import torch
import torch.nn as nn
import torch.nn.functional as F


class DirectionalHuberLoss(nn.Module):
    """
    Directional Huber Loss with Sign Penalty.
    
    Formula:
        L = Huber(y_true, y_pred; delta) + lambda * ReLU(-sign(y_true) * y_pred)
        
    Purpose:
        Standard MSE causes financial forecasting models to converge to the historical mean drift (~ +0.05%).
        Directional Huber Loss uses Huber loss for outlier-robust magnitude regression, combined with an
        asymmetric penalty whenever the predicted return has the opposite sign of the realized return.
    """
    def __init__(self, delta: float = 0.01, penalty_weight: float = 0.5):
        super().__init__()
        self.delta = delta
        self.penalty_weight = penalty_weight

    def forward(self, y_pred: torch.Tensor, y_true: torch.Tensor) -> torch.Tensor:
        # Standard Huber (Smooth L1) loss for magnitude
        huber_loss = F.huber_loss(y_pred, y_true, delta=self.delta, reduction="mean")
        
        # Directional sign penalty:
        # When sign(y_true) and y_pred have opposite signs, -sign(y_true) * y_pred > 0
        # ReLU activates and penalizes wrong-direction bets
        sign_mismatch = -torch.sign(y_true) * y_pred
        directional_penalty = torch.mean(F.relu(sign_mismatch))
        
        return huber_loss + (self.penalty_weight * directional_penalty)


def get_loss_criterion(loss_type: str = "directional_huber", delta: float = 0.01, penalty_weight: float = 0.5):
    """Factory for selecting model training loss function."""
    if loss_type.lower() in ["directional_huber", "directional", "dir_huber"]:
        return DirectionalHuberLoss(delta=delta, penalty_weight=penalty_weight)
    elif loss_type.lower() == "huber":
        return nn.HuberLoss(delta=delta)
    elif loss_type.lower() == "mae" or loss_type.lower() == "l1":
        return nn.L1Loss()
    else:
        return nn.MSELoss()
