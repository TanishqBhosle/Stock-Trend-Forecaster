import { DataProvenanceLabel } from '@/components/ui/Badge'
import { MODEL_CONFIG } from '@/mocks/model'
import './ScientistPages.css'

const COLUMNS = [
  { name: 'Date', type: 'datetime', description: 'Trading date' },
  { name: 'Open', type: 'float64', description: 'Opening price (USD)' },
  { name: 'High', type: 'float64', description: 'Intraday high price (USD)' },
  { name: 'Low', type: 'float64', description: 'Intraday low price (USD)' },
  { name: 'Close', type: 'float64', description: 'Closing price (USD)' },
  { name: 'Adj Close', type: 'float64', description: 'Adjusted closing price (USD)' },
  { name: 'Volume', type: 'int64', description: 'Daily trading volume. Zero for ~5,500 pre-1950s rows.' },
]

export default function DatasetPage() {
  const ds = MODEL_CONFIG.dataset
  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Dataset Explorer</h1>
          <p className="page-subtitle">S&P 500 OHLCV dataset metadata</p>
        </div>
        <DataProvenanceLabel type="pending">Metadata from project README</DataProvenanceLabel>
      </div>

      <section className="sci-section">
        <h2 className="sci-section-title">Dataset overview</h2>
        <div className="dataset-meta-grid">
          {[
            ['Source', ds.source],
            ['File', ds.file],
            ['Total rows', ds.rows.toLocaleString()],
            ['Date range', ds.dateRange],
            ['Missing values', String(ds.missingValues)],
            ['Duplicates', String(ds.duplicates)],
          ].map(([label, value]) => (
            <div key={label} className="dataset-meta-item">
              <span className="ds-label">{label}</span>
              <span className="ds-value">{value}</span>
            </div>
          ))}
        </div>
        <p className="sci-note" style={{marginTop:'var(--space-4)'}}>{ds.noteVolume}</p>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Columns ({COLUMNS.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="col-table" aria-label="Dataset columns">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map(col => (
                <tr key={col.name}>
                  <td className="col-name">{col.name}</td>
                  <td style={{ color: 'var(--teal)' }}>{col.type}</td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{col.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Engineered features</h2>
        <p className="sci-note">9 stationary features derived from OHLCV data. Raw prices are not used as inputs.</p>
        <table className="col-table" aria-label="Engineered features">
          <thead><tr><th>Feature</th><th>Formula</th><th>Purpose</th></tr></thead>
          <tbody>
            {MODEL_CONFIG.features.map(f => (
              <tr key={f.name}>
                <td className="col-name">{f.name}</td>
                <td><code style={{ color:'var(--teal)', fontSize:'var(--text-xs)' }}>{f.formula}</code></td>
                <td style={{ color:'var(--text-secondary)', fontFamily:'var(--font-ui)' }}>{f.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Target definition</h2>
        <div className="mc-row">
          <span className="mc-label">Target name</span>
          <span className="mc-value">{MODEL_CONFIG.target.name}</span>
        </div>
        <div className="mc-row">
          <span className="mc-label">Formula</span>
          <span className="mc-value"><code>{MODEL_CONFIG.target.formula}</code></span>
        </div>
        <div className="mc-row">
          <span className="mc-label">Price recovery</span>
          <span className="mc-value"><code>{MODEL_CONFIG.target.priceRecovery}</code></span>
        </div>
        <p className="sci-note">{MODEL_CONFIG.target.note}</p>
      </section>
    </div>
  )
}
