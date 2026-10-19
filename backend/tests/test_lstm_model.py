import torch
import pytest
from app.ml.lstm_model import (
    LSTMRegressor,
    save_model_checkpoint,
    load_model_checkpoint,
    set_seed
)


def test_lstm_forward_pass_shape():
    set_seed(42)
    batch_size = 16
    lookback = 60
    input_size = 6

    model = LSTMRegressor(
        input_size=input_size,
        hidden_size=128,
        num_layers=2,
        dropout=0.2,
        output_size=1
    )
    model.eval()

    dummy_input = torch.randn(batch_size, lookback, input_size)
    with torch.no_grad():
        out = model(dummy_input)

    assert out.shape == (batch_size, 1)
    assert not torch.isnan(out).any()


def test_lstm_checkpoint_save_and_load(tmp_path):
    set_seed(42)
    model = LSTMRegressor(input_size=6, hidden_size=64, num_layers=2, dropout=0.1, output_size=1)
    model_path = tmp_path / "test_model.pt"

    metadata = {"version": "test-v1", "test_val": 123}
    save_model_checkpoint(model, model_path, metadata=metadata)
    assert model_path.exists()

    loaded_model, loaded_meta = load_model_checkpoint(model_path, device=torch.device("cpu"))
    assert loaded_meta["version"] == "test-v1"

    # Compare predictions
    model.eval()
    dummy_x = torch.randn(4, 60, 6)
    with torch.no_grad():
        orig_out = model(dummy_x)
        loaded_out = loaded_model(dummy_x)

    assert torch.allclose(orig_out, loaded_out, atol=1e-6)
