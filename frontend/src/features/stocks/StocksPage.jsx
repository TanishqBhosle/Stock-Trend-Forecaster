import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { DEMO_STOCKS } from '@/mocks/stocks'
import { formatPrice, formatReturn } from '@/lib/signals'
import './StocksPage.css'

const SIGNAL_FILTERS = ['ALL', 'BULLISH', 'NEUTRAL', 'BEARISH']

export default function StocksPage() {
  const [query, setQuery] = useState('')
  const [signalFilter, setSignalFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let stocks = DEMO_STOCKS.filter(s => s.ticker !== '^GSPC')
    if (query) {
      const q = query.toLowerCase()
      stocks = stocks.filter(s =>
        s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      )
    }
    if (signalFilter !== 'ALL') {
      stocks = stocks.filter(s => s.mockSignal === signalFilter)
    }
    stocks = [...stocks].sort((a, b) => {
      let av, bv
      if (sortBy === 'ticker') { av = a.ticker; bv = b.ticker }
      else if (sortBy === 'price') { av = a.mockPrice; bv = b.mockPrice }
      else { av = a.mockReturn; bv = b.mockReturn }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return stocks
  }, [query, signalFilter, sortBy, sortDir])

  return (
    <div className="stocks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Explorer</h1>
          <p className="page-subtitle">Browse demo tickers and trend signals</p>
        </div>
        <DataProvenanceLabel type="demo" />
      </div>

      <div className="stocks-controls">
        <Input
          id="stock-search"
          placeholder="Search ticker or company…"
          iconLeft={<Search size={14} />}
          value={query}
          onChange={e => setQuery(e.target.value)}
          fullWidth={false}
        />
        <div className="signal-filter-group" role="group" aria-label="Filter by signal">
          {SIGNAL_FILTERS.map(f => (
            <button
              key={f}
              className={`signal-filter-btn ${signalFilter === f ? 'active' : ''} ${f.toLowerCase()}`}
              onClick={() => setSignalFilter(f)}
              aria-pressed={signalFilter === f}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="search"
          title="No matching stocks"
          description="Try a different search term or clear the signal filter."
          actionLabel="Clear filters"
          onAction={() => { setQuery(''); setSignalFilter('ALL') }}
        />
      ) : (
        <div className="stocks-table-wrap">
          <table className="stocks-table" aria-label="Stock list">
            <thead>
              <tr>
                {[
                  { key: 'ticker', label: 'Ticker' },
                  { key: 'name', label: 'Company' },
                  { key: 'price', label: 'Price' },
                  { key: 'change', label: 'Day change' },
                  { key: 'return', label: 'Forecast return' },
                  { key: 'signal', label: 'Signal' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => ['ticker','price','return'].includes(col.key) && handleSort(col.key)}
                    className={['ticker','price','return'].includes(col.key) ? 'sortable' : ''}
                    aria-sort={sortBy === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {col.label}
                    {sortBy === col.key && <span aria-hidden="true"> {sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.ticker} className="stocks-row">
                  <td className="stocks-ticker">
                    <Link to={`/app/stocks/${s.ticker}`}>{s.ticker}</Link>
                  </td>
                  <td className="stocks-name">{s.name}</td>
                  <td>{formatPrice(s.mockPrice)}</td>
                  <td className={s.mockChangePct >= 0 ? 'pos' : 'neg'}>
                    {s.mockChangePct >= 0 ? '↑' : '↓'} {Math.abs(s.mockChangePct).toFixed(2)}%
                  </td>
                  <td className={s.mockReturn >= 0 ? 'pos' : 'neg'}>
                    {formatReturn(s.mockReturn)}
                  </td>
                  <td><SignalBadge signal={s.mockSignal} size="sm" /></td>
                  <td>
                    <Link to={`/app/stocks/${s.ticker}`} className="stocks-detail-link">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
