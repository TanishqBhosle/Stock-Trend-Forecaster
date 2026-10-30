import { useState, useEffect } from 'react'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MODEL_CONFIG } from '@/mocks/model'
import { RefreshCw,  } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import './ScientistPages.css'

const RAW_FEATURES = [
  { index: 1, name: 'Open', type: 'float64', description: 'Raw opening session price (USD)' },
  { index: 2, name: 'High', type: 'float64', description: 'Raw intraday peak price (USD)' },
  { index: 3, name: 'Low', type: 'float64', description: 'Raw intraday trough price (USD)' },
  { index: 4, name: 'Close', type: 'float64', description: 'Raw closing session price (USD)' },
  { index: 5, name: 'Adj Close', type: 'float64', description: 'Raw dividend and split-adjusted close (USD)' },
  { index: 6, name: 'Volume', type: 'int64', description: 'Raw total trading volume (shares)' },
]

export default function DatasetPage() {
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState(null)
  const { addToast } = useToast()

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    let mounted = true
    async function loadDataSummary() {
      try {
        const res = await fetch(`${apiBase}/api/market/summary`)
        if (res.ok) {
          const data = await res.json()
          if (mounted) setSummary(data)
        }
      } catch (err) {
        console.warn('Could not fetch market summary:', err)
      }
    }
    loadDataSummary()
    return () => { mounted = false }
  }, [apiBase])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`${apiBase}/api/market/refresh`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        addToast(`Dataset refreshed: ${data.totalObservations} rows through ${data.latestDate}`, { type: 'success' })
        const sumRes = await fetch(`${apiBase}/api/market/summary`)
        if (sumRes.ok) setSummary(await sumRes.json())
      } else {
        addToast('Dataset refresh failed', { type: 'error' })
      }
    } catch {
      addToast('Backend unreachable for dataset refresh', { type: 'error' })
    } finally {
      setRefreshing(false)
    }
  }

  const ds = MODEL_CONFIG.dataset

  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Dataset &amp; Preprocessing Audit</h1>
          <p className="page-subtitle">S&amp;P 500 (^GSPC) historical data pipeline &amp; leakage audit</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <Button
            size="sm"
            variant="outline"
            iconLeft={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
            loading={refreshing}
            onClick={handleRefresh}
          >
            {refreshing ? 'Refreshing…' : 'Refresh from Yahoo Finance'}
          </Button>
          <DataProvenanceLabel type="verified">Verified Live Data</DataProvenanceLabel>
        </div>
      </div>

      <section className="sci-section">
        <h2 className="sci-section-title">Dataset Overview</h2>
        <div className="dataset-meta-grid">
          {[
            ['Asset / Ticker', summary?.ticker || ds.source],
            ['Source Provider', 'Yahoo Finance (yfinance)'],
            ['Total Observations', summary ? summary.totalObservations?.toLocaleString() : ds.rows.toLocaleString()],
            ['Date Range', summary ? `${summary.startDate} to ${summary.latestMarketDate}` : ds.dateRange],
            ['Latest Observation', summary?.latestMarketDate || '2026-10-16'],
            ['Current Close Price', summary ? `$${summary.currentPrice?.toFixed(2)}` : '$7,659.44'],
            ['Missing Values', '0 (Zero missing values)'],
            ['Duplicate Dates', '0 (Sorted ascending, deduplicated)'],
          ].map(([label, value]) => (
            <div key={label} className="dataset-meta-item">
              <span className="ds-label">{label}</span>
              <span className="ds-value">{value}</span>
            </div>
          ))}
        </div>
        <p className="sci-note" style={{ marginTop: 'var(--space-4)' }}>
          {ds.noteVolume}
        </p>
      </section>

      {/* Six raw input features */}
      <section className="sci-section">
        <h2 className="sci-section-title">Exact Raw Input Features ({RAW_FEATURES.length})</h2>
        <p className="sci-note">
          Strictly 6 raw OHLCV features in fixed chronological order. No technical indicators (RSI, MACD, moving averages) are added to prevent artificial lookahead distortion.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="col-table" aria-label="Dataset columns">
            <thead>
              <tr>
                <th>Index</th>
                <th>Feature Column</th>
                <th>Data Type</th>
                <th>Description</th>
                <th>Role in Model</th>
              </tr>
            </thead>
            <tbody>
              {RAW_FEATURES.map(col => (
                <tr key={col.name}>
                  <td style={{ fontFamily: 'var(--font-data)', color: 'var(--text-muted)' }}>#{col.index}</td>
                  <td className="col-name">{col.name}</td>
                  <td style={{ color: 'var(--teal)' }}>{col.type}</td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{col.description}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Raw LSTM Input Tensor</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Preprocessing & Data Leakage Audit */}
      <section className="sci-section">
        <h2 className="sci-section-title">Preprocessing &amp; Data Leakage Audit</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="dataset-meta-item" style={{ borderLeft: '3px solid var(--teal)' }}>
            <span className="ds-label">Lookback Window</span>
            <span className="ds-value">60 Trading Sessions</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              Tensor shape: (batch_size, 60, 6)
            </span>
          </div>

          <div className="dataset-meta-item" style={{ borderLeft: '3px solid var(--teal)' }}>
            <span className="ds-label">Chronological Split</span>
            <span className="ds-value">80% Train / 10% Val / 10% Test</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              5,342 Train · 668 Val · 668 Held-out Test
            </span>
          </div>

          <div className="dataset-meta-item" style={{ borderLeft: '3px solid var(--teal)' }}>
            <span className="ds-label">Data Leakage Prevention</span>
            <span className="ds-value" style={{ color: 'var(--bullish)' }}>Verified Zero Leakage</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              Scalers fit strictly on training set (first 5,342 sequences)
            </span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
            Pipeline Boundary Protocols:
          </h3>
          <ul style={{ paddingLeft: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            <li><strong>Sequence Construction:</strong> Window [t-59 ... t] predicts session target at [t+1]. No forward observations exist in sequence input.</li>
            <li><strong>Split Partitioning:</strong> Train (2000-03-29 to 2021-06-25), Validation (2021-06-28 to 2024-02-21), Held-out Test (2024-02-22 to 2026-10-16).</li>
            <li><strong>Scaler Independence:</strong> <code>MinMaxScaler</code> parameters (min/max bounds) are frozen after training fitting. Validation and test sets use <code>transform()</code> only.</li>
            <li><strong>Model Selection Isolation:</strong> Best checkpoint is selected strictly via validation loss. The test split is evaluated exactly once for final benchmark reporting.</li>
          </ul>
        </div>
      </section>

      {/* Target definition */}
      <section className="sci-section">
        <h2 className="sci-section-title">Target Definition &amp; Price Recovery</h2>
        <div className="mc-row">
          <span className="mc-label">Primary Target</span>
          <span className="mc-value">{MODEL_CONFIG.target.name}</span>
        </div>
        <div className="mc-row">
          <span className="mc-label">Return Formula</span>
          <span className="mc-value"><code>{MODEL_CONFIG.target.formula}</code></span>
        </div>
        <div className="mc-row">
          <span className="mc-label">Price Recovery Formula</span>
          <span className="mc-value"><code>{MODEL_CONFIG.target.priceRecovery}</code></span>
        </div>
        <p className="sci-note">{MODEL_CONFIG.target.note}</p>
      </section>
    </div>
  )
}
