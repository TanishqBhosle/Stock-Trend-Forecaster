# S&P 500 Stock Trend Forecaster

A deep learning pipeline that predicts the next trading day's S&P 500 closing price using a stacked LSTM neural network, then classifies the predicted movement as **BULLISH**, **NEUTRAL**, or **BEARISH**.

Built with PyTorch, trained on nearly a century of daily market data (1927--2026), and designed for deployment via a FastAPI backend and React frontend.

---

## Table of Contents

- [Overview](#overview)
- [Dataset](#dataset)
- [Features](#features)
- [Model Architecture](#model-architecture)
- [Pipeline](#pipeline)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Evaluation Metrics](#evaluation-metrics)
- [Key Design Decisions](#key-design-decisions)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

The project addresses two objectives:

1. **Regression** -- Predict the next trading day's closing price of the S&P 500 index.
2. **Classification** -- Derive a directional trend signal (BULLISH / NEUTRAL / BEARISH) from the predicted return using a configurable threshold.

The model is evaluated against a naive baseline (tomorrow's price equals today's close) to ensure it provides genuine predictive value rather than simply echoing the most recent price.

---

## Dataset

| Property | Value |
|----------|-------|
| Source | Yahoo Finance (`^GSPC`) |
| File | `GSPC.csv` |
| Rows | ~24,800 |
| Columns | Date, Open, High, Low, Close, Adj Close, Volume |
| Date Range | 1927-12-30 to 2026-09-25 |
| Missing Values | 0 |
| Duplicates | 0 |

**Note:** Approximately 5,500 rows (pre-1950s) contain zero volume because volume data was not recorded for early S&P 500 history. The price data for those rows is valid and is retained; Volume is excluded from the initial feature set.

---

## Features

All input features are **stationary** (returns and ratios), not raw prices. This prevents the scaler -- fit on training data where prices average around 500 -- from extrapolating when test-set prices exceed 7,000.

| Feature | Formula | Purpose |
|---------|---------|---------|
| `Daily_Return` | `Close.pct_change()` | Day-over-day return |
| `Price_Range_Pct` | `(High - Low) / Close` | Intraday volatility |
| `Open_Close_Pct` | `(Close - Open) / Open` | Intraday direction |
| `Close_MA7_Ratio` | `Close / MA_7 - 1` | Short-term mean reversion |
| `Close_MA20_Ratio` | `Close / MA_20 - 1` | Medium-term mean reversion |
| `Volatility_20` | `rolling(20).std(Daily_Return)` | 20-day realized volatility |
| `MA7_MA20_Cross` | `MA_7 / MA_20 - 1` | Trend strength |
| `Momentum_5` | `Close / Close_5d_ago - 1` | 5-day momentum |
| `Momentum_10` | `Close / Close_10d_ago - 1` | 10-day momentum |

**Target:** Next-day return = `(Close[t+1] - Close[t]) / Close[t]`

Predicted prices are recovered as: `predicted_price = Close[t] * (1 + predicted_return)`

---

## Model Architecture

```
Input (batch, 60, 9)
        |
  LSTM Layer 1    128 hidden units
        |         dropout 0.2
  LSTM Layer 2    128 hidden units
        |         dropout 0.2
  Linear Layer    128 --> 1
        |
  Predicted Return (scalar)
```

| Hyperparameter | Value |
|----------------|-------|
| Lookback window | 60 trading days |
| Hidden size | 128 |
| LSTM layers | 2 |
| Dropout | 0.2 |
| Optimizer | Adam (lr = 0.001) |
| Loss function | MSE |
| LR scheduler | ReduceLROnPlateau (factor 0.5, patience 5) |
| Early stopping | Patience 15 epochs on validation loss |
| Gradient clipping | Max norm 1.0 |
| Batch size | 64 |

---

## Pipeline

```
GSPC.csv
   |
   v
Load and Validate
   |  24,800 rows, 7 columns
   |  Missing = 0, Duplicates = 0, Invalid OHLC = 0
   v
Exploratory Data Analysis
   |  Price history, volume, distributions,
   |  outlier check, correlation heatmap
   v
Feature Engineering
   |  9 stationary features (returns and ratios)
   |  Target = next-day return
   v
Chronological Split (70 / 15 / 15)
   |  Train:  ~1928 -- ~1997
   |  Val:    ~1997 -- ~2012
   |  Test:   ~2012 -- 2026
   v
Preprocessing
   |  StandardScaler fit on training data ONLY
   |  Separate scaler for target returns
   v
60-Day Sequence Creation
   |  Concatenate-then-slice to avoid boundary leakage
   v
   +-------------------+
   |                   |
   v                   v
Naive Baseline      LSTM Training
   |                   |
   +--------+----------+
            |
            v
      Evaluation
      |  RMSE, MAE, MAPE
      |  Directional Accuracy
      v
   Trend Classification
      BULLISH / NEUTRAL / BEARISH
      |
      v
   Save Artifacts
      lstm_model.pt
      feature_scaler.pkl
      target_scaler.pkl
      config.json
      metrics.json
```

---

## Installation

### Google Colab (Recommended)

All required libraries (PyTorch, pandas, scikit-learn, matplotlib, seaborn) are pre-installed in Colab. No setup is needed.

1. Open [Google Colab](https://colab.research.google.com).
2. Upload `Stock_Trend_Forecaster.ipynb`.
3. Set the runtime to **GPU** (Runtime > Change runtime type > T4 GPU).
4. Run the first cell to upload `GSPC.csv`.
5. Execute all cells sequentially.

### Local Environment

```bash
# Clone the repository
git clone https://github.com/<your-username>/Stock-Trend-Forecaster.git
cd Stock-Trend-Forecaster

# Create a virtual environment
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install pandas numpy matplotlib seaborn scikit-learn torch joblib
```

---

## Usage

### Google Colab

Open `Stock_Trend_Forecaster.ipynb` and run all 42 code cells from top to bottom. The notebook handles everything: data loading, validation, EDA, feature engineering, training, evaluation, and artifact saving.

### Notebook Structure

| Section | Steps | Description |
|---------|-------|-------------|
| Data Loading and Validation | 2--9 | Load CSV, check missing values, duplicates, OHLC validity, volume |
| Exploratory Data Analysis | 10--14 | Price history, volume, distributions, outliers, correlation |
| Feature Engineering | 15--19 | 9 stationary features, next-day return target |
| Trend Labels | 20--21 | BULLISH / NEUTRAL / BEARISH distribution |
| Split and Scaling | 22--24 | 70/15/15 chronological split, StandardScaler (train-only fit) |
| Sequences | 25--26 | 60-day windows via concatenate-then-slice |
| Naive Baseline | 27 | Benchmark metrics on the same test samples |
| LSTM Model | 28 | Architecture definition |
| Training | 29--30 | Adam, LR scheduling, early stopping, loss curves |
| Evaluation | 31--35 | Metrics comparison, predictions plot, error distribution |
| Trend Classification | 36--38 | Predicted trends, confusion matrix, classification report |
| Save Artifacts | 39--40 | Model, scalers, config, metrics saved and downloadable |

---

## Project Structure

```
Stock-Trend-Forecaster/
|
|-- GSPC.csv                          # S&P 500 daily OHLCV dataset
|-- Stock_Trend_Forecaster.ipynb      # Complete Colab training notebook
|-- README.md                         # This file
|
|-- Docs/
|   |-- Research for Stock trend Forecastor Project.pdf
|
|-- models/                           # Created by training
|   |-- lstm_model.pt                 # PyTorch model weights
|   |-- feature_scaler.pkl            # StandardScaler (input features)
|   |-- target_scaler.pkl             # StandardScaler (target returns)
|   |-- config.json                   # Feature list, hyperparameters
|   |-- metrics.json                  # Evaluation results
```

---

## Evaluation Metrics

The LSTM is compared against a naive baseline on the **exact same test samples** to ensure a fair comparison.

| Metric | Description |
|--------|-------------|
| RMSE | Root Mean Squared Error (in price units) |
| MAE | Mean Absolute Error (in price units) |
| MAPE | Mean Absolute Percentage Error |
| Directional Accuracy | Percentage of days where up/down direction was predicted correctly |
| Trend Accuracy | Percentage of days where the BULLISH/NEUTRAL/BEARISH label matched |

**Naive baseline rule:** Tomorrow's predicted price = today's closing price.

---

## Key Design Decisions

### Why stationary features instead of raw prices?

A StandardScaler fit on training data (1927--1997, mean price around 500) would place test-set features (2012--2026, prices 3,000--7,700) at 6--9 standard deviations from the training mean. The LSTM would be forced to extrapolate into a region it never saw during training. Returns and ratios remain near-stationary across the full century.

### Why predict returns instead of prices?

Returns are stationary and bounded, making them a well-behaved target for regression. The final predicted price is recovered by multiplying the current close by `(1 + predicted_return)`.

### Why concatenate-then-slice for sequences?

Creating sequences on each split independently discards the first 60 samples of the validation and test sets and prevents validation sequences from looking back into the end of training data. Concatenating all scaled data before windowing, then slicing by target index, preserves all samples and mirrors real-world inference.

### Why no SMOTE or class balancing?

The LSTM is a regression model predicting continuous returns. Trend labels (BULLISH / NEUTRAL / BEARISH) are derived after prediction, not used as training targets. Class-balancing techniques like SMOTE apply to classification problems and are not applicable here.

### Why not use Volume?

Approximately 5,500 rows (pre-1950s) have zero volume. Including Volume would either require imputation for 22 percent of the training data or introduce a feature that is undefined for a large portion of the dataset. The initial model establishes a clean OHLC-based baseline; Volume can be added as a later experiment.

### Why not remove outliers?

The IQR method flags many "outliers" in price columns, but these reflect genuine long-term market growth from 17 (1928) to 7,700 (2026). Removing them would delete real data points.

---

## Roadmap

- [x] Data loading, validation, and EDA
- [x] Stationary feature engineering
- [x] Chronological train/val/test split with leakage-safe scaling
- [x] LSTM model training with early stopping
- [x] Naive baseline comparison
- [x] Trend classification (BULLISH / NEUTRAL / BEARISH)
- [x] Model artifact saving
- [ ] Walk-forward validation (expanding window retraining)
- [ ] Hyperparameter tuning (hidden size, layers, lookback, dropout)
- [ ] Volume feature experiment
- [ ] FastAPI backend for real-time inference
- [ ] React frontend dashboard

---

## License

This project is developed for academic and educational purposes.
