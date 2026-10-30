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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// ── Stocks ────────────────────────────────────────────────────────────────────

/**
 * Get all available stocks.
 * @returns {Promise<import('@/mocks/stocks').StockMeta[]>}
 */
export async function fetchStocks() {
  await delay(100)
  if (!USE_MOCKS) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stocks`)
      if (res.ok) {
        const liveStocks = await res.json()
        const gspc = liveStocks.find(s => s.ticker === '^GSPC') || liveStocks[0]
        if (gspc) {
          return [gspc]
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, falling back to cached demo stocks:', err)
    }
  }
  return DEMO_STOCKS
}

/**
 * Get a single stock by ticker.
 * @param {string} ticker
 * @returns {Promise<import('@/mocks/stocks').StockMeta>}
 */
export async function fetchStock(ticker) {
  await delay(100)
  if (!USE_MOCKS) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stocks/${encodeURIComponent(ticker)}`)
      if (res.ok) {
        const data = await res.json()
        const fallback = getStock(ticker)
        return fallback ? { ...fallback, ...data } : data
      }
    } catch (err) {
      console.warn(`Backend fetch failed for ${ticker}, using fallback:`, err)
    }
  }
  const s = getStock(ticker)
  if (!s) throw new Error(`Ticker not found: ${ticker}`)
  return s
}

// ── OHLCV ─────────────────────────────────────────────────────────────────────

/**
 * Get OHLCV series for a ticker filtered to a time range.
 * @param {string} ticker
 * @param {'1M'|'3M'|'6M'|'1Y'|'MAX'} range
 * @returns {Promise<import('@/mocks/ohlcv').OHLCVRow[]>}
 */
export async function fetchOHLCV(ticker, range = '1Y') {
  await delay(120)
  if (!USE_MOCKS && (ticker === '^GSPC' || ticker === 'GSPC')) {
    try {
      const res = await fetch(`${API_BASE}/api/market/history?range=${range}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && json.data.length > 0) {
          return json.data
        }
      }
    } catch (err) {
      console.warn('Backend OHLCV fetch failed, using fallback:', err)
    }
  }
  const rows = getOHLCV(ticker)
  return filterByRange(rows, range)
}

// ── Forecasts ─────────────────────────────────────────────────────────────────

/**
 * Get all demo forecasts.
 * @returns {Promise<import('@/mocks/forecasts').ForecastResult[]>}
 */
export async function fetchForecasts() {
  await delay(100)
  if (!USE_MOCKS) {
    try {
      const f = await fetchForecast('^GSPC')
      if (f) {
        return DEMO_FORECASTS.map(item => item.ticker === '^GSPC' ? { ...item, ...f } : item)
      }
    } catch (err) {
      console.warn('Backend fetchForecasts failed:', err)
    }
  }
  return DEMO_FORECASTS
}

/**
 * Get forecast for a single ticker.
 * @param {string} ticker
 * @returns {Promise<import('@/mocks/forecasts').ForecastResult>}
 */
export async function fetchForecast(ticker) {
  await delay(120)
  if (!USE_MOCKS && (ticker === '^GSPC' || ticker === 'GSPC')) {
    try {
      const res = await fetch(`${API_BASE}/api/forecast/latest`)
      if (res.ok) {
        const data = await res.json()
        return {
          ticker: data.ticker,
          lastObservedClose: data.referenceClose,
          observedClose: data.referenceClose,
          predictedReturn: data.predictedReturn,
          predictedClose: data.predictedClose,
          signal: data.trendSignal,
          trendClassification: data.trendSignal,
          forecastDate: data.forecastDate,
          forecastFor: data.forecastFor,
          modelVersion: data.modelVersion,
          dataStatus: 'verified',
          expectedMovement: data.expectedMovement,
          disclaimer: data.disclaimer,
          lookbackDays: data.lookbackDays,
          featureCount: data.inputFeatureCount
        }
      }
    } catch (err) {
      console.warn('Backend forecast fetch failed, using fallback:', err)
    }
  }
  const f = getForecast(ticker)
  if (!f) throw new Error(`No forecast for ticker: ${ticker}`)
  return f
}

// ── Model ─────────────────────────────────────────────────────────────────────

/**
 * Get model configuration (verified from backend / README).
 * @returns {Promise<typeof MODEL_CONFIG>}
 */
export async function fetchModelConfig() {
  await delay(80)
  if (!USE_MOCKS) {
    try {
      const res = await fetch(`${API_BASE}/api/model/config`)
      if (res.ok) {
        const cfg = await res.json()
        return { ...MODEL_CONFIG, ...cfg }
      }
    } catch (err) {
      console.warn('Backend model config fetch failed:', err)
    }
  }
  return MODEL_CONFIG
}

/**
 * Get performance metrics from real backend evaluation.
 * @returns {Promise<typeof ILLUSTRATIVE_METRICS>}
 */
export async function fetchIllustrativeMetrics() {
  await delay(100)
  if (!USE_MOCKS) {
    try {
      const res = await fetch(`${API_BASE}/api/evaluation/test`)
      if (res.ok) {
        const data = await res.json()
        if (data.metrics) {
          return {
            _label: 'Held-out Chronological Test Split (Verified Artifacts)',
            lstm: {
              rmse: data.metrics.rmse,
              mae: data.metrics.mae,
              mape: data.metrics.mae,
              directionalAccuracy: data.metrics.directionalAccuracy / 100.0,
              trendAccuracy: data.metrics.directionalAccuracy / 100.0
            },
            raw: data
          }
        }
      }
    } catch (err) {
      console.warn('Backend performance fetch failed:', err)
    }
  }
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
  await delay(120)
  if (!USE_MOCKS) {
    try {
      let url = `${API_BASE}/api/forecast/history?page=${page}&pageSize=${pageSize}`
      if (ticker) url += `&ticker=${encodeURIComponent(ticker)}`
      if (signal && signal !== 'ALL') url += `&signal=${encodeURIComponent(signal)}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.records && data.records.length > 0) {
          return { records: data.records, total: data.total }
        }
      }
    } catch (err) {
      console.warn('Backend predictions fetch failed, using fallback:', err)
    }
  }
  let records = [...DEMO_PREDICTIONS]
  if (ticker) records = records.filter(r => r.ticker.toLowerCase() === ticker.toLowerCase())
  if (signal) records = records.filter(r => r.predictedDirection === signal)
  const total = records.length
  const start = (page - 1) * pageSize
  return { records: records.slice(start, start + pageSize), total }
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
 * @returns {Promise<{mocks: boolean, api: boolean, modelArtifacts: boolean, status?: any}>}
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/status`)
    if (res.ok) {
      const data = await res.json()
      return {
        mocks: USE_MOCKS,
        api: true,
        modelArtifacts: Boolean(data.modelAvailability),
        status: data,
      }
    }
  } catch {
    // API offline
  }
  return {
    mocks: true,
    api: false,
    modelArtifacts: false,
  }
}

