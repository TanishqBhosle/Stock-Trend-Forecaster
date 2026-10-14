import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { DEMO_EXPERIMENTS } from '@/mocks/experiments'
import './ScientistPages.css'

export default function ExperimentsPage() {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('rmse')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let exps = [...DEMO_EXPERIMENTS]
    if (query) {
      const q = query.toLowerCase()
      exps = exps.filter(e => e.name.toLowerCase().includes(q) || e.id.includes(q))
    }
    exps.sort((a, b) => {
      const av = a[sortKey] ?? 999, bv = b[sortKey] ?? 999
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return exps
  }, [query, sortKey, sortDir])

  const bestRmse = Math.min(...DEMO_EXPERIMENTS.filter(e => e.rmse).map(e => e.rmse))

  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Experiments</h1>
          <p className="page-subtitle">{DEMO_EXPERIMENTS.length} illustrative experiment records</p>
        </div>
        <DataProvenanceLabel type="illustrative" />
      </div>

      <div className="sci-alert"><strong>Illustrative records.</strong> These are demo experiment logs for interface demonstration. No real training runs are represented.</div>

      <Input id="exp-search" placeholder="Search by name or ID…" iconLeft={<Search size={14} />} value={query} onChange={e => setQuery(e.target.value)} fullWidth={false} style={{ marginBottom: 'var(--space-4)' }} />

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <table className="exp-table" aria-label="Experiment records">
          <thead>
            <tr>
              {[
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Name' },
                { key: 'architecture', label: 'Architecture' },
                { key: 'hiddenSize', label: 'Hidden' },
                { key: 'numLayers', label: 'Layers' },
                { key: 'lookback', label: 'Lookback' },
                { key: 'dropout', label: 'Dropout' },
                { key: 'rmse', label: 'RMSE' },
                { key: 'mae', label: 'MAE' },
                { key: 'directionalAccuracy', label: 'Dir. acc.' },
                { key: 'version', label: 'Version' },
              ].map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className={e.rmse === bestRmse ? 'exp-highlight' : ''}>
                <td><Link to={`/scientist/experiments/${e.id}`} className="exp-id">{e.id}</Link></td>
                <td>{e.name}</td>
                <td>{e.architecture}</td>
                <td>{e.hiddenSize ?? '—'}</td>
                <td>{e.numLayers ?? '—'}</td>
                <td>{e.lookback}</td>
                <td>{e.dropout ?? '—'}</td>
                <td>{e.rmse?.toFixed(2) ?? '—'}</td>
                <td>{e.mae?.toFixed(2) ?? '—'}</td>
                <td>{e.directionalAccuracy != null ? `${(e.directionalAccuracy * 100).toFixed(1)}%` : '—'}</td>
                <td>{e.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
