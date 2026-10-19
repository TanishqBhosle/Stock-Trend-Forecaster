import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Info } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { DEMO_STOCKS } from '@/mocks/stocks'
import { fetchStocks } from '@/services/stockService'
import { formatPrice, formatReturn } from '@/lib/signals'
import './StocksPage.css'

const SIGNAL_FILTERS = ['ALL', 'BULLISH', 'NEUTRAL', 'BEARISH']
const TYPE_FILTERS = ['ALL', 'CORE INDEX']

export default function StocksPage() {
  const [query, setQuery] = useState('')
  const [signalFilter, setSignalFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  const [stockList, setStockList] = useState(DEMO_STOCKS)

  useEffect(() => {
    let mounted = true
    fetchStocks().then(res => {
      if (mounted && res && res.length > 0) setStockList(res)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let stocks = [...stockList]

    if (query) {
      const q = query.toLowerCase()
      stocks = stocks.filter(s =>
        s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      )
    }
    if (typeFilter === 'CORE INDEX') {
      stocks = stocks.filter(s => s.isPrimaryModelAsset || s.sector === 'Index' || s.ticker === '^GSPC')
    }
    if (signalFilter !== 'ALL') {
      stocks = stocks.filter(s => (s.latestSignal || s.mockSignal) === signalFilter)
    }
    stocks = [...stocks].sort((a, b) => {
      // Keep ^GSPC on top if sorting by ticker or default
      if (sortBy === 'ticker') {
        if (a.ticker === '^GSPC') return -1
        if (b.ticker === '^GSPC') return 1
        const cmp = a.ticker.localeCompare(b.ticker)
        return sortDir === 'asc' ? cmp : -cmp
      }
      let av, bv
      if (sortBy === 'price') { av = a.currentPrice || a.mockPrice; bv = b.currentPrice || b.mockPrice }
      else { av = a.predictedReturn ?? a.mockReturn; bv = b.predictedReturn ?? b.mockReturn }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return stocks
  }, [stockList, query, signalFilter, typeFilter, sortBy, sortDir])

  return (
    <div className="stocks-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Supported Instruments &amp; Catalog</h1>
          <p className="page-subtitle">Available financial series, primary model targets, and demo equities</p>
        </div>
        <DataProvenanceLabel type="demo" />
      </div>

      {/* Scope banner */}
      <div className="stocks-scope-callout">
        <Info size={16} className="callout-icon" />
        <p className="callout-text">
          <strong>Model Scope &amp; Provenance:</strong> The ArthNex 2-layer stacked LSTM neural forecaster is trained strictly on <strong>S&amp;P 500 (^GSPC)</strong> daily time-series data. The 10 individual stock equities listed below are deterministic educational previews to demonstrate multi-ticker interface workflows.
        </p>
      </div>

      <div className="stocks-controls">
        <Input
          id="stock-search"
          placeholder="Search ticker or company name…"
          iconLeft={<Search size={14} />}
          value={query}
          onChange={e => setQuery(e.target.value)}
          fullWidth={false}
        />

        <div className="filter-group-wrap">
          <div className="signal-filter-group" role="group" aria-label="Filter by instrument category">
            {TYPE_FILTERS.map(tf => (
              <button
                key={tf}
                className={`signal-filter-btn ${typeFilter === tf ? 'active' : ''}`}
                onClick={() => setTypeFilter(tf)}
                aria-pressed={typeFilter === tf}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="signal-filter-group" role="group" aria-label="Filter by signal">
            {SIGNAL_FILTERS.map(f => (
              <button
                key={f}
                className={`signal-filter-btn ${signalFilter === f ? 'active' : ''} ${f.toLowerCase()}`}
                onClick={() => setSignalFilter(f)}
                aria-pressed={signalFilter === f}
              >
                {f === 'ALL' ? 'All Signals' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="search"
          title="No matching instruments"
          description="Try a different search term or clear the active filters."
          actionLabel="Clear all filters"
          onAction={() => { setQuery(''); setSignalFilter('ALL'); setTypeFilter('ALL') }}
        />
      ) : (
        <div className="stocks-table-wrap">
          <table className="stocks-table" aria-label="Supported instruments catalog">
            <thead>
              <tr>
                {[
                  { key: 'ticker', label: 'Ticker' },
                  { key: 'name', label: 'Instrument / Name' },
                  { key: 'type', label: 'Classification' },
                  { key: 'price', label: 'Price' },
                  { key: 'change', label: '1D Change' },
                  { key: 'return', label: 'Forecast Return' },
                  { key: 'signal', label: 'Trend Signal' },
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
              {filtered.map(s => {
                const isGspc = s.ticker === '^GSPC'
                return (
                  <tr key={s.ticker} className={`stocks-row ${isGspc ? 'primary-model-row' : ''}`}>
                    <td className="stocks-ticker">
                      <Link to={`/app/stocks/${s.ticker}`}>{s.ticker}</Link>
                    </td>
                    <td className="stocks-name">
                      <div className="stocks-name-cell">
                        <span>{s.name}</span>
                        <span className="stocks-sector-tag">{s.sector} · {s.exchange}</span>
                      </div>
                    </td>
                    <td>
                      {isGspc ? (
                        <span className="tag-core-asset">Primary Model Target</span>
                      ) : (
                        <span className="tag-demo-asset">Illustrative Demo</span>
                      )}
                    </td>
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
                        Research →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
