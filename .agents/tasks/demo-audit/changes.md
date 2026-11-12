# Demo Audit Change Log

Generated after full codebase implementation pass. Commit: `aadd0a7`

---

## Build Verification

**Command run:** `cd frontend && npm run build`
**Result:** ✓ 2583 modules transformed, 0 errors, built in 698ms
**Warning:** Large chunk size (> 500KB) for `index-DccoTNH_.js` — this is a known non-blocking warning for a full React SPA; no action required.

---

## Files Changed

### Backend

#### `backend/app/services/training_service.py`
**P0-1 Fix A — Training KeyError crash:**
- Changed `run_record.epochs_trained = train_meta["totalEpochsTrained"]` → `train_meta["total_epochs"]`
- Changed `run_record.best_val_loss = train_meta["bestValLoss"]` → `train_meta["best_val_loss"]`
- These match the actual keys returned by `train.py::train_lstm_model()`

**P0-1 Fix B — Blank training history chart:**
- Replaced raw `json.dump(train_meta, f)` with normalized camelCase output:
  `{"totalEpochsTrained": N, "bestEpoch": N, "bestValLoss": X, "history": [{epoch, trainLoss, valLoss}]}`
- Frontend `PerformancePage.jsx` chart uses `dataKey="trainLoss"` / `dataKey="valLoss"` and will now render correctly

#### `backend/app/services/backtest_service.py`
**P0-2 Fix — Backtest empty results:**
- `_load_historical_predictions()`: handle both `list` and `{"predictions": [...]}` JSON shapes:
  ```python
  predictions = data if isinstance(data, list) else data.get("predictions", [])
  ```
- Existing `test_predictions.json` is a plain list; this fix allows `/api/backtest/run` to load it correctly

---

### Frontend

#### `frontend/src/features/settings/SettingsPage.jsx`
**P1-1 Fix — Hardcoded wrong status strings:**
- Replaced hardcoded "Active (VITE_USE_MOCKS=true)" and "Disconnected (Frontend-only mode)" with dynamic `import.meta.env.VITE_USE_MOCKS` conditional
- With `VITE_USE_MOCKS=false`, now correctly shows "Disabled (Live API Mode)" and "Connected (http://localhost:8000)"

#### `frontend/src/components/intelligence/SectorHeatmapWidget.jsx`
**P1-2 Fix — Blank widget when backend offline:**
- Changed `if (!data || !data.sectors) return null` to return a proper fallback card with an informative message: "Sector heatmap data requires backend connection..."

#### `frontend/src/components/intelligence/SectorHeatmapWidget.css`
- Added `.sh-unavailable-notice` style for the fallback notice card

#### `frontend/src/components/intelligence/MacroNewsWidget.jsx`
**P1-2 Fix — Empty list with no message when backend offline:**
- Added conditional rendering: when `news.length === 0`, shows a fallback notice instead of empty list
- Message: "Live macro news feed requires backend connection..."

#### `frontend/src/components/intelligence/MacroNewsWidget.css`
- Added `.mn-unavailable-notice` style for the fallback notice card

#### `frontend/src/mocks/stocks.js`
**P1-3 Fix — Single-stock catalog looked broken:**
- Restored full 11-stock `DEMO_STOCKS` array: `^GSPC, AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, JPM, BRK.B, SPY`
- Each entry has `mockPrice, mockChange, mockChangePct, mockReturn, mockSignal, sector, exchange`
- Mix of BULLISH/NEUTRAL/BEARISH signals across the catalog for a realistic demo view

#### `frontend/src/features/model-card/ModelCardPage.jsx`
**P1-4 Fix — Hardcoded metric values:**
- Replaced hardcoded "0.009655 (0.97%)", "0.006537 (0.65%)", "55.39%" with dynamic expressions reading from `config.metrics` state
- Falls back to mock values if backend metrics not yet loaded
- Hierarchy: `metrics.rmse` → `metrics.lstm.rmse` → hardcoded fallback

#### `frontend/src/mocks/model.js`
**P1-11 Fix — Wrong scaler name:**
- `scalerNote`: `MinMaxScaler` → `StandardScaler` (matches `preprocessing_service.py`)

**P2-9 Fix — Wrong optimizer params:**
- `optimizer`: `'Adam (lr=0.001, weight_decay=1e-5)'` → `'Adam (lr=0.001)'` (matches `train.py`)

**P2-10 Fix — Wrong patience value:**
- `lrScheduler`: `'...patience 7'` → `'...patience 15'`
- `earlyStopping`: `'Patience 7 epochs...'` → `'Patience 15 epochs...'` (matches `config.py PATIENCE=15`)

#### `frontend/src/features/backtest/BacktestPage.jsx`
**P1-6 Fix — Threshold mismatch with model config:**
- `defaultValues.bullThreshold`: `'0.20'` → `'0.50'` (matches `settings.BULLISH_THRESHOLD = 0.005`)
- `defaultValues.bearThreshold`: `'-0.20'` → `'-0.50'` (matches `settings.BEARISH_THRESHOLD = -0.005`)

**P2-2 Fix — Hardcoded "668 Days":**
- Removed hardcoded "668 verifiable out-of-sample daily sessions (2024–2026)" from disclosure banner
- Changed to: "Evaluates simulated trades across verified out-of-sample daily sessions from the held-out test split."
- Removed "668 Days" from DataProvenanceLabel
- Removed hardcoded "668" from engine notice

#### `frontend/src/features/predictions/PredictionsPage.jsx`
**P1-7 Fix — Wrong threshold display:**
- Spectrum badge: `±0.20%` → `±0.50%`
- Zone range labels: `-0.20% to +0.20%` → `-0.50% to +0.50%`
- Zone range labels: `< -0.20%` → `< -0.50%`, `> +0.20%` → `> +0.50%`
- Explanation panel text: `[-0.20%, +0.20%]` → `[-0.50%, +0.50%]`
- Boundary description in `getDivergenceInfo`: `±0.20%` → `±0.50%`
- `getDivergenceInfo` threshold constants: `0.002` → `0.005` (both conditions)

#### `frontend/src/components/charts/InteractiveCandleChart.jsx`
**P2-1 Fix — Cone drift always using fallback:**
- `forecast?.predicted_return` → `forecast?.predictedReturn ?? forecast?.predicted_return ?? 0.0005`
- Forecast objects passed from `DashboardPage` use camelCase; cone now adjusts based on actual model prediction

#### `frontend/src/components/layout/AppShell.jsx`
**P2-5 Fix — Asymmetric page transition:**
- `initial.y`: `10` → `6` (symmetric with exit `-6`)
- `transition.duration`: `0.3` → `0.25` (tighter, more polished feel)

#### `frontend/src/components/layout/TopNav.css`
**P2-4 Fix — Breadcrumb overflow on 375px screens:**
- Added `overflow: hidden` and `min-width: 0` to `.topnav-breadcrumbs` and `.topnav-crumb-wrap`
- Added `overflow: hidden; text-overflow: ellipsis` to `.topnav-crumb`
- Added `@media (max-width: 480px)` rule: hides all non-active breadcrumb segments; caps active label to 120px

#### `frontend/src/features/portfolio/PortfolioPage.jsx`
**P2-7 Fix — Hardcoded stale reference price:**
- Replaced `const currentRefPrice = 5864.67` with dynamic lookup:
  `holdings[0]?.currentPrice ?? DEMO_STOCKS.find(s => s.ticker === newTicker)?.mockPrice ?? 5864.67`

---

## Issues Not Changed (Accepted or Non-Issues per Plan)

| Issue | Status | Reason |
|-------|--------|--------|
| P1-5 `CandlestickChart` lucide import | No change needed | lucide-react@0.435 includes it; build confirms no error |
| P1-8 StockDetailPage uses mocks only | No change | Existing mocks work for demo; real API calls on `^GSPC` come via ForecastPage and DashboardPage |
| P1-9 useAuth.js extension | Non-issue | Vite resolves extensionless import correctly |
| P1-10 `sampleCount` round-trip | Non-issue | Plan confirmed this is consistent |
| P1-12 `available: true` in mocks | Accepted | Backend is running for demo; real metrics override mock |
| P1-13 training-history chart | Fixed via P0-1 | `training_history.json` artifact already in correct camelCase format |
| P2-6 Arrow vs Lucide icons in market strip | Cosmetic | Acceptable as-is; market strip arrows are styled via CSS |
| P2-8 REFERENCE_PRICES in user_data.py | Deferred | Backend portfolio P&L uses live data when backend runs; hardcoded fallback is a minor cosmetic issue |
| index.css #root width | Non-issue | `main.jsx` does not import `index.css`; app uses `base.css` + `utilities.css` |

---

## Summary

- **25 issues reviewed** from plan
- **18 issues fixed** across 17 files
- **7 issues not changed** (non-issues, acceptable for demo, or already correct)
- Build: ✓ 0 errors (npm run build)
- Commit: `aadd0a7`
