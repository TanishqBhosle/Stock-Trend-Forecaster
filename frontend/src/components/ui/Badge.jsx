import { classifySignal, signalLabel, signalSymbol } from '@/lib/signals'
import './Badge.css'

/**
 * Generic badge component.
 * @param {'default'|'success'|'warning'|'error'|'info'|'muted'} [props.variant='default']
 * @param {'sm'|'md'} [props.size='md']
 */
export function Badge({ variant = 'default', size = 'md', children, className = '' }) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`}>
      {children}
    </span>
  )
}

/**
 * Signal badge showing BULLISH / NEUTRAL / BEARISH with directional symbol.
 * Always uses symbol + text so color is never the sole signal indicator.
 *
 * @param {object} props
 * @param {'BULLISH'|'NEUTRAL'|'BEARISH'} [props.signal]
 * @param {number} [props.predictedReturn] - if signal not provided, will classify from this
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.showSymbol=true]
 */
export function SignalBadge({ signal, predictedReturn, size = 'md', showSymbol = true }) {
  const resolved = signal ?? (predictedReturn !== undefined ? classifySignal(predictedReturn) : 'NEUTRAL')
  const label = signalLabel(resolved)
  const sym   = signalSymbol(resolved)
  const variant = resolved.toLowerCase() // 'bullish' | 'neutral' | 'bearish'

  return (
    <span
      className={`signal-badge signal-badge-${variant} signal-badge-${size}`}
      role="status"
      aria-label={`${label} signal`}
    >
      {showSymbol && <span aria-hidden="true">{sym}</span>}
      {label}
    </span>
  )
}

/**
 * Data provenance label — identifies mock/demo/unavailable data.
 * @param {'demo'|'illustrative'|'unavailable'|'pending'} [props.type='demo']
 */
export function DataProvenanceLabel({ type = 'demo', children, className = '' }) {
  const labels = {
    demo:        'Demo data',
    illustrative:'Illustrative',
    unavailable: 'Unavailable',
    pending:     'Backend integration pending',
  }
  return (
    <span className={`provenance-label provenance-${type} ${className}`}>
      {children || labels[type]}
    </span>
  )
}
