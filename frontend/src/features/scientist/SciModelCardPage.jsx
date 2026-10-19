import { DataProvenanceLabel } from '@/components/ui/Badge'
import { MODEL_CONFIG } from '@/mocks/model'
import './ScientistPages.css'

export default function SciModelCardPage() {
  const m = MODEL_CONFIG
  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Technical Model Card &amp; Specifications</h1>
          <p className="page-subtitle">Reproducible PyTorch LSTM specification and evaluation protocols</p>
        </div>
        <DataProvenanceLabel type="verified">Verified PyTorch Weights</DataProvenanceLabel>
      </div>

      <div className="sci-alert" style={{ borderLeft: '4px solid var(--bullish)' }}>
        <strong>Active Verified Model:</strong> PyTorch 2-layer stacked LSTM regression model (<code>lstm-v1.0</code>) loaded from <code>backend/artifacts/lstm/model.pt</code>.
      </div>

      <section className="sci-section">
        <h2 className="sci-section-title">Complete Hyperparameter Set</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0' }}>
          {[
            ['Architecture', m.architecture],
            ['Input Size', '6 (Open, High, Low, Close, Adj Close, Volume)'],
            ['Hidden Size', m.hiddenSize],
            ['LSTM Layers', m.numLayers],
            ['Dropout', `${m.dropout} (between LSTM layers)`],
            ['Lookback Window', `${m.lookback} trading days`],
            ['Batch Size', m.batchSize],
            ['Optimizer', m.optimizer],
            ['Loss Function', m.lossFunction],
            ['Early Stopping', m.earlyStopping],
            ['Input Shape', `(batch_size, ${m.lookback}, 6)`],
            ['Output Shape', '(batch_size, 1) — predicted return'],
            ['Version', m.version],
            ['Active Checkpoint', 'artifacts/lstm/model.pt (811 KB)'],
          ].map(([label, value]) => (
            <div key={label} className="mc-row">
              <span className="mc-label">{label}</span>
              <span className="mc-value">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Verified Preprocessing Pipeline</h2>
        {[
          'Download S&P 500 (^GSPC) from Yahoo Finance (2000-01-03 to 2026-10-16) — 6,738 clean trading observations.',
          'Validate non-finite values, ascending date ordering, and deduplicate trading days.',
          'Extract exactly six raw OHLCV features: Open, High, Low, Close, Adj Close, Volume.',
          'Compute target as next trading session Close return: Close[t] / Close[t-1] - 1.',
          'Partition chronologically into 80% train (5,342 samples), 10% val (668 samples), 10% held-out test (668 samples).',
          'Fit MinMaxScaler strictly on the 5,342 training samples to guarantee zero future data leakage.',
          'Transform validation and test sets using the training-fitted scaler parameters.',
          'Construct 60-day sequences (batch_size, 60, 6) aligning strictly with the next-session target return.',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', minWidth: '24px' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{step}</span>
          </div>
        ))}
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Evaluation Methodology &amp; Benchmarks</h2>
        {[
          ['Held-Out Test Split', '10% chronological slice (668 trading days: 2024-02-22 to 2026-10-16)'],
          ['Test RMSE', '0.009655 (0.97 percentage points) in return space'],
          ['Test MAE', '0.006537 (0.65 percentage points) in return space'],
          ['Directional Accuracy', '55.39% (Sign concordance on realized vs. predicted returns)'],
          ['Walk-Forward Evaluation', 'Verified fixed-model sequential one-step walk-forward (668 origins)'],
          ['Walk-Forward RMSE', '0.009655'],
          ['Walk-Forward Accuracy', '55.39% (Identical consistency without future leakage)'],
        ].map(([label, value]) => (
          <div key={label} className="mc-row">
            <span className="mc-label" style={{ minWidth: '180px' }}>{label}</span>
            <span className="mc-value" style={{ textAlign: 'left', flex: 1, fontFamily: 'var(--font-data)' }}>{value}</span>
          </div>
        ))}
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Known Limitations</h2>
        <ul style={{ listStyle: 'disc', paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {m.limitations.map((l, i) => (
            <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
