/**
 * MOCK EXPERIMENT RECORDS — Data Scientist workspace
 *
 * Illustrative hyperparameter exploration records.
 * These are clearly labeled as demo values.
 *
 * @typedef {object} Experiment
 * @property {string} id
 * @property {string} name
 * @property {string} architecture
 * @property {number} hiddenSize
 * @property {number} numLayers
 * @property {number} lookback
 * @property {number} dropout
 * @property {string} validationMethod
 * @property {number|null} valLoss
 * @property {number|null} rmse
 * @property {number|null} mae
 * @property {number|null} directionalAccuracy
 * @property {string} version
 * @property {string} createdAt
 * @property {'illustrative'} dataStatus
 */

export const DEMO_EXPERIMENTS = [
  {
    id: 'exp-001',
    name: 'Baseline LSTM (2×128)',
    architecture: 'LSTM',
    hiddenSize: 128,
    numLayers: 2,
    lookback: 60,
    dropout: 0.2,
    validationMethod: 'Hold-out (15%)',
    valLoss: 0.00042,
    rmse: 42.18,
    mae: 31.55,
    directionalAccuracy: 0.538,
    version: 'v0.1',
    createdAt: '2026-09-20',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-002',
    name: 'Wider LSTM (2×256)',
    architecture: 'LSTM',
    hiddenSize: 256,
    numLayers: 2,
    lookback: 60,
    dropout: 0.2,
    validationMethod: 'Hold-out (15%)',
    valLoss: 0.00044,
    rmse: 43.80,
    mae: 32.90,
    directionalAccuracy: 0.531,
    version: 'v0.2',
    createdAt: '2026-09-22',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-003',
    name: 'Deeper LSTM (3×128)',
    architecture: 'LSTM',
    hiddenSize: 128,
    numLayers: 3,
    lookback: 60,
    dropout: 0.3,
    validationMethod: 'Hold-out (15%)',
    valLoss: 0.00045,
    rmse: 44.22,
    mae: 33.10,
    directionalAccuracy: 0.527,
    version: 'v0.3',
    createdAt: '2026-09-23',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-004',
    name: 'Short lookback (30 days)',
    architecture: 'LSTM',
    hiddenSize: 128,
    numLayers: 2,
    lookback: 30,
    dropout: 0.2,
    validationMethod: 'Hold-out (15%)',
    valLoss: 0.00048,
    rmse: 45.91,
    mae: 34.77,
    directionalAccuracy: 0.519,
    version: 'v0.4',
    createdAt: '2026-09-24',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-005',
    name: 'Extended lookback (90 days)',
    architecture: 'LSTM',
    hiddenSize: 128,
    numLayers: 2,
    lookback: 90,
    dropout: 0.2,
    validationMethod: 'Hold-out (15%)',
    valLoss: 0.00043,
    rmse: 42.90,
    mae: 32.10,
    directionalAccuracy: 0.534,
    version: 'v0.5',
    createdAt: '2026-09-25',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-006',
    name: 'High dropout (0.5)',
    architecture: 'LSTM',
    hiddenSize: 128,
    numLayers: 2,
    lookback: 60,
    dropout: 0.5,
    validationMethod: 'Hold-out (15%)',
    valLoss: 0.00052,
    rmse: 47.33,
    mae: 35.88,
    directionalAccuracy: 0.511,
    version: 'v0.6',
    createdAt: '2026-09-26',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-007',
    name: 'Low dropout (0.1)',
    architecture: 'LSTM',
    hiddenSize: 128,
    numLayers: 2,
    lookback: 60,
    dropout: 0.1,
    validationMethod: 'Hold-out (15%)',
    valLoss: 0.00046,
    rmse: 44.55,
    mae: 33.40,
    directionalAccuracy: 0.526,
    version: 'v0.7',
    createdAt: '2026-09-27',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-008',
    name: 'Naive Baseline',
    architecture: 'Naive (t=t-1)',
    hiddenSize: null,
    numLayers: null,
    lookback: 1,
    dropout: null,
    validationMethod: 'Hold-out (15%)',
    valLoss: null,
    rmse: 45.92,
    mae: 34.21,
    directionalAccuracy: 0.491,
    version: 'baseline-naive',
    createdAt: '2026-09-15',
    dataStatus: 'illustrative',
  },
  {
    id: 'exp-009',
    name: 'Linear Regression Baseline',
    architecture: 'Linear Regression',
    hiddenSize: null,
    numLayers: null,
    lookback: 60,
    dropout: null,
    validationMethod: 'Hold-out (15%)',
    valLoss: null,
    rmse: 47.34,
    mae: 35.87,
    directionalAccuracy: 0.483,
    version: 'baseline-linear',
    createdAt: '2026-09-15',
    dataStatus: 'illustrative',
  },
]
