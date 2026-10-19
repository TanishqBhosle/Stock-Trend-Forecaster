import { DataProvenanceLabel } from '@/components/ui/Badge'
import { MODEL_CONFIG } from '@/mocks/model'
import './ModelCardPage.css'

export default function ModelCardPage() {
  const m = MODEL_CONFIG
  return (
    <div className="model-card-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Model Card</h1>
          <p className="page-subtitle">Architecture, data configuration, and verified evaluation</p>
        </div>
        <DataProvenanceLabel type="verified">Verified PyTorch LSTM Model</DataProvenanceLabel>
      </div>

      <div className="mc-layout">
        <main className="mc-main">
          {/* Architecture */}
          <section className="mc-section">
            <h2 className="mc-section-title">Architecture</h2>
            <div className="mc-grid">
              {[
                { label: 'Model type', value: m.architecture },
                { label: 'Hidden size', value: m.hiddenSize },
                { label: 'Layers', value: m.numLayers },
                { label: 'Dropout', value: m.dropout },
                { label: 'Lookback window', value: `${m.lookback} trading days` },
                { label: 'Batch size', value: m.batchSize },
                { label: 'Optimizer', value: m.optimizer },
                { label: 'Loss function', value: m.lossFunction },
                { label: 'LR scheduler', value: m.lrScheduler },
                { label: 'Early stopping', value: m.earlyStopping },
                { label: 'Model version', value: m.version },
              ].map(item => (
                <div key={item.label} className="mc-row">
                  <span className="mc-label">{item.label}</span>
                  <span className="mc-value">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Input features */}
          <section className="mc-section">
            <h2 className="mc-section-title">Input features ({m.features.length})</h2>
            <p className="mc-note">Exactly six raw OHLCV features in chronological order. No technical indicators or feature engineering.</p>
            <table className="mc-table" aria-label="Input features">
              <thead><tr><th>Feature</th><th>Formula</th><th>Purpose</th></tr></thead>
              <tbody>
                {m.features.map(f => (
                  <tr key={f.name}>
                    <td className="mc-feature-name">{f.name}</td>
                    <td className="mc-feature-formula"><code>{f.formula}</code></td>
                    <td className="mc-feature-purpose">{f.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Target */}
          <section className="mc-section">
            <h2 className="mc-section-title">Prediction target</h2>
            <div className="mc-grid">
              <div className="mc-row"><span className="mc-label">Target name</span><span className="mc-value">{m.target.name}</span></div>
              <div className="mc-row"><span className="mc-label">Formula</span><span className="mc-value font-data"><code>{m.target.formula}</code></span></div>
              <div className="mc-row"><span className="mc-label">Price recovery</span><span className="mc-value font-data"><code>{m.target.priceRecovery}</code></span></div>
            </div>
            <p className="mc-note">{m.target.note}</p>
          </section>

          {/* Evaluation metrics */}
          <section className="mc-section">
            <h2 className="mc-section-title">Held-Out Test Benchmark Metrics</h2>
            <div className="mc-grid" style={{ marginTop: 'var(--space-3)' }}>
              <div className="mc-row">
                <span className="mc-label">Evaluated Period</span>
                <span className="mc-value font-data">{m.metrics.dateRange} ({m.metrics.sampleCount} trading days)</span>
              </div>
              <div className="mc-row">
                <span className="mc-label">Return RMSE</span>
                <span className="mc-value font-data" style={{ color: 'var(--teal)' }}>0.009655 (0.97%)</span>
              </div>
              <div className="mc-row">
                <span className="mc-label">Return MAE</span>
                <span className="mc-value font-data" style={{ color: 'var(--teal)' }}>0.006537 (0.65%)</span>
              </div>
              <div className="mc-row">
                <span className="mc-label">Directional Accuracy</span>
                <span className="mc-value font-data" style={{ color: 'var(--bullish)', fontWeight: 'bold' }}>55.39%</span>
              </div>
              <div className="mc-row">
                <span className="mc-label">Walk-Forward Accuracy</span>
                <span className="mc-value font-data" style={{ color: 'var(--bullish)' }}>55.39% (668 sequential steps)</span>
              </div>
            </div>
          </section>
        </main>

        <aside className="mc-sidebar">
          <section className="mc-sidebar-section">
            <h2 className="mc-section-title">Dataset</h2>
            <div className="mc-sidebar-rows">
              <div className="mc-row"><span className="mc-label">Source</span><span className="mc-value">{m.dataset.source}</span></div>
              <div className="mc-row"><span className="mc-label">File</span><span className="mc-value font-data">{m.dataset.file}</span></div>
              <div className="mc-row"><span className="mc-label">Rows</span><span className="mc-value">{m.dataset.rows.toLocaleString()}</span></div>
              <div className="mc-row"><span className="mc-label">Date range</span><span className="mc-value">{m.dataset.dateRange}</span></div>
              <div className="mc-row"><span className="mc-label">Missing values</span><span className="mc-value">{m.dataset.missingValues}</span></div>
            </div>
            <p className="mc-note mc-note-small">{m.dataset.noteVolume}</p>
          </section>

          <section className="mc-sidebar-section">
            <h2 className="mc-section-title">Train / Val / Test split</h2>
            {[m.split.train, m.split.val, m.split.test].map((s, i) => (
              <div key={i} className="mc-split-row">
                <span className="mc-split-label">{['Train','Val','Test'][i]}</span>
                <span className="mc-split-pct">{s.pct}%</span>
                <span className="mc-split-dates">{s.approxDates}</span>
              </div>
            ))}
            <p className="mc-note mc-note-small">{m.split.scalerNote}</p>
          </section>

          <section className="mc-sidebar-section">
            <h2 className="mc-section-title">Intended use</h2>
            <p className="mc-note">{m.intendedUse}</p>
            <h2 className="mc-section-title" style={{marginTop:'var(--space-4)'}}>Out of scope</h2>
            <p className="mc-note">{m.outOfScope}</p>
          </section>

          <section className="mc-sidebar-section">
            <h2 className="mc-section-title">Limitations</h2>
            <ul className="mc-limitations">
              {m.limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
