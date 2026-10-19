# Stock Trend Forecaster — FastAPI Backend & PyTorch LSTM

A high-performance, real-time machine learning backend built with **FastAPI** and **PyTorch** for forecasting next trading session S&P 500 (`^GSPC`) returns and recovering implied close prices.

---

## 1. Prerequisites

- Python 3.10+ (tested on Python 3.11)
- Node.js 18+ and npm (for the frontend)
- Internet connection for initial Yahoo Finance data download

---

## 2. Environment Setup & Installation

### Step 1: Create Virtual Environment
From the workspace root or `backend/` directory:
```bash
python -m venv .venv
```

Activate the environment:
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- **Windows (CMD):**
  ```cmd
  .venv\Scripts\activate.bat
  ```
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

### Step 2: Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```

---

## 3. Data Download & Model Training

To download historical S&P 500 data from 2000 to the latest date, train the 2-layer stacked PyTorch LSTM, evaluate held-out test split (10%), execute walk-forward evaluation, and generate artifacts:

```bash
python backend/train_cli.py
```

Or start the backend and trigger training via the REST API:
```bash
curl -X POST http://localhost:8000/api/model/train
```

---

## 4. Running the Backend Server

Start the FastAPI application with Uvicorn:

```bash
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`
- OpenAPI JSON: `http://localhost:8000/api/openapi.json`

---

## 5. Connecting the Existing Frontend

1. Navigate to the `frontend/` directory.
2. In `frontend/.env`, set:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   VITE_USE_MOCKS=false
   ```
3. Start the Vite dev server:
   ```bash
   cd frontend
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser. The dashboard, stocks catalog, next-day forecast, model metrics, prediction history, and scientist performance pages will now display live data from the FastAPI backend and PyTorch model.

---

## 6. Architecture & Technical Specifications

| Parameter | Specification |
|-----------|---------------|
| Asset | S&P 500 Index (`^GSPC`) |
| Data Provider | Yahoo Finance (`yfinance`) |
| Historical Range | `2000-01-01` to Present |
| Input Features (6) | `Open`, `High`, `Low`, `Close`, `Adj Close`, `Volume` |
| Lookback Window | Exactly 60 trading sessions |
| Input Shape | `(batch_size, 60, 6)` |
| Output Shape | `(batch_size, 1)` |
| Target Variable | Next-session Close return: `Close[t] / Close[t-1] - 1` |
| Implied Close Formula | `predicted_next_close = latest_actual_close * (1 + predicted_next_return)` |
| Chronological Split | 80% Train, 10% Validation, 10% Held-Out Test |
| Model Architecture | 2-Layer Stacked LSTM (64 hidden units, dropout 0.2) |
| Loss Function | Mean Squared Error (MSE) |
| Optimizer | Adam (learning rate = 0.001) |
| Scaling | `StandardScaler` fitted strictly on training data only |
| Persistence | PyTorch weights, Joblib scalers, JSON configs, SQLite prediction history |

---

## 7. Metrics & Walk-Forward Methodology

### Evaluation Metrics
- **RMSE (Root Mean Squared Error):**
  $$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^N (y_i - \hat{y}_i)^2}$$
- **MAE (Mean Absolute Error):**
  $$\text{MAE} = \frac{1}{N}\sum_{i=1}^N |y_i - \hat{y}_i|$$
- **Directional Accuracy:**
  $$\text{Directional Accuracy} = \frac{\text{Correctly Predicted Directions}}{\text{Total Valid Predictions}} \times 100\%$$
  Direction matches if $\text{sign}(y_i) = \text{sign}(\hat{y}_i)$.

### Fixed-Model Walk-Forward Evaluation
Walk-forward evaluation sequentially advances the forecast origin one trading session at a time across the evaluation period. At each origin $t-1$, the preceding 60 trading days are fed into the trained LSTM to forecast session $t$'s return and implied price. No future observations are ever leaked.

---

## 8. REST API Endpoints

### Health & System Status
- `GET /api/health` — API service health.
- `GET /api/status` — Operational status, model availability, latest data date, freshness.

### Market Data
- `GET /api/market/summary` — Latest S&P 500 Close, day change, total observations, freshness.
- `GET /api/market/history?range=1Y` — Historical OHLCV rows (1M, 3M, 6M, 1Y, MAX).
- `POST /api/market/refresh` — Triggers on-demand Yahoo Finance download.

### Forecast
- `GET /api/forecast/latest` — Next-session forecast, predicted return, implied Close, trend signal.
- `POST /api/forecast/generate` — Generates next-session forecast and records it in prediction history.
- `GET /api/forecast/history` — Paginated prediction history with realized outcomes.

### Model Management
- `GET /api/model/status` — Model training status, weight existence, scaler status.
- `GET /api/model/config` — Hyperparameters, feature schema, and split configuration.
- `GET /api/model/metrics` — Held-out test and walk-forward performance metrics.
- `GET /api/model/runs` — Query all historical training experiment runs recorded in SQLite.
- `POST /api/model/train` — Initiates background training pipeline.

### Evaluation
- `GET /api/evaluation/test` — Test split evaluation metrics and date-aligned predictions.
- `GET /api/evaluation/walk-forward` — Walk-forward evaluation metrics and predictions.
- `POST /api/evaluation/walk-forward/run` — Re-runs walk-forward evaluation.
- `GET /api/evaluation/training-history` — Epoch-by-epoch training and validation loss progression.

### Predictions
- `GET /api/predictions` — Query saved prediction history.
- `GET /api/predictions/{ticker}` — Query prediction history for a specific ticker.

### Frontend Compatibility Routes
- `GET /api/v1/health`
- `GET /api/v1/stocks`
- `GET /api/v1/stocks/{ticker}`
- `GET /api/v1/stocks/{ticker}/ohlcv`
- `GET /api/v1/forecast/{ticker}`
- `GET /api/v1/performance`
- `GET /api/v1/predictions/{ticker}`

---

## 9. Running Automated Tests

Run the complete test suite with `pytest`:

```bash
pytest backend/tests/ -v
```

---

## 10. Independent Audit & Verification Scripts

The backend includes standalone audit scripts to independently verify data integrity, pipeline isolation, and performance metrics:

### Pipeline Integrity & Leakage Verification
```bash
python backend/verify_pipeline.py
```
- Validates all 6,738 rows in `backend/data/GSPC.csv`.
- Confirms 60-session lookback, 6,678 sequences, and exact chronological splits:
  - Train: 5,342 samples
  - Val: 667 samples
  - Test: 669 samples (668 evaluated)
- Proves `StandardScaler` mean and variance were computed strictly on training data with zero leakage.

### Metric Recalculation & Baseline Audit
```bash
python backend/verify_audit.py
```
- Recomputes RMSE, MAE, and Directional Accuracy directly from raw disk predictions in `backend/artifacts/lstm/test_predictions.json`.
- Benchmarks against the zero-return naive baseline on the exact same 668 held-out test observations.

---

## 11. Troubleshooting

- **"Model artifacts not found":** Run `python backend/train_cli.py` or `POST /api/model/train` to train the model and generate weights and scalers.
- **Yahoo Finance Rate Limits / Network Failures:** The data service automatically caches the cleaned dataset to `backend/data/GSPC.csv`. If Yahoo Finance experiences temporary issues, the service transparently serves the cached data.
- **Port Conflict (Port 8000 in use):** Run with `--port 8001` and update `VITE_API_BASE_URL=http://localhost:8001` in `frontend/.env`.
