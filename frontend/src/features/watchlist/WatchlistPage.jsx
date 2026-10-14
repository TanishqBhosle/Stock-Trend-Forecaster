import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Search } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useToast } from '@/components/ui/Toast'
import { DEMO_STOCKS, getStock } from '@/mocks/stocks'
import { formatPrice, formatReturn } from '@/lib/signals'
import './WatchlistPage.css'

export default function WatchlistPage() {
  const { tickers, add, remove } = useWatchlist()
  const { addToast } = useToast()
  const [addQuery, setAddQuery] = useState('')
  const [filterQuery, setFilterQuery] = useState('')

  const availableTickers = DEMO_STOCKS
    .filter(s => s.ticker !== '^GSPC')
    .map(s => s.ticker)

  const suggestions = addQuery
    ? availableTickers.filter(t =>
        t.toLowerCase().includes(addQuery.toLowerCase()) &&
        !tickers.includes(t)
      ).slice(0, 5)
    : []

  const handleAdd = (ticker) => {
    if (tickers.includes(ticker)) {
      addToast(`${ticker} is already in your watchlist`, { type: 'warning' })
      return
    }
    add(ticker)
    addToast(`${ticker} added to watchlist`, { type: 'success' })
    setAddQuery('')
  }

  const handleRemove = (ticker) => {
    remove(ticker)
    addToast(`${ticker} removed from watchlist`, { type: 'info' })
  }

  const watchlistStocks = tickers
    .map(t => getStock(t))
    .filter(Boolean)
    .filter(s => !filterQuery || s.ticker.toLowerCase().includes(filterQuery.toLowerCase()) || s.name.toLowerCase().includes(filterQuery.toLowerCase()))

  return (
    <div className="watchlist-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Watchlist</h1>
          <p className="page-subtitle">{tickers.length} ticker{tickers.length !== 1 ? 's' : ''}</p>
        </div>
        <DataProvenanceLabel type="demo" />
      </div>

      {/* Add ticker */}
      <div className="watchlist-add-wrap">
        <div className="watchlist-add-input-wrap">
          <Input
            id="add-ticker"
            placeholder="Add a ticker (e.g. AAPL)…"
            iconLeft={<Plus size={14} />}
            value={addQuery}
            onChange={e => setAddQuery(e.target.value.toUpperCase())}
            onKeyDown={e => {
              if (e.key === 'Enter' && addQuery) {
                const match = availableTickers.find(t => t === addQuery)
                if (match) handleAdd(match)
                else addToast(`"${addQuery}" is not in the demo dataset`, { type: 'error' })
              }
            }}
            fullWidth={false}
            aria-label="Add ticker to watchlist"
          />
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.ul
                className="watchlist-suggestions"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                role="listbox"
                aria-label="Ticker suggestions"
              >
                {suggestions.map(t => {
                  const s = getStock(t)
                  return (
                    <li key={t} role="option">
                      <button className="suggestion-item" onClick={() => handleAdd(t)}>
                        <span className="suggestion-ticker">{t}</span>
                        <span className="suggestion-name">{s?.name}</span>
                      </button>
                    </li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filter */}
      {tickers.length > 0 && (
        <Input
          id="wl-filter"
          placeholder="Filter watchlist…"
          iconLeft={<Search size={14} />}
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          fullWidth={false}
          className="watchlist-filter"
        />
      )}

      {tickers.length === 0 ? (
        <EmptyState
          illustration="watchlist"
          title="Your watchlist is empty"
          description="Add demo tickers to track their signals and forecasts in one place."
          actionLabel="Browse stocks"
          onAction={() => window.location.href = '/app/stocks'}
        />
      ) : watchlistStocks.length === 0 ? (
        <EmptyState
          illustration="search"
          title="No matches"
          description="Clear the filter to see all watched tickers."
          actionLabel="Clear"
          onAction={() => setFilterQuery('')}
        />
      ) : (
        <div className="watchlist-table-wrap">
          <table className="watchlist-table" aria-label="Watchlist">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>Price</th>
                <th>Day change</th>
                <th>Forecast return</th>
                <th>Signal</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <AnimatePresence initial={false}>
              <tbody>
                {watchlistStocks.map(s => (
                  <motion.tr
                    key={s.ticker}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <td><Link to={`/app/stocks/${s.ticker}`} className="wl-ticker-link">{s.ticker}</Link></td>
                    <td className="wl-name">{s.name}</td>
                    <td>{formatPrice(s.mockPrice)}</td>
                    <td className={s.mockChangePct >= 0 ? 'pos' : 'neg'}>
                      {s.mockChangePct >= 0 ? '↑' : '↓'} {Math.abs(s.mockChangePct).toFixed(2)}%
                    </td>
                    <td className={s.mockReturn >= 0 ? 'pos' : 'neg'}>{formatReturn(s.mockReturn)}</td>
                    <td><SignalBadge signal={s.mockSignal} size="sm" /></td>
                    <td>
                      <button
                        className="wl-remove-btn"
                        onClick={() => handleRemove(s.ticker)}
                        aria-label={`Remove ${s.ticker} from watchlist`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </AnimatePresence>
          </table>
        </div>
      )}
    </div>
  )
}
