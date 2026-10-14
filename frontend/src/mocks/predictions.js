/**
 * DETERMINISTIC MOCK PREDICTION HISTORY
 *
 * Historical prediction log for demo purposes.
 * All data is illustrative — labeled accordingly.
 *
 * @typedef {object} PredictionRecord
 * @property {string}  id
 * @property {string}  predictionDate
 * @property {string}  ticker
 * @property {'BULLISH'|'NEUTRAL'|'BEARISH'} predictedDirection
 * @property {number}  predictedReturn
 * @property {number}  predictedClose
 * @property {number|null} actualReturn   - null if date is in future
 * @property {number|null} actualClose
 * @property {boolean|null} correct       - null if evaluable
 * @property {string}  modelVersion
 * @property {'illustrative'} dataStatus
 */

import { DEMO_STOCKS } from './stocks'
import { classifySignal } from '@/lib/signals'

const MODEL_VERSION = 'lstm-v0.1-demo'

// Generate 60 days of mock prediction history
function buildHistory() {
  const records = []
  const now = new Date('2026-10-13')
  let id = 1

  for (let daysAgo = 1; daysAgo <= 60; daysAgo++) {
    const predDate = new Date(now)
    predDate.setDate(now.getDate() - daysAgo)
    const predDateStr = predDate.toISOString().slice(0, 10)

    // Skip weekends (rough approximation)
    if (predDate.getDay() === 0 || predDate.getDay() === 6) continue

    // Pick a few tickers per day
    const dayTickers = DEMO_STOCKS.slice(0, 5)
    for (const stock of dayTickers) {
      // Deterministic "random" from date + ticker
      const seed = (daysAgo * 17 + stock.ticker.charCodeAt(0) * 31) % 100
      const predReturn = ((seed - 50) / 50) * 0.025  // ±2.5%
      const predictedClose = +(stock.mockPrice * (1 + predReturn)).toFixed(2)
      const signal = classifySignal(predReturn)

      // Past predictions have "outcomes" (deterministic)
      const actualReturn = ((((seed + 13) % 100) - 50) / 50) * 0.022
      const actualClose  = +(stock.mockPrice * (1 + actualReturn)).toFixed(2)
      const correct = classifySignal(actualReturn) === signal

      records.push({
        id: String(id++),
        predictionDate: predDateStr,
        ticker: stock.ticker,
        predictedDirection: signal,
        predictedReturn: +predReturn.toFixed(4),
        predictedClose,
        actualReturn:   +actualReturn.toFixed(4),
        actualClose,
        correct,
        modelVersion: MODEL_VERSION,
        dataStatus: 'illustrative',
      })
    }
  }

  return records.sort((a, b) =>
    b.predictionDate.localeCompare(a.predictionDate) ||
    a.ticker.localeCompare(b.ticker)
  )
}

export const DEMO_PREDICTIONS = buildHistory()
