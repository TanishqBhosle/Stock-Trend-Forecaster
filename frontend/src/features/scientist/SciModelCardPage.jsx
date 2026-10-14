import { DataProvenanceLabel } from '@/components/ui/Badge'
import { MODEL_CONFIG } from '@/mocks/model'
import './ScientistPages.css'

export default function SciModelCardPage() {
  const m = MODEL_CONFIG
  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Technical Model Card</h1>
          <p className="page-subtitle">Detailed configuration for reproducibility</p>
        </div>
        <DataProvenanceLabel type="pending">Metrics unavailable</DataProvenanceLabel>
      </div>

      <div className="sci-alert"><strong>Evaluation metrics are unavailable.</strong> Model artifacts have not been generated. Run the training notebook to produce lstm_model.pt, metrics.json, and scaler files.</div>

      <section className="sci-section">
        <h2 className="sci-section-title">Complete hyperparameter set</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0' }}>
          {[
            ['Architecture', m.architecture],
            ['Hidden size', m.hiddenSize],
            ['LSTM layers', m.numLayers],
            ['Dropout', m.dropout],
            ['Lookback window', `${m.lookback} trading days`],
            ['Batch size', m.batchSize],
            ['Optimizer', m.optimizer],
            ['Loss function', m.lossFunction],
            ['LR scheduler', m.lrScheduler],
            ['Early stopping', m.earlyStopping],
            ['Gradient clipping', m.gradientClip],
            ['Input shape', `(batch, ${m.lookback}, ${m.features.length})`],
            ['Output shape', '(batch, 1) — predicted return'],
            ['Version', 'lstm-v0.1-demo'],
          ].map(([label, value]) => (
            <div key={label} className="mc-row">
              <span className="mc-label">{label}</span>
              <span className="mc-value">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Preprocessing pipeline</h2>
        {[
          'Load GSPC.csv — 24,800 rows, 0 missing values, 0 duplicates.',
          'Compute 9 stationary features from OHLCV columns.',
          'Compute next-day return as the regression target.',
          'Chronological 70/15/15 split — no shuffling.',
          'Fit StandardScaler on training features only (prevents data leakage).',
          'Fit separate StandardScaler on training targets only.',
          'Transform validation and test sets using the training-fitted scalers.',
          'Create 60-day sequences using concatenate-then-slice to avoid boundary leakage.',
        ].map((step, i) => (
          <div key={i} style={{ display:'flex', gap:'var(--space-3)', padding:'var(--space-2) 0', borderBottom:'1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily:'var(--font-data)', fontSize:'var(--text-xs)', color:'var(--text-muted)', minWidth:'20px' }}>{String(i+1).padStart(2,'0')}</span>
            <span style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)' }}>{step}</span>
          </div>
        ))}
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Evaluation methodology</h2>
        {[
          ['Test split', '15% held-out chronological slice (~2012–2026)'],
          ['Baseline', 'Naive: predicted_price = Close[t]. Evaluated on identical test samples.'],
          ['Regression metrics', 'RMSE, MAE, MAPE — computed on inverse-transformed predictions'],
          ['Directional accuracy', 'Fraction of days where predicted direction matches actual direction'],
          ['Walk-forward', 'Not yet implemented — listed in project roadmap'],
        ].map(([label, value]) => (
          <div key={label} className="mc-row">
            <span className="mc-label" style={{ minWidth: '160px' }}>{label}</span>
            <span className="mc-value" style={{ textAlign:'left', flex:1 }}>{value}</span>
          </div>
        ))}
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Known limitations</h2>
        <ul style={{ listStyle:'disc', paddingLeft:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
          {m.limitations.map((l, i) => (
            <li key={i} style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)', lineHeight:'var(--leading-relaxed)' }}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
