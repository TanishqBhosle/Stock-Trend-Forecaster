/**
 * Date utilities for the Stock Trend Forecaster frontend.
 */

/**
 * Format a date string or Date object for display.
 * @param {string|Date} date
 * @param {'short'|'medium'|'long'} [style='medium']
 * @returns {string}
 */
export function formatDate(date, style = 'medium') {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const options = {
    short:  { month: 'short', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long:   { month: 'long', day: 'numeric', year: 'numeric' },
  }
  return new Intl.DateTimeFormat('en-US', options[style] || options.medium).format(d)
}

/**
 * Format a date as ISO yyyy-mm-dd.
 * @param {string|Date} date
 * @returns {string}
 */
export function toISODate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/**
 * Return a new Date offset by `days` from `baseDate`.
 * @param {Date} baseDate
 * @param {number} days
 * @returns {Date}
 */
export function addDays(baseDate, days) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Return start date for a named chart range relative to a reference date.
 * @param {'1M'|'3M'|'6M'|'1Y'|'MAX'} range
 * @param {Date} [referenceDate]
 * @returns {Date}
 */
export function rangeStartDate(range, referenceDate = new Date()) {
  const ref = new Date(referenceDate)
  const map = {
    '1M':  () => { ref.setMonth(ref.getMonth() - 1);  return ref },
    '3M':  () => { ref.setMonth(ref.getMonth() - 3);  return ref },
    '6M':  () => { ref.setMonth(ref.getMonth() - 6);  return ref },
    '1Y':  () => { ref.setFullYear(ref.getFullYear() - 1); return ref },
    'MAX': () => new Date('1990-01-01'),
  }
  return (map[range] || map['1Y'])()
}

/**
 * Check whether a date string falls within [start, end].
 * @param {string} dateStr
 * @param {Date} start
 * @param {Date} end
 * @returns {boolean}
 */
export function inDateRange(dateStr, start, end) {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

/**
 * Return a human-readable relative timestamp.
 * @param {string|Date} date
 * @returns {string}
 */
export function relativeTime(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24)  return `${diffHr}h ago`
  if (diffDay < 7)  return `${diffDay}d ago`
  return formatDate(d, 'short')
}
