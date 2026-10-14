import { Button } from './Button'
import './EmptyState.css'

/**
 * Empty state with optional inline SVG illustration and action.
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.actionLabel]
 * @param {Function} [props.onAction]
 * @param {'watchlist'|'stocks'|'search'|'generic'} [props.illustration='generic']
 */
export function EmptyState({ title, description, actionLabel, onAction, illustration = 'generic' }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-illustration" aria-hidden="true">
        {illustrations[illustration]}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

/**
 * Error state component.
 */
export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="empty-state error-state" role="alert">
      <div className="empty-state-illustration" aria-hidden="true">
        {illustrations.error}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** Inline SVG illustrations using the product palette */
const illustrations = {
  generic: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="8" y="20" width="48" height="32" rx="3" stroke="var(--mist)" strokeWidth="1.5"/>
      <path d="M16 44 L24 32 L32 38 L42 26 L52 36" stroke="var(--mist)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="42" cy="26" r="3" fill="var(--amber)" fillOpacity="0.6"/>
      <path d="M14 20 L14 16 M32 20 L32 14 M50 20 L50 16" stroke="var(--mist)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  watchlist: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="10" width="44" height="44" rx="3" stroke="var(--mist)" strokeWidth="1.5"/>
      <path d="M32 22 L34.8 28.6 L42 28.6 L36.6 33 L38.6 39.6 L32 35.4 L25.4 39.6 L27.4 33 L22 28.6 L29.2 28.6 Z" stroke="var(--amber)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M18 48 L46 48" stroke="var(--mist)" strokeWidth="1" strokeDasharray="3 3"/>
    </svg>
  ),
  search: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="28" cy="28" r="14" stroke="var(--mist)" strokeWidth="1.5"/>
      <path d="M38 38 L52 52" stroke="var(--mist)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22 28 L34 28 M28 22 L28 34" stroke="var(--mist)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  error: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="22" stroke="var(--bearish)" strokeWidth="1.5" strokeOpacity="0.5"/>
      <path d="M32 20 L32 34" stroke="var(--bearish)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="42" r="2" fill="var(--bearish)" fillOpacity="0.7"/>
    </svg>
  ),
  stocks: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="8" y="8" width="48" height="48" rx="3" stroke="var(--mist)" strokeWidth="1.5"/>
      <path d="M16 40 L24 28 L32 34 L42 20 L52 30" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7"/>
      <path d="M42 20 L52 30" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2"/>
    </svg>
  ),
}
