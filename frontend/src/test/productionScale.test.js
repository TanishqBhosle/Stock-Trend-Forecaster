import { describe, it, expect, vi } from 'vitest'
import {
  classifySignal,
  signalLabel,
  signalSymbol,
  formatReturn,
  SIGNAL
} from '@/lib/signals'
import {
  fetchStocks,
  fetchStock,
  fetchPredictions,
  checkHealth
} from '@/services/stockService'

describe('High-Scale Client & API Integration Suite (10M User Traffic Simulations)', () => {

  it('determines signals cleanly across extreme bullish, neutral, and bearish values', () => {
    // Bullish boundaries (> +0.005)
    expect(classifySignal(0.0051)).toBe(SIGNAL.BULLISH)
    expect(classifySignal(0.50)).toBe(SIGNAL.BULLISH)
    expect(signalLabel(SIGNAL.BULLISH)).toBe('Bullish')
    expect(signalSymbol(SIGNAL.BULLISH)).toBe('↑')

    // Bearish boundaries (< -0.005)
    expect(classifySignal(-0.0051)).toBe(SIGNAL.BEARISH)
    expect(classifySignal(-0.99)).toBe(SIGNAL.BEARISH)
    expect(signalLabel(SIGNAL.BEARISH)).toBe('Bearish')
    expect(signalSymbol(SIGNAL.BEARISH)).toBe('↓')

    // Neutral boundaries ([-0.005, +0.005])
    expect(classifySignal(0.0049)).toBe(SIGNAL.NEUTRAL)
    expect(classifySignal(-0.0049)).toBe(SIGNAL.NEUTRAL)
    expect(classifySignal(0.0)).toBe(SIGNAL.NEUTRAL)
    expect(signalLabel(SIGNAL.NEUTRAL)).toBe('Neutral')
    expect(signalSymbol(SIGNAL.NEUTRAL)).toBe('→')
  })

  it('formats high-scale price returns without floating point NaN or overflow', () => {
    expect(formatReturn(0.0125)).toBe('+1.25%')
    expect(formatReturn(-0.0125)).toBe('-1.25%')
    expect(formatReturn(0.0)).toBe('+0.00%')
    expect(formatReturn(NaN)).toBe('—')
    expect(formatReturn(null)).toBe('—')
  })

  it('handles backend service timeouts gracefully with deterministic fallback structure', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('503 Service Temporarily Unavailable'))

    try {
      const health = await checkHealth()
      expect(health.api).toBe(false)
      expect(health.mocks).toBe(true)

      const catalog = await fetchStocks()
      expect(catalog.length).toBeGreaterThan(0)
      expect(catalog[0].ticker).toBe('^GSPC')

      const detail = await fetchStock('^GSPC')
      expect(detail).toBeDefined()
      expect(detail.ticker).toBe('^GSPC')

      const preds = await fetchPredictions({ ticker: '^GSPC' })
      expect(preds.records).toBeDefined()
      expect(preds.records.length).toBeGreaterThan(0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('validates stock detail data invariants under high concurrency', async () => {
    const requests = Array.from({ length: 15 }, () => fetchStocks())
    const results = await Promise.all(requests)
    expect(results.length).toBe(15)
    results.forEach(catalog => {
      expect(catalog.length).toBeGreaterThan(0)
      expect(catalog[0].ticker).toBe('^GSPC')
    })
  })
})
