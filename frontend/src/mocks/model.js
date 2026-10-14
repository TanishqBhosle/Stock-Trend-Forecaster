/**
 * MOCK MODEL METADATA
 *
 * Verified from project README.
 * Metrics are explicitly labeled as UNAVAILABLE — no real training artifacts exist.
 *
 * @typedef {object} ModelConfig
 * @property {string} version
 * @property {string} architecture
 * @property {number} hiddenSize
 * @property {number} numLayers
 * @property {number} dropout
 * @property {number} lookback
 * @property {string[]} features
 * @property {string} target
 * @property {string} optimizer
 * @property {string} lossFunction
 * @property {object} dataset
 * @property {object} split
 * @property {object} metrics - null values = not yet available
 */

export const MODEL_CONFIG = {
  version:       'lstm-v0.1-demo',
  architecture:  '2-layer Stacked LSTM',
  hiddenSize:    128,
  numLayers:     2,
  dropout:       0.2,
  lookback:      60,
  batchSize:     64,
  optimizer:     'Adam (lr=0.001)',
  lossFunction:  'Mean Squared Error (MSE)',
  lrScheduler:   'ReduceLROnPlateau (factor=0.5, patience=5)',
  earlyStopping: 'Patience 15 epochs on validation loss',
  gradientClip:  'Max norm 1.0',

  features: [
    { name: 'Daily_Return',      formula: 'Close.pct_change()',             purpose: 'Day-over-day return' },
    { name: 'Price_Range_Pct',   formula: '(High - Low) / Close',           purpose: 'Intraday volatility' },
    { name: 'Open_Close_Pct',    formula: '(Close - Open) / Open',          purpose: 'Intraday direction' },
    { name: 'Close_MA7_Ratio',   formula: 'Close / MA_7 - 1',               purpose: 'Short-term mean reversion' },
    { name: 'Close_MA20_Ratio',  formula: 'Close / MA_20 - 1',              purpose: 'Medium-term mean reversion' },
    { name: 'Volatility_20',     formula: 'rolling(20).std(Daily_Return)',   purpose: '20-day realized volatility' },
    { name: 'MA7_MA20_Cross',    formula: 'MA_7 / MA_20 - 1',               purpose: 'Trend strength' },
    { name: 'Momentum_5',        formula: 'Close / Close_5d_ago - 1',       purpose: '5-day momentum' },
    { name: 'Momentum_10',       formula: 'Close / Close_10d_ago - 1',      purpose: '10-day momentum' },
  ],

  target: {
    name:        'Next-day return',
    formula:     '(Close[t+1] - Close[t]) / Close[t]',
    priceRecovery: 'predicted_price = Close[t] * (1 + predicted_return)',
    note:        'Model predicts return, not raw price. Stationarity is preserved.',
  },

  dataset: {
    source:   'Yahoo Finance (^GSPC)',
    file:     'GSPC.csv',
    rows:     24800,
    columns:  ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume'],
    dateRange: '1927-12-30 to 2026-09-25',
    missingValues: 0,
    duplicates:    0,
    noteVolume: 'Approx. 5,500 pre-1950s rows have zero volume (not recorded). Volume excluded from initial feature set.',
  },

  split: {
    method: 'Chronological (no shuffling)',
    train:  { pct: 70, approxDates: '~1928 – ~1997' },
    val:    { pct: 15, approxDates: '~1997 – ~2012' },
    test:   { pct: 15, approxDates: '~2012 – 2026' },
    scalerNote: 'StandardScaler fit on training data only. Prevents data leakage.',
  },

  // Real evaluation metrics from training artifacts are NOT available.
  // These fields are null to indicate unavailable status.
  metrics: {
    available: false,
    reason:    'Model artifacts (lstm_model.pt, metrics.json) not present in this deployment. Run the training notebook to generate evaluation results.',
    lstm: {
      rmse:               null,
      mae:                null,
      mape:               null,
      directionalAccuracy: null,
      trendAccuracy:      null,
    },
    naiveBaseline: {
      rmse:               null,
      mae:                null,
      mape:               null,
      directionalAccuracy: null,
    },
    linearBaseline: {
      rmse:               null,
      mae:                null,
      mape:               null,
      directionalAccuracy: null,
    },
  },

  limitations: [
    'This is a single-asset model trained exclusively on S&P 500 (^GSPC) data. Results on individual stocks are not supported by the training procedure.',
    'The model predicts the next-day return for the S&P 500 index only.',
    'Past performance does not predict future returns. Forecasts carry inherent uncertainty.',
    'The model was trained on historical data through 2026-09-25. Predictions beyond this window are extrapolation.',
    'Walk-forward validation has not yet been implemented (see project roadmap).',
    'Transaction costs, slippage, and market impact are not modelled.',
    'This tool is for research and educational purposes only. It is not financial advice.',
  ],

  intendedUse: 'Research, education, and demonstration of LSTM-based time-series forecasting on financial data.',
  outOfScope:  'Live trading, investment decisions, portfolio management, risk management, or any regulated financial activity.',
}

/**
 * Illustrative demo metrics — clearly labeled, not from real training.
 * Used for visual previews only.
 */
export const ILLUSTRATIVE_METRICS = {
  _label: 'Illustrative demo values — not from model evaluation',
  lstm: {
    rmse: 42.18,
    mae:  31.55,
    mape: 0.62,
    directionalAccuracy: 0.538,
    trendAccuracy: 0.501,
  },
  naiveBaseline: {
    rmse: 45.92,
    mae:  34.21,
    mape: 0.68,
    directionalAccuracy: 0.491,
  },
  linearBaseline: {
    rmse: 47.34,
    mae:  35.87,
    mape: 0.71,
    directionalAccuracy: 0.483,
  },
}
