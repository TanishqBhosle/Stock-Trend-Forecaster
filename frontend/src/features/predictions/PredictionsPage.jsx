import { useState, useMemo, useEffect } from 'react'
import { Search } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { DEMO_PREDICTIONS } from '@/mocks/predictions'
import { fetchPredictions } from '@/services/stockService'
import { formatReturn } from '@/lib/signals'
import './PredictionsPage.css'

const PAGE_SIZE = 20
const SIGNALS = ['ALL', 'BULLISH', 'NEUTRAL', 'BEARISH']

export default function PredictionsPage() {
  const [query, setQuery] = useState('')
  const [signalFilter, setSignalFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState('predictionDate')
  const [sortDir, setSortDir] = useState('desc')
  const [liveRecords, setLiveRecords] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadLivePredictions() {
      try {
        const res = await fetchPredictions({
          ticker: query || undefined,
          signal: signalFilter !== 'ALL' ? signalFilter : undefined,
          page,
          pageSize: 50
        })
        if (mounted && res && res.records && res.records.length > 0) {
          setLiveRecords(res.records)
        }
      } catch (err) {
        console.warn('Error loading live predictions:', err)
      }
    }
    loadLivePredictions()
    return () => { mounted = false }
  }, [query, signalFilter, page])

  const filtered = useMemo(() => {
    let records = liveRecords || [...DEMO_PREDICTIONS]
    if (query) {
      const q = query.toLowerCase()
      records = records.filter(r => r.ticker.toLowerCase().includes(q))
    }
    if (signalFilter !== 'ALL') {
      records = records.filter(r => r.predictedDirection === signalFilter)
    }
    records.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return records
  }, [query, signalFilter, sortKey, sortDir, liveRecords])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const page_records = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className="predictions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Prediction History</h1>
          <p className="page-subtitle">{filtered.length} records</p>
        </div>
        <DataProvenanceLabel type={liveRecords ? 'verified' : 'illustrative'}>
          {liveRecords ? 'Verified Prediction Records' : 'Illustrative Log'}
        </DataProvenanceLabel>
      </div>

      <div className="predictions-controls">
        <Input
          id="pred-search"
          placeholder="Filter by ticker…"
          iconLeft={<Search size={14} />}
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1) }}
          fullWidth={false}
        />
        <div className="signal-filter-group" role="group">
          {SIGNALS.map(f => (
            <button key={f} className={`signal-filter-btn ${signalFilter === f ? 'active' : ''} ${f.toLowerCase()}`} onClick={() => { setSignalFilter(f); setPage(1) }} aria-pressed={signalFilter === f}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {page_records.length === 0 ? (
        <EmptyState illustration="search" title="No records" description="No predictions match the current filters." actionLabel="Clear" onAction={() => { setQuery(''); setSignalFilter('ALL') }} />
      ) : (
        <>
          <div className="predictions-table-wrap">
            <table className="predictions-table" aria-label="Prediction history">
              <thead>
                <tr>
                  {[
                    { key: 'predictionDate', label: 'Date' },
                    { key: 'ticker', label: 'Ticker' },
                    { key: 'predictedDirection', label: 'Direction' },
                    { key: 'predictedReturn', label: 'Pred. return' },
                    { key: 'actualReturn', label: 'Actual return' },
                    { key: 'correct', label: 'Correct' },
                    { key: 'modelVersion', label: 'Model' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} className="sortable" aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page_records.map(r => (
                  <tr key={r.id} className="pred-row">
                    <td>{r.predictionDate}</td>
                    <td className="pred-ticker">{r.ticker}</td>
                    <td><SignalBadge signal={r.predictedDirection} size="sm" /></td>
                    <td className={r.predictedReturn >= 0 ? 'pos' : 'neg'}>{formatReturn(r.predictedReturn)}</td>
                    <td className={r.actualReturn >= 0 ? 'pos' : 'neg'}>{formatReturn(r.actualReturn)}</td>
                    <td className={r.correct ? 'pred-correct' : 'pred-incorrect'}>
                      {r.correct === true ? '✓' : r.correct === false ? '✗' : '—'}
                    </td>
                    <td className="pred-model">{r.modelVersion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pred-pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="pred-page-btn">← Prev</button>
            <span className="pred-page-info">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="pred-page-btn">Next →</button>
          </div>
        </>
      )}
    </div>
  )
}
