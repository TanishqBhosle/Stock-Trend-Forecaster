/**
 * DETERMINISTIC MOCK OHLCV DATA
 *
 * Generates 2 years of daily OHLCV data using a seeded pseudo-random walk.
 * Values are illustrative only — not actual market data.
 * The same ticker always produces the same series.
 *
 * @typedef {object} OHLCVRow
 * @property {string} date       - ISO date string
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} adjClose
 * @property {number} volume
 */

import { getStock } from './stocks'

// Seeded LCG PRNG (deterministic)
function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 4294967296
  }
}

// Seed from ticker string
function tickerSeed(ticker) {
  let h = 0x811c9dc5
  for (let i = 0; i < ticker.length; i++) {
    h ^= ticker.charCodeAt(i)
    h = (h * 0x01000193) & 0xffffffff
  }
  return Math.abs(h)
}

/**
 * Generate OHLCV rows for a ticker.
 * @param {string} ticker
 * @param {number} [days=504] - number of trading days (~2 years)
 * @returns {OHLCVRow[]}
 */
export function generateOHLCV(ticker, days = 504) {
  const stock = getStock(ticker)
  const basePrice = stock?.mockPrice ?? 100
  const rand = seededRand(tickerSeed(ticker))

  // Walk backwards from the reference price
  const endDate = new Date('2026-10-13')
  const rows = []
  let price = basePrice

  // Build backwards then reverse
  for (let i = 0; i < days; i++) {
    const r = rand()
    const dailyReturn = (r - 0.5) * 0.032  // ±1.6% daily range
    const volatility  = 0.01 + rand() * 0.015

    const open  = price * (1 + (rand() - 0.5) * 0.008)
    const close = price * (1 + dailyReturn)
    const high  = Math.max(open, close) * (1 + rand() * volatility)
    const low   = Math.min(open, close) * (1 - rand() * volatility)
    const volume = Math.floor(1_000_000 + rand() * 50_000_000)

    const date = new Date(endDate)
    date.setDate(endDate.getDate() - i)

    rows.push({
      date: date.toISOString().slice(0, 10),
      open:  +open.toFixed(2),
      high:  +high.toFixed(2),
      low:   +low.toFixed(2),
      close: +close.toFixed(2),
      adjClose: +close.toFixed(2),
      volume,
    })

    price = close
  }

  rows.reverse()

  // Correct the last close to match the known mock price exactly
  if (rows.length > 0) {
    const last = rows[rows.length - 1]
    const factor = basePrice / last.close
    rows[rows.length - 1] = {
      ...last,
      close: basePrice,
      adjClose: basePrice,
      open:  +(last.open * factor).toFixed(2),
      high:  +(last.high * factor).toFixed(2),
      low:   +(last.low  * factor).toFixed(2),
    }
  }

  return rows
}

// Memoized cache so the same ticker always returns the same array reference
const _cache = {}

/**
 * Get (cached) OHLCV data for a ticker.
 * @param {string} ticker
 * @returns {OHLCVRow[]}
 */
export function getOHLCV(ticker) {
  const key = ticker.toLowerCase()
  if (!_cache[key]) {
    _cache[key] = generateOHLCV(ticker)
  }
  return _cache[key]
}

/**
 * Filter OHLCV rows to a date range.
 * @param {OHLCVRow[]} rows
 * @param {string} range - '1M'|'3M'|'6M'|'1Y'|'MAX'
 * @returns {OHLCVRow[]}
 */
export function filterByRange(rows, range) {
  if (!rows.length) return rows
  const lastDate = new Date(rows[rows.length - 1].date)
  const monthsMap = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, 'MAX': 999 }
  const months = monthsMap[range] ?? 12
  const start = new Date(lastDate)
  start.setMonth(start.getMonth() - months)
  return rows.filter(r => new Date(r.date) >= start)
}
