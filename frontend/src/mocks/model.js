/**
 * MODEL METADATA & CONFIGURATION
 *
 * S&P 500 Index (^GSPC) PyTorch LSTM Forecasting Model.
 * Verified against backend/artifacts/lstm/ and active FastAPI backend.
 *
 * @typedef {object} ModelConfig
 */

export const MODEL_CONFIG = {
  version:       'lstm-v1.0',
  architecture:  '2-layer Stacked LSTM',
  hiddenSize:    128,
  numLayers:     2,
  dropout:       0.2,
  lookback:      60,
  batchSize:     64,
  optimizer:     'Adam (lr=0.001, weight_decay=1e-5)',
  lossFunction:  'Mean Squared Error (MSE)',
  lrScheduler:   'Validation loss checkpointing with patience 7',
  earlyStopping: 'Patience 7 epochs on validation loss (best restored at epoch 2)',
  gradientClip:  'None',

  // Exactly six raw features as strictly required
  features: [
    { name: 'Open',      formula: 'Raw Open price',               purpose: 'Opening session level (USD)' },
    { name: 'High',      formula: 'Raw High price',               purpose: 'Intraday peak level (USD)' },
    { name: 'Low',       formula: 'Raw Low price',                purpose: 'Intraday trough level (USD)' },
    { name: 'Close',     formula: 'Raw Close price',              purpose: 'Closing session level (USD)' },
    { name: 'Adj Close', formula: 'Raw Adjusted Close price',     purpose: 'Dividend & split adjusted Close (USD)' },
    { name: 'Volume',    formula: 'Raw Trading Volume',           purpose: 'Daily shares traded' },
  ],

  target: {
    name:          'Next-session Close return',
    formula:       'Close[t] / Close[t-1] - 1',
    priceRecovery: 'predicted_price = latest_actual_close * (1 + predicted_return)',
    note:          'The LSTM receives the 6 raw features over 60 sessions and predicts next session Close return.',
  },

  dataset: {
    source:        'Yahoo Finance (^GSPC)',
    file:          'GSPC_daily_clean.parquet / GSPC.csv',
    rows:          6738,
    columns:       ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume'],
    dateRange:     '2000-01-03 to 2026-10-16',
    missingValues: 0,
    duplicates:    0,
    totalSequences: 6678,
    noteVolume:    'Cleaned and validated market trading calendar without weekend/holiday forward-filling.',
  },

  split: {
    method: 'Chronological (no shuffling, 80% train / 10% val / 10% test)',
    train:  { pct: 80, approxDates: '2000-03-29 to 2021-06-25', samples: 5342 },
    val:    { pct: 10, approxDates: '2021-06-28 to 2024-02-21', samples: 668 },
    test:   { pct: 10, approxDates: '2024-02-22 to 2026-10-16', samples: 668 },
    scalerNote: 'MinMaxScaler fit strictly on training split (5,342 samples) to prevent data leakage.',
  },

  metrics: {
    available: true,
    evaluatedAt: '2026-10-19',
    sampleCount: 668,
    dateRange: '2024-02-22 to 2026-10-16',
    lstm: {
      rmse:               0.009655, // 0.97 percentage points
      mae:                0.006537, // 0.65 percentage points
      directionalAccuracy: 55.39,   // 55.39%
      walkForwardRmse:    0.009655,
      walkForwardMae:     0.006537,
      walkForwardDA:      55.39,
    },
  },

  limitations: [
    'Single-asset regression model trained exclusively on S&P 500 (^GSPC).',
    'Uses exactly six raw OHLCV features without engineered indicators.',
    'Predicts next trading session return; implied Close is derived from latest actual Close.',
    'Model output is an algorithmic statistical estimate, not a guaranteed price or financial recommendation.',
    'Evaluated on held-out test set (668 sessions) and sequential 668-step walk-forward evaluation.',
  ],

  intendedUse: 'Quantitative research, next-trading-session directional forecasting, and machine learning model evaluation.',
  outOfScope:  'Live automated execution, leverage trading, individual stock selection, or financial advice.',
}

export const ILLUSTRATIVE_METRICS = {
  _label: 'Real PyTorch Model Evaluation Metrics (Test Split)',
  lstm: {
    rmse: 0.97, // %
    mae:  0.65, // %
    directionalAccuracy: 0.5539,
    trendAccuracy: 0.5539,
  },
}
