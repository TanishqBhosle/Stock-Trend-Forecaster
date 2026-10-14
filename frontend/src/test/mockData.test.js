import { describe, it, expect } from 'vitest'
import { DEMO_STOCKS, getStock, getSignalGroups } from '@/mocks/stocks'
import { getForecast, DEMO_FORECASTS } from '@/mocks/forecasts'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { classifySignal } from '@/lib/signals'

describe('DEMO_STOCKS', () => {
  it('contains 11 stocks', () => {
    expect(DEMO_STOCKS).toHaveLength(11)
  })

  it('all stocks have required fields', () => {
    for (const s of DEMO_STOCKS) {
      expect(s.ticker).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(typeof s.mockPrice).toBe('number')
      expect(typeof s.mockReturn).toBe('number')
      expect(['BULLISH', 'NEUTRAL', 'BEARISH']).toContain(s.mockSignal)
    }
  })

  it('mockSignal is consistent with mockReturn via classifySignal', () => {
    for (const s of DEMO_STOCKS) {
      expect(classifySignal(s.mockReturn)).toBe(s.mockSignal)
    }
  })

  it('getStock finds by ticker (case insensitive)', () => {
    expect(getStock('aapl')?.ticker).toBe('AAPL')
    expect(getStock('AAPL')?.ticker).toBe('AAPL')
    expect(getStock('invalid')).toBeUndefined()
  })
})

describe('DEMO_FORECASTS', () => {
  it('each forecast has a valid predicted close', () => {
    for (const f of DEMO_FORECASTS) {
      const expected = +(f.lastObservedClose * (1 + f.predictedReturn)).toFixed(2)
      expect(f.predictedClose).toBe(expected)
    }
  })

  it('forecast signal matches predicted return', () => {
    for (const f of DEMO_FORECASTS) {
      expect(classifySignal(f.predictedReturn)).toBe(f.signal)
    }
  })

  it('getForecast returns correct entry', () => {
    const f = getForecast('AAPL')
    expect(f?.ticker).toBe('AAPL')
    expect(getForecast('INVALID')).toBeNull()
  })
})

describe('OHLCV generation', () => {
  it('generates 504 rows by default', () => {
    const rows = getOHLCV('AAPL')
    expect(rows.length).toBe(504)
  })

  it('rows have valid OHLCV structure', () => {
    const rows = getOHLCV('MSFT')
    for (const r of rows.slice(0, 5)) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.high).toBeGreaterThanOrEqual(r.low)
      expect(r.close).toBeGreaterThan(0)
      expect(r.volume).toBeGreaterThan(0)
    }
  })

  it('is deterministic — same ticker returns same values', () => {
    const a = getOHLCV('NVDA')
    const b = getOHLCV('NVDA')
    expect(a[0]).toEqual(b[0])
    expect(a[503]).toEqual(b[503])
  })

  it('filterByRange narrows the series', () => {
    const rows = getOHLCV('SPY')
    const year = filterByRange(rows, '1Y')
    const month = filterByRange(rows, '1M')
    expect(year.length).toBeGreaterThan(month.length)
    expect(month.length).toBeGreaterThan(0)
  })
})

describe('getSignalGroups', () => {
  it('all groups together equal total stocks', () => {
    const { bullish, bearish, neutral } = getSignalGroups()
    expect(bullish.length + bearish.length + neutral.length).toBe(DEMO_STOCKS.length)
  })
})
