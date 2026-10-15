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
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    exchange: 'NASDAQ',
    mockPrice: 228.52,
    mockChange: +1.34,
    mockChangePct: +0.59,
    mockReturn: 0.0078,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    exchange: 'NASDAQ',
    mockPrice: 415.67,
    mockChange: -2.18,
    mockChangePct: -0.52,
    mockReturn: -0.0042,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Communication',
    exchange: 'NASDAQ',
    mockPrice: 175.34,
    mockChange: +0.89,
    mockChangePct: +0.51,
    mockReturn: 0.0063,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Consumer Discretionary',
    exchange: 'NASDAQ',
    mockPrice: 197.12,
    mockChange: -1.05,
    mockChangePct: -0.53,
    mockReturn: -0.0067,
    mockSignal: 'BEARISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    exchange: 'NASDAQ',
    mockPrice: 121.44,
    mockChange: +3.22,
    mockChangePct: +2.72,
    mockReturn: 0.0185,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    sector: 'Consumer Discretionary',
    exchange: 'NASDAQ',
    mockPrice: 253.79,
    mockChange: -4.67,
    mockChangePct: -1.81,
    mockReturn: -0.0124,
    mockSignal: 'BEARISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    sector: 'Communication',
    exchange: 'NASDAQ',
    mockPrice: 564.21,
    mockChange: +2.44,
    mockChangePct: +0.43,
    mockReturn: 0.0043,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financials',
    exchange: 'NYSE',
    mockPrice: 222.18,
    mockChange: +0.77,
    mockChangePct: +0.35,
    mockReturn: 0.0035,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'BRK-B',
    name: 'Berkshire Hathaway Inc.',
    sector: 'Financials',
    exchange: 'NYSE',
    mockPrice: 462.55,
    mockChange: +1.20,
    mockChangePct: +0.26,
    mockReturn: 0.0026,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    sector: 'ETF',
    exchange: 'NYSE',
    mockPrice: 576.33,
    mockChange: +0.62,
    mockChangePct: +0.11,
    mockReturn: 0.0011,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: false,
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
