/**
 * Signal classification utilities.
 * Source of truth for BULLISH / NEUTRAL / BEARISH thresholds.
 *
 * Thresholds verified from project README:
 *   Bullish:  return > +0.5%
 *   Neutral: -0.5% <= return <= +0.5%
 *   Bearish:  return < -0.5%
 */

/** @typedef {'BULLISH' | 'NEUTRAL' | 'BEARISH'} SignalType */

export const SIGNAL = {
  BULLISH: 'BULLISH',
  NEUTRAL: 'NEUTRAL',
  BEARISH: 'BEARISH',
}

export const SIGNAL_THRESHOLD = 0.005 // 0.5%

/**
 * Classify a predicted return into a trend signal.
 * @param {number} predictedReturn - e.g. 0.012 for +1.2%
 * @returns {SignalType}
 */
export function classifySignal(predictedReturn) {
  if (typeof predictedReturn !== 'number' || isNaN(predictedReturn)) {
    return SIGNAL.NEUTRAL
  }
  if (predictedReturn > SIGNAL_THRESHOLD) return SIGNAL.BULLISH
  if (predictedReturn < -SIGNAL_THRESHOLD) return SIGNAL.BEARISH
  return SIGNAL.NEUTRAL
}

/**
 * Map a signal to a display label.
 * @param {SignalType} signal
 * @returns {string}
 */
export function signalLabel(signal) {
  const labels = {
    [SIGNAL.BULLISH]: 'Bullish',
    [SIGNAL.BEARISH]: 'Bearish',
    [SIGNAL.NEUTRAL]: 'Neutral',
  }
  return labels[signal] ?? 'Unknown'
}

/**
 * Map a signal to a Unicode directional symbol (not emoji).
 * @param {SignalType} signal
 * @returns {string}
 */
export function signalSymbol(signal) {
  const symbols = {
    [SIGNAL.BULLISH]: '↑',
    [SIGNAL.BEARISH]: '↓',
    [SIGNAL.NEUTRAL]: '→',
  }
  return symbols[signal] ?? '—'
}

/**
 * Map a signal to the CSS custom property name for its color.
 * @param {SignalType} signal
 * @returns {string}
 */
export function signalColorVar(signal) {
  const vars = {
    [SIGNAL.BULLISH]: 'var(--bullish)',
    [SIGNAL.BEARISH]: 'var(--bearish)',
    [SIGNAL.NEUTRAL]: 'var(--neutral)',
  }
  return vars[signal] ?? 'var(--text-secondary)'
}

/**
 * Format a return value as a percentage string with sign.
 * @param {number} value - e.g. 0.012
 * @param {number} [decimals=2]
 * @returns {string} e.g. "+1.20%"
 */
export function formatReturn(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) return '—'
  const pct = (value * 100).toFixed(decimals)
  return value >= 0 ? `+${pct}%` : `${pct}%`
}

/**
 * Format a price value.
 * @param {number} value
 * @param {string} [currency='USD']
 * @returns {string}
 */
export function formatPrice(value, currency = 'USD') {
  if (typeof value !== 'number' || isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format a large number with commas.
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (typeof value !== 'number' || isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US').format(value)
}
