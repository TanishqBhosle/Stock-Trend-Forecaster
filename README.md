# ArthNex: Stock Trend Forecaster

An institutional-grade financial time-series forecasting and quantitative decision-support system. The platform forecasts next-trading-session returns for the S&P 500 Index (`^GSPC`), reconstructs implied closing price levels, categorizes directional market trend signals (Bullish, Neutral, Bearish), and validates performance via an interactive execution backtesting engine.

Built with **PyTorch**, **FastAPI**, and **React 18 (Vite)**, the system features a leak-free machine learning pipeline, fixed-model walk-forward validation, dynamic artifact loading, dual role-based workspaces, and comprehensive automated test suites.

---

## Table of Contents

- [Overview](#overview)
- [Mathematical Formulation](#mathematical-formulation)
- [System Architecture](#system-architecture)
- [Dataset Specifications & Partitioning](#dataset-specifications--partitioning)
- [Model Architecture & Hyperparameters](#model-architecture--hyperparameters)
- [Empirical Validation & Benchmark Results](#empirical-validation--benchmark-results)
- [Role-Based Workspaces](#role-based-workspaces)
- [Repository Structure](#repository-structure)
- [Installation & Quickstart](#installation--quickstart)
- [API Reference](#api-reference)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Regulatory Boundaries & Financial Disclaimer](#regulatory-boundaries--financial-disclaimer)
- [License](#license)

---

## Overview

Predicting equity index movements requires strict isolation between past observations and future targets. Standard cross-validation and random splitting introduce lookahead bias, inflating backtest metrics that collapse in live market conditions.

ArthNex enforces quantitative rigor across the full engineering lifecycle:

1. **Chronological Time-Series Partitioning:** Enforces an 80/10/10 temporal split without random shuffling.
2. **Leak-Free Preprocessing:** Standard scaling parameters are fitted exclusively on the training partition and applied out-of-sample to validation and test partitions.
3. **Multivariate Sequence Memory:** A 60-day lookback window across 6 Open-High-Low-Close-Volume (OHLCV) channels captures temporal momentum patterns.
4. **Execution Backtesting with Frictions:** Simulates transaction costs (5 basis points per trade), slippage, dynamic cash allocations, and threshold-based trigger rules.
5. **Dual-Persona Interface:** Delivers an institutional trading terminal for market practitioners alongside an audit-ready experimentation lab for quantitative researchers.

---

## Mathematical Formulation

### 1. Target Definition
The forecasting objective is formulated as supervised financial regression on the continuous single-step daily return:

$$r_{t+1} = \frac{\text{Close}_{t+1} - \text{Close}_t}{\text{Close}_t}$$

### 2. Price Level Recovery
Given the latest observed closing price $P_t$ and the neural network prediction $\hat{r}_{t+1}$, the implied closing price level is deterministically recovered via:

$$\hat{P}_{t+1} = P_t \times (1 + \hat{r}_{t+1})$$

### 3. Directional Trend Signal Derivation
To prevent excessive portfolio churn from low-conviction market noise, directional signals are categorized using calibrated conviction thresholds:

- **BULLISH:** $\hat{r}_{t+1} > +0.051\%$
- **BEARISH:** $\hat{r}_{t+1} < -0.049\%$
- **NEUTRAL:** $-0.049\% \le \hat{r}_{t+1} \le +0.051\%$

---

## System Architecture

```
                  +----------------------------------------------+
                  |         Yahoo Finance Data Pipeline          |
                  |           ^GSPC Daily OHLCV (2000-2026)      |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |    Data Preprocessing & Split Isolation      |
                  |     - 60-Session Lookback (6,704 windows)    |
                  |     - 80% Train / 10% Val / 10% Test         |
                  |     - StandardScaler (fit on train ONLY)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |             PyTorch LSTM Model               |
                  |   2 Layers (64 hidden units, dropout 0.2)    |
                  |   Artifacts: model.pt, scalers, metrics.json |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |              FastAPI REST API                |
                  |  - /api/market/*     - /api/forecast/*       |
                  |  - /api/model/*      - /api/backtest/*       |
                  |  - High-Throughput Sub-50ms Forward Passes   |
                  +----------------------+-----------------------+
                                         |
                     +-------------------+-------------------+
                     |                                       |
                     v                                       v
      +-----------------------------+         +-----------------------------+
      |       User Workspace        |         |   Data Scientist Workspace  |
      |   - Financial Dashboard     |         |   - Performance Diagnostics |
      |   - Next-Session Forecast   |         |   - Model Cards & Lineage   |
      |   - Backtesting Studio      |         |   - Walk-Forward Validation |
      |   - Watchlist & Portfolio   |         |   - Training Experiments    |
      +-----------------------------+         +-----------------------------+
```

---

## Dataset Specifications & Partitioning

The primary dataset comprises continuous daily trading sessions for the S&P 500 Index (`^GSPC`) sourced from Yahoo Finance.

| Property | Specification | Details |
|:---|:---|:---|
| **Underlying Instrument** | `^GSPC` | S&P 500 Benchmark Index |
| **Observation Frequency** | Daily (End-of-Day Close) | Excludes non-trading holidays and weekends |
| **Historical Range** | `2000-01-03` to `2026-11-23` | **6,764 validated sessions** |
| **Input Dimensions** | 6 OHLCV channels | Open, High, Low, Close, Adjusted Close, Volume |
| **Lookback Sequence** | 60 trading sessions | Exactly 60 sessions per temporal input matrix |
| **Total Sequences** | 6,704 sliding windows | Input tensor dimensions: `(N, 60, 6)` |
| **Train Partition (80%)** | 5,342 samples | Spans `2000-03-29` to `2021-06-22` (~21 years) |
| **Validation Partition (10%)** | 668 samples | Spans `2021-06-23` to `2024-02-16` (~2.7 years) |
| **Held-Out Test Partition (10%)** | 668 samples | Spans `2024-02-20` to `2026-10-16` (~2.7 years) |
| **Recent November Data** | 16 sessions | Spans `2026-11-02` to `2026-11-23` |
| **Normalization Protocol** | `StandardScaler` | Mean and variance computed on Train split only |

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

- **Architecture:** Stacked 2-Layer Recurrent Neural Network with Long Short-Term Memory cells
- **Hidden Layer Units:** 64 units per recurrent layer
- **Dropout Regularization:** 0.2 applied after recurrent layers
- **Optimization Algorithm:** Adam ($\beta_1 = 0.9, \beta_2 = 0.999$, learning rate $= 0.001$)
- **Objective Loss Function:** Mean Squared Error (MSE)
- **Batch Size:** 64 samples per gradient update
- **Gradient Clipping:** Maximum norm threshold $= 1.0$
- **Early Stopping:** Patience $= 10$ epochs monitoring validation loss convergence

---

## Empirical Validation & Benchmark Results

### 1. Out-of-Sample Performance Comparison
To prove statistical validity, the model is benchmarked against the standard Naive Persistence Baseline ($\hat{r}_{t+1} = 0$, predicting zero change from the prior session) across 668 sequential out-of-sample trading sessions:

| Model / Baseline | Test RMSE | Test MAE | Directional Accuracy | Evaluation Notes |
|:---|:---:|:---:|:---:|:---|
| **Naive Persistence Baseline** | `0.009680` | `0.006570` | `50.00%` | Baseline random walk assumption |
| **Always-Long Drift Baseline** | `0.009680` | `0.006570` | `55.39%` | Unconditional historical market positive ratio |
| **PyTorch LSTM (`lstm-v1.0`)** | **`0.009664`** | **`0.006551`** | **`55.39%`** | **Surpasses naive baseline on RMSE and MAE** |
| **Fixed-Model Walk-Forward** | **`0.009664`** | **`0.006551`** | **`55.39%`** | Day-by-day 1-step operational testing |

### 2. Execution Backtest Metrics (Held-Out Test Window)
Evaluated with dynamic conviction thresholds ($\pm 0.051\%$) and realistic 5 basis points ($0.05\%$) transaction costs:

- **Cumulative Strategy Return:** **+35.89%**
- **Win Rate:** **82.35%** (14 winning sessions out of 17 active executions)
- **Maximum Drawdown:** **-17.25%**
- **Benchmark Exposure Management:** Successfully filtered market noise and held 100% cash during sharp multi-day declines.

---

## Role-Based Workspaces

The platform provides two dedicated operational views via client-side routing:

### 1. User & Investor Workspace (`/app/*`)
- **Dashboard (`/app/dashboard`):** Real-time S&P 500 status, instrument selection strip, sector heatmap widget, macro intelligence news stream, and verified active model beacons.
- **Forecast Page (`/app/forecast/:ticker`):** Next-trading-session forecast cone, implied close value, conviction threshold breakdown, and limitations summary.
- **Backtesting Studio (`/app/backtest`):** Interactive capital simulation tool with adjustable trigger thresholds, transaction fees, and tear-sheet performance cards.
- **Predictions Ledger (`/app/predictions`):** Chronological historical record comparing model predictions against realized market outcomes.
- **Watchlist & Portfolio (`/app/watchlist`, `/app/portfolio`):** Personal asset monitoring and simulated holdings tracker.

### 2. Quantitative Data Scientist Workspace (`/scientist/*`)
- **Performance Diagnostics (`/scientist/performance`):** Real-time test split loss curves, error residuals, and walk-forward verification charts.
- **Dataset Inspector (`/scientist/dataset`):** Interactive inspection of temporal split partitions, missing value audit, and scaling isolation verifications.
- **Model Comparison Lab (`/scientist/models`):** Multi-model evaluation comparing neural architectures against statistical baselines.
- **Experiments Registry (`/scientist/experiments`):** Training run history wired to SQLite `training_runs` table with asynchronous execution tracking.
- **Technical Model Card (`/scientist/model-card`):** Full architectural tensor dimensions, weights checksums, and artifact provenance.

---

## Repository Structure

```
Stock-Trend-Forecaster/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # REST endpoints (market, forecast, backtest, model)
│   │   ├── core/                # Configuration, CORS, and structured logging
│   │   ├── db/                  # SQLAlchemy models and SQLite session bindings
│   │   ├── ml/                  # PyTorch LSTM, train loop, evaluation, walk-forward
│   │   ├── schemas/             # Pydantic data validation schemas
│   │   ├── services/            # Data pipeline, preprocessing, forecast, backtest
│   │   └── utils/               # Statistical metrics, dates, and market math
│   ├── artifacts/lstm/          # Deployed model.pt, scalers, config.json, metrics.json
│   ├── data/                    # Cached S&P 500 dataset (GSPC.csv) and forecaster.db
│   ├── tests/                   # 59 automated backend pytest test files
│   └── train_cli.py             # CLI pipeline for data refresh and model retraining
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI cards, tables, charts, navigation
│   │   ├── context/             # ThemeContext (Warm Linen / Dark Slate) & Auth
│   │   ├── features/            # Feature views (Dashboard, Forecast, Backtest, etc.)
│   │   ├── services/            # Client API integration layer (stockService.js)
│   │   └── styles/              # Design tokens (tokens.css) and utility classes
│   ├── dist/                    # Optimized production bundle
│   └── package.json             # React 18, Vite, Framer Motion, Recharts, Vitest
├── Docs/                        # Engineering logbooks and technical audit reports
└── README.md                    # Core project documentation
```

---

## Installation & Quickstart

### Prerequisites
- Python 3.10+ (tested on Python 3.11 and 3.12)
- Node.js 18+ and npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/TanishqBhosle/Stock-Trend-Forecaster.git
cd Stock-Trend-Forecaster
```

### 2. Configure Backend Service
```bash
# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux / macOS:
source .venv/bin/activate

# Install required dependencies
pip install -r backend/requirements.txt

# Start FastAPI application server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
The backend API initializes on `http://127.0.0.1:8000`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/api/docs`.

### 3. Configure Frontend Application
```bash
# Open a secondary terminal
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your web browser.

---

## API Reference

| Endpoint | HTTP Method | Description |
|:---|:---:|:---|
| `/api/health` | `GET` | Health check endpoint and service status |
| `/api/market/summary` | `GET` | Latest S&P 500 session close, daily change, and data count |
| `/api/market/history` | `GET` | Historical OHLCV series filtered by range (`1M`, `3M`, `1Y`, `MAX`) |
| `/api/market/refresh` | `POST` | Fetches on-demand market updates from Yahoo Finance |
| `/api/forecast/latest` | `GET` | Retrieves active next-session forecast and implied close price |
| `/api/forecast/generate` | `POST` | Generates a new forecast inference and persists to database |
| `/api/backtest/run` | `POST` | Executes simulated strategy backtest with custom thresholds and fees |
| `/api/model/status` | `GET` | Status check for model weights, feature scalers, and metadata |
| `/api/model/config` | `GET` | Architecture specifications, lookback window, and hyperparameters |
| `/api/model/metrics` | `GET` | Out-of-sample RMSE, MAE, and directional accuracy records |
| `/api/model/runs` | `GET` | Query past training experiment logs and validation loss curves |
| `/api/model/train` | `POST` | Triggers asynchronous background model retraining |
| `/api/evaluation/test` | `GET` | Aligned test split prediction arrays for performance diagnostics |
| `/api/evaluation/walk-forward` | `GET` | Sequential 1-step walk-forward evaluation records |

---

## Testing & Quality Assurance

The codebase maintains a dual test suite covering data invariants, numerical stability, leakage prevention, and API contracts:

### Backend Testing (59 Pytest Tests)
```bash
# Run backend test suite
python -m pytest backend/tests/ -v
```
Test suite includes:
- **Preprocessing Isolation:** Verifies scalers are fit strictly on training partitions (`test_preprocessing.py`).
- **Walk-Forward Validation:** Verifies sequential date alignment and absence of future data peeking (`test_walk_forward.py`).
- **Recovery & Concurrency:** Confirms preservation of last-known-good weights under simulated failures (`test_concurrency_and_recovery.py`).
- **Production Scale & Rate Limits:** Validates high-concurrency request resilience (`test_production_scale.py`).

### Frontend Testing (32 Vitest Tests)
```bash
cd frontend
npm test
```
Test suite includes:
- Signal categorization thresholds and directional sign classifications (`signals.test.js`).
- Mock dataset integrity and multi-ticker data structures (`mockData.test.js`).
- Fault-tolerant API fallback handling during network interruptions (`productionScale.test.js`).

### Production Build Verification
```bash
cd frontend
npm run build
```
Generates minified, production-ready bundles with clean Rollup chunking in sub-second build times.

---

## Regulatory Boundaries & Financial Disclaimer

1. **Educational & Decision-Support System:** ArthNex is designed strictly as an engineering research prototype and quantitative decision-support tool. It does not provide personal financial advisory services, brokerage connectivity, or guaranteed trading signals.
2. **Market Risk Acknowledgement:** Financial time series exhibit extreme non-stationarity, stochastic noise, and systemic regime shifts. Past statistical performance, out-of-sample test results, and backtested metrics do not guarantee future profitability.
3. **Data Provenance:** Market data reflects daily closing prices from Yahoo Finance. Model outputs must be evaluated alongside macroeconomic context and independent risk management protocols.

---

## License

This project is licensed for educational and academic research purposes.
