# Stock Trend Forecaster

An end-to-end, full-stack machine learning application that forecasts next-trading-session returns for the S&P 500 Index (`^GSPC`) and recovers implied closing price levels and trend direction signals (**BULLISH**, **NEUTRAL**, **BEARISH**).

Built with **PyTorch**, **FastAPI**, and **React (Vite)**, the system features a leak-free machine learning pipeline, fixed-model walk-forward validation, dynamic artifact loading, dual role-based workspaces, and comprehensive automated test suites.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Dataset & Data Pipeline](#dataset--data-pipeline)
- [Model Architecture & Hyperparameters](#model-architecture--hyperparameters)
- [Verified Evaluation & Audit Results](#verified-evaluation--audit-results)
- [Role-Based Workspaces](#role-based-workspaces)
- [Repository Structure](#repository-structure)
- [Installation & Quickstart](#installation--quickstart)
- [API Reference](#api-reference)
- [Testing & Validation](#testing--validation)
- [Security & Architectural Notes](#security--architectural-notes)
- [License](#license)

---

## Overview

Stock Trend Forecaster delivers institutional-grade transparency for time-series equity forecasting:

1. **Target Formulation:** Predicts continuous next-session Close return:
   $$r_{t+1} = \frac{\text{Close}_{t+1} - \text{Close}_t}{\text{Close}_t}$$
   Implied next-day closing price is recovered deterministically via:
   $$\hat{P}_{t+1} = P_t \times (1 + \hat{r}_{t+1})$$
2. **Trend Signal Derivation:** Directional classification derived using a configurable threshold:
   - **BULLISH:** $\hat{r}_{t+1} > +0.15\%$
   - **BEARISH:** $\hat{r}_{t+1} < -0.15\%$
   - **NEUTRAL:** $-0.15\% \le \hat{r}_{t+1} \le +0.15\%$
3. **Rigorous Benchmarking:** Compared against the standard zero-return naive baseline ($\hat{r}_{t+1} = 0$) on the exact same held-out test observations.

---

## System Architecture

```
                  +----------------------------------------------+
                  |         Yahoo Finance Data Pipeline          |
                  |           ^GSPC Daily OHLCV (2000+)          |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |    Data Preprocessing & Split Isolation      |
                  |     - 60-Session Lookback (6,678 windows)     |
                  |     - 80% Train / 10% Val / 10% Test         |
                  |     - StandardScaler (fit on train ONLY)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |             PyTorch LSTM Model               |
                  |   2 Layers (64 hidden units, dropout 0.2)    |
                  |   Artifacts: model.pt, scalers, config.json  |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |              FastAPI REST API                |
                  |  - /api/market/*     - /api/forecast/*       |
                  |  - /api/model/*      - /api/evaluation/*     |
                  |  - SQLite Prediction History & Runs          |
                  +----------------------+-----------------------+
                                         |
                     +-------------------+-------------------+
                     |                                       |
                     v                                       v
      +-----------------------------+         +-----------------------------+
      |       User Workspace        |         |   Data Scientist Workspace  |
      |   - Next-Session Forecast   |         |   - Performance Diagnostics |
      |   - Prediction History Log  |         |   - Model Cards & Configs   |
      |   - Backtest Studio         |         |   - SQLite Experiments Lab  |
      +-----------------------------+         +-----------------------------+
```

---

## Dataset & Data Pipeline

| Property | Value | Description |
|:---|:---|:---|
| **Asset** | `^GSPC` | S&P 500 Index exclusively |
| **Source** | Yahoo Finance | Daily end-of-day observations |
| **History** | `2000-01-03` to `2026-10-16` | **6,738 valid rows**, 0 missing, 0 duplicate dates |
| **Input Features** | 6 raw OHLCV fields | `Open`, `High`, `Low`, `Close`, `Adj Close`, `Volume` |
| **Lookback Window** | 60 trading sessions | Exactly 60 sessions per input window |
| **Total Sequences** | 6,678 windows | Sliding window generated via concatenate-then-slice |
| **Train Split (80%)** | 5,342 samples | Spans `2000-03-29` to `2021-06-22` |
| **Validation Split (10%)** | 667 samples | Spans `2021-06-23` to `2024-02-15` |
| **Held-Out Test Split (10%)** | 669 samples | Spans `2024-02-16` to `2026-10-16` (668 evaluated) |
| **Scaling & Leakage** | `StandardScaler` | **Fit strictly on train split only**; zero future data leakage |

---

## Model Architecture & Hyperparameters

```
Input Tensor: (batch_size, 60, 6)
      │
┌─────▼─────────────────────────┐
│ LSTM Layer 1 (hidden = 64)     │
│ Dropout = 0.2                 │
├───────────────────────────────┤
│ LSTM Layer 2 (hidden = 64)     │
│ Dropout = 0.2                 │
├───────────────────────────────┤
│ Fully Connected (64 ──> 1)    │
└─────┬─────────────────────────┘
      │
Output: (batch_size, 1) continuous return scalar
```

- **Optimizer:** Adam ($\text{learning rate} = 0.001$)
- **Loss Function:** Mean Squared Error (MSE)
- **Batch Size:** 64
- **Regularization:** Gradient clipping ($\text{max\_norm} = 1.0$), Dropout ($0.2$)
- **Early Stopping:** Patience of 10 epochs on validation loss

---

## Verified Evaluation & Audit Results

All metrics independently recalculated from disk artifacts ([backend/artifacts/lstm/test_predictions.json](backend/artifacts/lstm/test_predictions.json)) across the 668 held-out test sessions:

| Model / Baseline | Test RMSE | Test MAE | Directional Accuracy | Evaluation Notes |
|:---|:---|:---|:---|:---|
| **Zero-Return Baseline ($\hat{r}=0$)** | `0.009680` | `0.006573` | N/A | Predicts zero return daily |
| **Always-Long Drift Baseline** | `0.009680` | `0.006573` | `55.39%` (370 / 668) | Market test window has a 55.39% positive day ratio |
| **PyTorch LSTM (`lstm-v1.0`)** | **`0.009655`** | **`0.006537`** | **`55.39%`** | **Beats zero-return baseline on RMSE & MAE** |
| **Fixed-Model Walk-Forward** | **`0.009655`** | **`0.006537`** | **`55.39%`** | Strictly past-only sequential testing |

---

## Role-Based Workspaces

The application features two distinct user workflows accessible via client-side role-based routing:

### 1. User Workspace (`/app/*`)
- **Dashboard (`/app/dashboard`):** Real-time S&P 500 status, latest daily close reference, and primary trend gauge.
- **Forecast Page (`/app/forecast/^GSPC`):** Next trading day forecast, predicted return, confidence bounds, and target date.
- **Predictions History (`/app/predictions`):** Chronological ledger tracking previous forecasts and actual realized outcomes.
- **Backtesting Studio (`/app/backtest`):** Moving-threshold strategy simulation tool (clearly disclosed as an illustrative heuristic simulator).
- **Model Card (`/app/model-card`):** High-level model explanation dynamically loaded from backend artifacts.

### 2. Data Scientist Workspace (`/scientist/*`)
- **Performance Diagnostics (`/scientist/performance`):** Real test split loss curves, RMSE/MAE error distribution, and walk-forward verification.
- **Dataset Explorer (`/scientist/dataset`):** Interactive inspection of split distributions, missing values, and data leakage safeguards.
- **Model Comparison (`/scientist/models`):** Head-to-head comparison against naive baselines and moving averages.
- **Experiments Lab (`/scientist/experiments`):** Real-time experiment tracking wired to SQLite `training_runs` table with asynchronous PyTorch training triggers.
- **Technical Model Card (`/scientist/model-card`):** Full architectural tensor dimensions, weights checksums, and artifact provenance.

---

## Repository Structure

```
Stock-Trend-Forecaster/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI routes (market, forecast, model, evaluation)
│   │   ├── core/                # Configuration and settings
│   │   ├── db/                  # SQLite models and session management
│   │   ├── ml/                  # PyTorch LSTM, train, evaluate, and walk-forward
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── services/            # Data pipeline, preprocessing, prediction services
│   ├── artifacts/lstm/          # Saved model.pt, scalers, config.json, metrics.json
│   ├── data/                    # Cached S&P 500 dataset (GSPC.csv) and SQLite DB
│   ├── tests/                   # Pytest test suite (17 tests)
│   ├── train_cli.py             # CLI training runner
│   ├── verify_audit.py          # Metric verification and baseline recalculation script
│   └── verify_pipeline.py       # Data split, sequence, and leakage verification script
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI controls and chart wrappers
│   │   ├── context/             # Auth and theme state management
│   │   ├── features/            # Feature pages (Dashboard, Forecast, Scientist, etc.)
│   │   ├── services/            # API integration layer (stockService.js)
│   │   └── styles/              # Design tokens and CSS
│   ├── dist/                    # Production bundle
│   └── package.json             # React 19, Vite, Recharts, Vitest
└── README.md                    # Root project documentation
```

---

## Installation & Quickstart

### Prerequisites
- Python 3.10+ (tested on Python 3.11)
- Node.js 18+ and npm

### 1. Setup Backend
```bash
# From workspace root
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run initial pipeline & model training (optional, artifacts already included)
python backend/train_cli.py

# Start FastAPI server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

FastAPI will be running on `http://127.0.0.1:8000`. Interactive documentation is available at `http://127.0.0.1:8000/api/docs`.

### 2. Setup Frontend
```bash
# In a new terminal
cd frontend
npm install

# Start Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Reference

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/health` | `GET` | Health check and server status |
| `/api/market/summary` | `GET` | Latest S&P 500 Close, day change, observation count |
| `/api/market/history` | `GET` | Historical OHLCV series for specified range (`1M`, `1Y`, `MAX`) |
| `/api/market/refresh` | `POST` | Fetches latest observations from Yahoo Finance |
| `/api/forecast/latest` | `GET` | Latest next-trading-session forecast, return, and implied price |
| `/api/forecast/generate` | `POST` | Generates a new forecast and logs to database |
| `/api/model/status` | `GET` | Training status, weights presence, scaler availability |
| `/api/model/config` | `GET` | Architecture specifications, lookback, and split parameters |
| `/api/model/metrics` | `GET` | Verified held-out test and walk-forward metrics |
| `/api/model/runs` | `GET` | Query recorded training experiments from SQLite |
| `/api/model/train` | `POST` | Trigger asynchronous PyTorch model retraining |
| `/api/evaluation/test` | `GET` | Date-aligned test predictions and loss values |
| `/api/evaluation/walk-forward` | `GET` | Date-aligned walk-forward sequential evaluation series |

---

## Testing & Validation

### Backend Pytest Suite
```bash
# Run 17 unit and integration tests
pytest backend/tests/ -v
```

### Frontend Vitest Suite
```bash
# Run 28 frontend component and logic tests
cd frontend
npm test
```

### Production Build
```bash
cd frontend
npm run build
```

---

## Security & Architectural Notes

1. **Authentication Boundary:** Role-based access control (User vs. Data Scientist) is enforced client-side for navigation. In production, backend mutating endpoints (`POST /api/model/train`, `POST /api/market/refresh`) should be protected with JWT/Bearer token authentication.
2. **Market Data Timeliness:** S&P 500 market data from Yahoo Finance reflects the latest available daily end-of-day Close, not streaming real-time tick quotes.
3. **Model Safety:** During retraining, prior model checkpoints are automatically preserved in `backend/artifacts/lstm/archive/`. If a training run fails or degrades validation loss, the previous known-good model is retained.

---

## License

This project is developed for educational and machine learning research purposes.
