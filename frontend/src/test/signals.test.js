import { describe, it, expect } from 'vitest'
import {
  classifySignal,
  signalLabel,
  signalSymbol,
  formatReturn,
  SIGNAL,
  SIGNAL_THRESHOLD,
} from '@/lib/signals'

describe('classifySignal', () => {
  it('returns BULLISH for return above +0.5%', () => {
    expect(classifySignal(0.006)).toBe(SIGNAL.BULLISH)
    expect(classifySignal(0.05)).toBe(SIGNAL.BULLISH)
    expect(classifySignal(0.1)).toBe(SIGNAL.BULLISH)
  })

  it('returns BEARISH for return below -0.5%', () => {
    expect(classifySignal(-0.006)).toBe(SIGNAL.BEARISH)
    expect(classifySignal(-0.05)).toBe(SIGNAL.BEARISH)
    expect(classifySignal(-0.1)).toBe(SIGNAL.BEARISH)
  })

  it('returns NEUTRAL for return exactly at +0.5% boundary', () => {
    expect(classifySignal(SIGNAL_THRESHOLD)).toBe(SIGNAL.NEUTRAL)
    expect(classifySignal(0.005)).toBe(SIGNAL.NEUTRAL)
  })

  it('returns NEUTRAL for return exactly at -0.5% boundary', () => {
    expect(classifySignal(-SIGNAL_THRESHOLD)).toBe(SIGNAL.NEUTRAL)
    expect(classifySignal(-0.005)).toBe(SIGNAL.NEUTRAL)
  })

  it('returns NEUTRAL for zero', () => {
    expect(classifySignal(0)).toBe(SIGNAL.NEUTRAL)
  })

  it('returns NEUTRAL for NaN', () => {
    expect(classifySignal(NaN)).toBe(SIGNAL.NEUTRAL)
  })

  it('returns NEUTRAL for non-number', () => {
    expect(classifySignal('0.01')).toBe(SIGNAL.NEUTRAL)
    expect(classifySignal(null)).toBe(SIGNAL.NEUTRAL)
    expect(classifySignal(undefined)).toBe(SIGNAL.NEUTRAL)
  })

  it('uses strict greater/less than (not >=/>= )', () => {
    // Just above threshold = BULLISH
    expect(classifySignal(0.00501)).toBe(SIGNAL.BULLISH)
    // Just below threshold = BEARISH
    expect(classifySignal(-0.00501)).toBe(SIGNAL.BEARISH)
  })
})

describe('signalLabel', () => {
  it('returns correct label for each signal', () => {
    expect(signalLabel(SIGNAL.BULLISH)).toBe('Bullish')
    expect(signalLabel(SIGNAL.BEARISH)).toBe('Bearish')
    expect(signalLabel(SIGNAL.NEUTRAL)).toBe('Neutral')
  })

  it('returns Unknown for unknown signal', () => {
    expect(signalLabel('UNKNOWN')).toBe('Unknown')
  })
})

describe('signalSymbol', () => {
  it('returns directional symbols', () => {
    expect(signalSymbol(SIGNAL.BULLISH)).toBe('↑')
    expect(signalSymbol(SIGNAL.BEARISH)).toBe('↓')
    expect(signalSymbol(SIGNAL.NEUTRAL)).toBe('→')
  })
})

describe('formatReturn', () => {
  it('formats positive return with + sign', () => {
    expect(formatReturn(0.012)).toBe('+1.20%')
  })

  it('formats negative return with - sign', () => {
    expect(formatReturn(-0.012)).toBe('-1.20%')
  })

  it('formats zero', () => {
    expect(formatReturn(0)).toBe('+0.00%')
  })

  it('returns — for non-number', () => {
    expect(formatReturn(null)).toBe('—')
    expect(formatReturn(undefined)).toBe('—')
    expect(formatReturn(NaN)).toBe('—')
  })

  it('respects decimals parameter', () => {
    expect(formatReturn(0.01234, 4)).toBe('+1.2340%')
  })
})
