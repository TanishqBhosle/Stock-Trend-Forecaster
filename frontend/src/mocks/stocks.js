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
    mockPrice: 7237.17,
    mockChange: +19.83,
    mockChangePct: +0.27,
    mockReturn: 0.000274,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: true,
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    exchange: 'NASDAQ',
    mockPrice: 227.52,
    mockChange: +1.84,
    mockChangePct: +0.82,
    mockReturn: 0.0082,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    exchange: 'NASDAQ',
    mockPrice: 415.60,
    mockChange: +2.45,
    mockChangePct: +0.59,
    mockReturn: 0.0059,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    exchange: 'NASDAQ',
    mockPrice: 138.85,
    mockChange: -1.22,
    mockChangePct: -0.87,
    mockReturn: -0.0087,
    mockSignal: 'BEARISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com, Inc.',
    sector: 'Consumer Discretionary',
    exchange: 'NASDAQ',
    mockPrice: 213.74,
    mockChange: +0.95,
    mockChangePct: +0.45,
    mockReturn: 0.0045,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc. (Class A)',
    sector: 'Communication Services',
    exchange: 'NASDAQ',
    mockPrice: 192.30,
    mockChange: -0.68,
    mockChangePct: -0.35,
    mockReturn: -0.0035,
    mockSignal: 'BEARISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    sector: 'Communication Services',
    exchange: 'NASDAQ',
    mockPrice: 599.14,
    mockChange: +4.72,
    mockChangePct: +0.79,
    mockReturn: 0.0079,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Consumer Discretionary',
    exchange: 'NASDAQ',
    mockPrice: 251.88,
    mockChange: -3.14,
    mockChangePct: -1.23,
    mockReturn: -0.0123,
    mockSignal: 'BEARISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financials',
    exchange: 'NYSE',
    mockPrice: 231.45,
    mockChange: +1.10,
    mockChangePct: +0.48,
    mockReturn: 0.0048,
    mockSignal: 'BULLISH',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'BRK.B',
    name: 'Berkshire Hathaway Inc. (Class B)',
    sector: 'Financials',
    exchange: 'NYSE',
    mockPrice: 460.22,
    mockChange: +0.18,
    mockChangePct: +0.04,
    mockReturn: 0.0004,
    mockSignal: 'NEUTRAL',
    isPrimaryModelAsset: false,
  },
  {
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    sector: 'ETF',
    exchange: 'NYSE Arca',
    mockPrice: 574.88,
    mockChange: +0.17,
    mockChangePct: +0.03,
    mockReturn: 0.0003,
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
