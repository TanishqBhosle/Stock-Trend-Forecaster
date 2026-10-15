# ArthNex Stock Trend Forecaster — Mocks & Backend Integration Guide

This document records the completed frontend implementation, identifies active mock boundaries, details expected API response schemas, and outlines the step-by-step procedure for connecting a real FastAPI backend and PyTorch model service in the future.

---

## 1. Summary of Completed Frontend Architecture

The ArthNex frontend is a self-contained, client-only React + Vite application adhering to the warm editorial financial-research design system (Fraunces serif display, DM Sans interface, JetBrains Mono data typography, terracotta brand accents, and slate/amber/teal indicators).

### Core Features Implemented:
1. **Public Landing Experience (`/`)**:
   - Hero section with interactive 6-month historical chart and next-day forecast preview defaulted to the primary asset (`^GSPC`).
   - S&P 500 index movements, 5-step methodological workflow, model comparison preview, and research overview.
   - Distinct "Demo Preview" labels on all illustrative forecasts with clear financial disclaimers.
2. **Auth & Onboarding Flow (`/login`, `/signup`, `/forgot-password`, `/onboarding`)**:
   - Client-side validation with `react-hook-form` + `zod`.
   - Explicit "Demo Session" notice (no real credentials transmitted or stored).
   - Workspace selection onboarding directing users to Investor (`/app/dashboard`) or Data Scientist (`/scientist/performance`).
   - Accessible user menu in `TopNav` supporting instant workspace switching, profile inspection, and session reset.
3. **Investor Workspace (`/app/*`)**:
   - **Dashboard (`/app/dashboard`)**: S&P 500 (`^GSPC`) primary model asset pinned with status badges, price movement, next-day forecast summary, trend signal, recent prediction log, and model specification summary.
   - **Stocks Catalog (`/app/stocks`)**: Instrument type filter (`ALL`, `CORE INDEX`, `EQUITIES`), search bar, and clear scope callout differentiating the primary model asset from illustrative equities.
   - **Stock Detail (`/app/stocks/:ticker`)**: Interactive candlestick/area chart, selectable time ranges (1M, 3M, 6M, 1Y, MAX), volume charts, forecast overlay with observed vs forecast legend, and historical volume notes (e.g. pre-1950s zero-volume recording for `^GSPC`).
   - **Forecast (`/app/forecast/:ticker`)**: Documented mathematical threshold rules (Bullish > +0.5%, Bearish < -0.5%, Neutral [-0.5%, +0.5%]), price recovery formula, model hyperparameter metadata grid, and explicit instrument scope.
   - **Watchlist (`/app/watchlist`)**: Client-side `localStorage` persistence, add/remove actions, filter/search, and clear local state notice.
   - **Portfolio (`/app/portfolio`)**: Multi-asset comparison with `^GSPC` baseline. Explains single-asset architecture scope without fabricating false portfolio returns or correlation matrices.
   - **Prediction History (`/app/predictions`)**: Filterable, sortable prediction log comparing forecasts with realized outcomes.
   - **Backtesting (`/app/backtest`)**: Input parameter validation (dates, starting capital, threshold levels, transaction costs), deterministic simulation preview, and honest illustrative demo labeling.
   - **Model Card (`/app/model-card`)**: Verified architecture details, intended educational use, limitations, and missing artifact notices.
   - **Settings (`/app/settings`)**: Theme switcher (persisted via `stf-theme`), notification simulation preferences (`stf-notification-prefs`), default ticker selection, and a confirmation modal for resetting demo data.
4. **Data Scientist Workspace (`/scientist/*`)**:
   - **Performance (`/scientist/performance`)**: Enforced data honesty. Displays "Real Evaluation Metrics Currently Unavailable" with required pipeline steps checklist, accompanied by an interactive `[Preview Demo Charts]` toggle for visual verification.
   - **Model Comparison & Registry (`/scientist/models`)**: Defines benchmark models (Stacked LSTM, Naive Baseline, Linear Regression), held-out evaluation window (~2012–2026), metric definitions (RMSE, MAE, Directional Accuracy), and a verified model artifact file registry table.
   - **Experiments (`/scientist/experiments` & `/:id`)**: Searchable, sortable experiment logs with hyperparameter comparisons and clear demo provenance badges.
   - **Dataset Inspector (`/scientist/dataset`)**: Comprehensive OHLCV schema metadata, 9 stationary feature definitions, target formulas, and volume caveat documentation.
   - **Technical Model Card (`/scientist/model-card`)**: Full hyperparameter specification, chronological 70/15/15 split details, and preprocessing pipeline steps.

---

## 2. Currently Mocked Boundaries & Provenance

| Component / Feature | Active Data Source | Provenance Label | Real Backend Target |
|---------------------|--------------------|-------------------|---------------------|
| Primary Asset (^GSPC) | `src/mocks/stocks.js` | Core Model Asset | Yahoo Finance / Market Data API |
| Illustrative Equities (10) | `src/mocks/stocks.js` | Demo Equities | Market Data Provider / Database |
| Historical Prices (OHLCV) | `src/mocks/ohlcv.js` | Deterministic Walk | `GET /api/v1/stocks/:ticker/ohlcv` |
| Next-Day Forecasts | `src/mocks/forecasts.js` | Simulated Demo | `GET /api/v1/forecast/:ticker` |
| Evaluation Metrics | `src/mocks/model.js` | Pending / Illustrative | `GET /api/v1/performance` (`metrics.json`) |
| Prediction History | `src/mocks/predictions.js` | Simulated Log | `GET /api/v1/predictions/:ticker` |
| Strategy Backtesting | `stockService.js::runBacktest` | Simulated Backtest | `POST /api/v1/backtest` |
| Experiments Tracking | `src/mocks/experiments.js` | Illustrative Log | MLflow / Weights & Biases / API |
| Authentication & Session | `src/hooks/useAuth.jsx` | Local Demo Session | JWT / OAuth2 Cookie Auth |
| Watchlist & Preferences | `localStorage` | Client Storage | User DB (`POST /api/v1/watchlist`) |

---

## 3. Verified Data & Training Pipeline Specifications

The following facts are verified against the repository configuration and `README.md` and are strictly reflected throughout the UI:
- **Primary Asset**: S&P 500 index (`^GSPC`) historical daily prices.
- **Data Range**: ~24,800 daily records (1927-12-30 to 2026-09-25).
- **Zero-Volume Pre-1950s**: Approximately 5,500 trading days prior to 1950 have recorded volume of 0. Volume is therefore intentionally excluded from the initial feature set.
- **Engineered Stationary Features (9)**:
  1. `Daily_Return`: `Close.pct_change()`
  2. `Price_Range_Pct`: `(High - Low) / Close`
  3. `Open_Close_Pct`: `(Close - Open) / Open`
  4. `Close_MA7_Ratio`: `Close / MA_7 - 1`
  5. `Close_MA20_Ratio`: `Close / MA_20 - 1`
  6. `Volatility_20`: `rolling(20).std(Daily_Return)`
  7. `MA7_MA20_Cross`: `MA_7 / MA_20 - 1`
  8. `Momentum_5`: `Close / Close_5d_ago - 1`
  9. `Momentum_10`: `Close / Close_10d_ago - 1`
- **Target Variable**: Next-day stationary return `(Close[t+1] - Close[t]) / Close[t]`.
- **Price Recovery Formula**: `predicted_price = Close[t] * (1 + predicted_return)`.
- **Classification Thresholds**:
  - `Bullish`: `predicted_return > +0.005` (+0.5%)
  - `Neutral`: `-0.005 <= predicted_return <= +0.005` (inclusive)
  - `Bearish`: `predicted_return < -0.005` (-0.5%)
- **Model Architecture**:
  - 2-layer Stacked LSTM
  - Hidden units: 128
  - Dropout: 0.2
  - Input sequence length (lookback): 60 trading days
  - Input shape: `(batch_size, 60, 9)`
  - Output shape: `(batch_size, 1)`
- **Data Splitting**: Chronological 70% train (~1928–1997), 15% validation (~1997–2012), 15% test (~2012–2026). No shuffling to prevent lookahead data leakage.
- **Normalization**: `StandardScaler` fitted strictly on training data features and targets independently.

---

## 4. Expected Future API Response Contracts

When the FastAPI service is built, it should satisfy these JSON schemas to seamlessly connect with `src/services/stockService.js`:

### 4.1 Health & Model Status
`GET /api/v1/health`
```json
{
  "status": "ok",
  "mocks": false,
  "modelLoaded": true,
  "modelVersion": "lstm-v0.1",
  "activeAsset": "^GSPC",
  "latestMarketDate": "2026-10-14"
}
```

### 4.2 Single Stock / Instrument
`GET /api/v1/stocks/:ticker`
```json
{
  "ticker": "^GSPC",
  "name": "S&P 500 Index",
  "exchange": "INDEX",
  "currency": "USD",
  "isPrimaryModelAsset": true,
  "currentPrice": 5842.47,
  "change": 22.18,
  "changePct": 0.0038,
  "latestSignal": "BULLISH",
  "predictedReturn": 0.0078,
  "marketStatus": "CLOSED",
  "lastUpdated": "2026-10-14T20:00:00Z"
}
```

### 4.3 Historical OHLCV Series
`GET /api/v1/stocks/:ticker/ohlcv?range=1Y`
```json
{
  "ticker": "^GSPC",
  "range": "1Y",
  "data": [
    {
      "date": "2026-10-12",
      "open": 5820.10,
      "high": 5855.40,
      "low": 5815.00,
      "close": 5842.47,
      "adjClose": 5842.47,
      "volume": 3840000000
    }
  ]
}
```

### 4.4 Next-Day Forecast Result
`GET /api/v1/forecast/:ticker`
```json
{
  "ticker": "^GSPC",
  "asOfDate": "2026-10-14",
  "forecastFor": "2026-10-15",
  "observedClose": 5842.47,
  "predictedReturn": 0.0078,
  "predictedClose": 5888.04,
  "expectedMovement": "Up +45.57 pts",
  "trendClassification": "BULLISH",
  "confidenceScore": null,
  "modelVersion": "lstm-v0.1",
  "lookbackDays": 60,
  "featureCount": 9,
  "disclaimer": "Educational research estimate. Not financial advice."
}
```

### 4.5 Model Evaluation Metrics
`GET /api/v1/performance`
```json
{
  "available": true,
  "evaluatedOn": "2026-10-14",
  "testDateRange": "2012-01-03 to 2026-09-25",
  "testSampleCount": 3720,
  "metrics": {
    "lstm": {
      "rmse": 42.18,
      "mae": 31.55,
      "mape": 0.0062,
      "directionalAccuracy": 0.538
    },
    "naiveBaseline": {
      "rmse": 45.92,
      "mae": 34.21,
      "mape": 0.0068,
      "directionalAccuracy": 0.491
    },
    "linearBaseline": {
      "rmse": 47.34,
      "mae": 35.87,
      "mape": 0.0071,
      "directionalAccuracy": 0.483
    }
  }
}
```

### 4.6 Strategy Backtest Simulation
`POST /api/v1/backtest`
**Request Payload:**
```json
{
  "ticker": "^GSPC",
  "startDate": "2024-01-01",
  "endDate": "2026-09-25",
  "initialCapital": 100000,
  "bullishThreshold": 0.005,
  "bearishThreshold": -0.005,
  "transactionCostPct": 0.001
}
```
**Response:**
```json
{
  "ticker": "^GSPC",
  "startDate": "2024-01-01",
  "endDate": "2026-09-25",
  "initialCapital": 100000,
  "finalCapital": 118420.50,
  "totalReturn": 0.1842,
  "maxDrawdown": -0.0820,
  "sharpeRatio": 1.14,
  "winRate": 0.552,
  "totalTrades": 48,
  "equityCurve": [
    { "date": "2024-01-02", "equity": 100000, "benchmark": 100000 }
  ]
}
```

---

## 5. Steps to Connect a Real Backend

When transitioning from frontend-only demo mode to live operation:

1. **Environment Variables**:
   In `frontend/.env`:
   ```bash
   VITE_USE_MOCKS=false
   VITE_API_BASE_URL=http://localhost:8000
   ```
2. **Implement Fetch Calls in `src/services/stockService.js`**:
   Replace the fallback mock returns in `fetchStocks()`, `fetchStock()`, `fetchOHLCV()`, `fetchForecast()`, `fetchPredictions()`, and `runBacktest()` with `fetch()` calls to `${import.meta.env.VITE_API_BASE_URL}/api/v1/...`.
3. **Artifact Availability**:
   Ensure `models/lstm_model.pt`, `models/feature_scaler.pkl`, and `models/target_scaler.pkl` are generated by running the training pipeline and made accessible to the backend runner.
4. **CORS Configuration**:
   Ensure the FastAPI backend configures `CORSMiddleware` to allow requests originating from `http://localhost:5173`.
5. **Session & Auth**:
   Replace the local mock state in `src/hooks/useAuth.jsx` with real HTTP-only cookies or bearer token authentication.

---

*Last updated: October 2026 · ArthNex Research Platform*
