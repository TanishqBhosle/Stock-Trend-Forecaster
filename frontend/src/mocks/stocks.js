/**
 * DEMO STOCK LIST
 * Deterministic mock data for the 11 demo tickers.
 * These are illustrative values — not live market data.
 *
 * @typedef {object} StockMeta
 * @property {string} ticker
 * @property {string} name
 * @property {string} sector
 * @property {string} exchange
 * @property {number} mockPrice  - illustrative current price (USD)
 * @property {number} mockChange - illustrative day change (USD)
 * @property {number} mockChangePct - illustrative day change %
 * @property {number} mockReturn  - illustrative predicted next-day return
 * @property {'BULLISH'|'NEUTRAL'|'BEARISH'} mockSignal
 */

export const DEMO_STOCKS = [
  {
    ticker: '^GSPC',
    name: 'S&P 500 Index',
    sector: 'Index',
    exchange: 'INDEX',
    mockPrice: 5762.45,
    mockChange: +18.32,
    mockChangePct: +0.32,
    mockReturn: 0.0032,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: true,
  },
]

/**
 * Get a stock by ticker (case-insensitive).
 * @param {string} ticker
 * @returns {StockMeta|undefined}
 */
export function getStock(ticker) {
  return DEMO_STOCKS.find(
    (s) => s.ticker.toLowerCase() === ticker.toLowerCase()
  )
}

/**
 * Get mock signal stocks grouped by type.
 */
export function getSignalGroups() {
  const bullish = DEMO_STOCKS.filter(s => s.mockSignal === 'BULLISH')
  const bearish = DEMO_STOCKS.filter(s => s.mockSignal === 'BEARISH')
  const neutral = DEMO_STOCKS.filter(s => s.mockSignal === 'NEUTRAL')
  return { bullish, bearish, neutral }
}
