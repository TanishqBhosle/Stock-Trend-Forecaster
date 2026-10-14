/**
 * Stock service — mock-or-real interface.
 *
 * When VITE_USE_MOCKS=true (default), returns deterministic demo data.
 * When a real API is connected, swap these implementations.
 *
 * Future endpoints:
 *   GET /api/v1/stocks
 *   GET /api/v1/stocks/:ticker
 *   GET /api/v1/forecast/:ticker
 *   GET /api/v1/predictions/:ticker
 *   GET /api/v1/performance
 *   GET /api/v1/backtest
 *   GET /api/v1/model-card
 */

import { DEMO_STOCKS, getStock } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { DEMO_FORECASTS, getForecast } from '@/mocks/forecasts'
import { MODEL_CONFIG, ILLUSTRATIVE_METRICS } from '@/mocks/model'
import { DEMO_PREDICTIONS } from '@/mocks/predictions'
import { DEMO_EXPERIMENTS } from '@/mocks/experiments'

const MOCK_DELAY = 420 // ms — realistic loading feel

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

// ── Stocks ────────────────────────────────────────────────────────────────────

/**
 * Get all available stocks.
 * @returns {Promise<import('@/mocks/stocks').StockMeta[]>}
 */
export async function fetchStocks() {
  await delay()
  if (USE_MOCKS) return DEMO_STOCKS
  throw new Error('Real API not connected. Set VITE_USE_MOCKS=true.')
}

/**
 * Get a single stock by ticker.
 * @param {string} ticker
 * @returns {Promise<import('@/mocks/stocks').StockMeta>}
 */
export async function fetchStock(ticker) {
  await delay(280)
  if (USE_MOCKS) {
    const s = getStock(ticker)
    if (!s) throw new Error(`Ticker not found: ${ticker}`)
    return s
  }
  throw new Error('Real API not connected.')
}

// ── OHLCV ─────────────────────────────────────────────────────────────────────

/**
 * Get OHLCV series for a ticker filtered to a time range.
 * @param {string} ticker
 * @param {'1M'|'3M'|'6M'|'1Y'|'MAX'} range
 * @returns {Promise<import('@/mocks/ohlcv').OHLCVRow[]>}
 */
export async function fetchOHLCV(ticker, range = '1Y') {
  await delay(380)
  if (USE_MOCKS) {
    const rows = getOHLCV(ticker)
    return filterByRange(rows, range)
  }
  throw new Error('Real API not connected.')
}

// ── Forecasts ─────────────────────────────────────────────────────────────────

/**
 * Get all demo forecasts.
 * @returns {Promise<import('@/mocks/forecasts').ForecastResult[]>}
 */
export async function fetchForecasts() {
  await delay(320)
  if (USE_MOCKS) return DEMO_FORECASTS
  throw new Error('Real API not connected.')
}

/**
 * Get forecast for a single ticker.
 * @param {string} ticker
 * @returns {Promise<import('@/mocks/forecasts').ForecastResult>}
 */
export async function fetchForecast(ticker) {
  await delay(350)
  if (USE_MOCKS) {
    const f = getForecast(ticker)
    if (!f) throw new Error(`No forecast for ticker: ${ticker}`)
    return f
  }
  throw new Error('Real API not connected.')
}

// ── Model ─────────────────────────────────────────────────────────────────────

/**
 * Get model configuration (verified from README).
 * @returns {Promise<typeof MODEL_CONFIG>}
 */
export async function fetchModelConfig() {
  await delay(280)
  return MODEL_CONFIG
}

/**
 * Get illustrative demo metrics (clearly labeled).
 * @returns {Promise<typeof ILLUSTRATIVE_METRICS>}
 */
export async function fetchIllustrativeMetrics() {
  await delay(300)
  return ILLUSTRATIVE_METRICS
}

// ── Predictions ───────────────────────────────────────────────────────────────

/**
 * Get paginated prediction history.
 * @param {object} [options]
 * @param {string} [options.ticker]
 * @param {string} [options.signal]
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=20]
 * @returns {Promise<{records: import('@/mocks/predictions').PredictionRecord[], total: number}>}
 */
export async function fetchPredictions({ ticker, signal, page = 1, pageSize = 20 } = {}) {
  await delay(400)
  if (USE_MOCKS) {
    let records = [...DEMO_PREDICTIONS]
    if (ticker) records = records.filter(r => r.ticker.toLowerCase() === ticker.toLowerCase())
    if (signal) records = records.filter(r => r.predictedDirection === signal)
    const total = records.length
    const start = (page - 1) * pageSize
    return { records: records.slice(start, start + pageSize), total }
  }
  throw new Error('Real API not connected.')
}

// ── Experiments ───────────────────────────────────────────────────────────────

/**
 * Get all demo experiments.
 * @returns {Promise<import('@/mocks/experiments').Experiment[]>}
 */
export async function fetchExperiments() {
  await delay(380)
  return DEMO_EXPERIMENTS
}

/**
 * Get a single experiment by id.
 * @param {string} id
 * @returns {Promise<import('@/mocks/experiments').Experiment>}
 */
export async function fetchExperiment(id) {
  await delay(260)
  const exp = DEMO_EXPERIMENTS.find(e => e.id === id)
  if (!exp) throw new Error(`Experiment not found: ${id}`)
  return exp
}

// ── Backtest ──────────────────────────────────────────────────────────────────

/**
 * Run a simulated backtest (deterministic demo result).
 * Returns clearly labeled simulated results — not real trading outcomes.
 *
 * @param {object} params
 * @param {string} params.ticker
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {number} params.initialCapital
 * @param {number} [params.bullishThreshold=0.005]
 * @param {number} [params.bearishThreshold=-0.005]
 * @param {number} [params.transactionCostPct=0.001]
 */
export async function runBacktest(params) {
  await delay(1200) // simulate compute time

  // Deterministic result based on ticker seed
  const seed = params.ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const r = (seed % 100) / 100

  const trades = Math.floor(20 + r * 40)
  const winRate = 0.48 + r * 0.10
  const totalReturn = (-0.02 + r * 0.22)
  const maxDrawdown = -(0.05 + r * 0.15)
  const sharpe = -0.2 + r * 1.4

  // Generate equity curve
  const startDate = new Date(params.startDate)
  const endDate   = new Date(params.endDate)
  const days = Math.max(1, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)))
  const equityCurve = []
  let equity = params.initialCapital

  for (let d = 0; d <= Math.min(days, 252); d++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + d)
    if (date.getDay() === 0 || date.getDay() === 6) continue
    const dr = ((((seed + d * 7) % 100) / 100) - 0.5) * 0.03
    equity *= (1 + dr * (d / Math.max(1, days)))
    equityCurve.push({
      date: date.toISOString().slice(0, 10),
      equity: +equity.toFixed(2),
      benchmark: +(params.initialCapital * (1 + 0.12 * d / 252)).toFixed(2),
    })
  }

  return {
    _label: 'Simulated demo results — not real trading performance',
    ticker:          params.ticker,
    startDate:       params.startDate,
    endDate:         params.endDate,
    initialCapital:  params.initialCapital,
    finalCapital:    +(params.initialCapital * (1 + totalReturn)).toFixed(2),
    totalReturn:     +totalReturn.toFixed(4),
    maxDrawdown:     +maxDrawdown.toFixed(4),
    sharpeRatio:     +sharpe.toFixed(3),
    winRate:         +winRate.toFixed(3),
    totalTrades:     trades,
    equityCurve,
    dataStatus:      'simulated-demo',
  }
}

// ── Health ────────────────────────────────────────────────────────────────────

/**
 * Check API/data source availability.
 * @returns {Promise<{mocks: boolean, api: boolean}>}
 */
export async function checkHealth() {
  return {
    mocks: true,
    api:   false, // No real backend connected
    modelArtifacts: false,
  }
}
