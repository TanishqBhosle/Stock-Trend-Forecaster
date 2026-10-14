/**
 * DETERMINISTIC MOCK FORECAST DATA
 *
 * Illustrative next-day forecasts for demo tickers.
 * All values are labeled as demo/illustrative — not real model output.
 *
 * @typedef {object} ForecastResult
 * @property {string} ticker
 * @property {number} lastObservedClose  - last known closing price
 * @property {number} predictedReturn    - predicted next-day return (decimal)
 * @property {number} predictedClose     - recovered via lastClose * (1 + return)
 * @property {'BULLISH'|'NEUTRAL'|'BEARISH'} signal
 * @property {string} forecastDate       - ISO date of the prediction
 * @property {string} forecastFor        - ISO date the prediction covers
 * @property {string} modelVersion
 * @property {'illustrative'|'unavailable'} dataStatus
 */

import { DEMO_STOCKS } from './stocks'

const MODEL_VERSION = 'lstm-v0.1-demo'
const FORECAST_DATE = '2026-10-13'
const FORECAST_FOR  = '2026-10-14'

/** @returns {ForecastResult[]} */
export const DEMO_FORECASTS = DEMO_STOCKS.map((s) => ({
  ticker:             s.ticker,
  lastObservedClose:  s.mockPrice,
  predictedReturn:    s.mockReturn,
  predictedClose:     +(s.mockPrice * (1 + s.mockReturn)).toFixed(2),
  signal:             s.mockSignal,
  forecastDate:       FORECAST_DATE,
  forecastFor:        FORECAST_FOR,
  modelVersion:       MODEL_VERSION,
  dataStatus:         'illustrative',
}))

/**
 * Get forecast for a single ticker.
 * @param {string} ticker
 * @returns {ForecastResult|null}
 */
export function getForecast(ticker) {
  return DEMO_FORECASTS.find(
    (f) => f.ticker.toLowerCase() === ticker.toLowerCase()
  ) ?? null
}
