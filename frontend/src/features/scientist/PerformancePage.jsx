import { DataProvenanceLabel } from '@/components/ui/Badge'
import { ILLUSTRATIVE_METRICS } from '@/mocks/model'
import './ScientistPages.css'

export default function PerformancePage() {
  const m = ILLUSTRATIVE_METRICS
  const metrics = [
    { label: 'RMSE', desc: 'Root Mean Squared Error — measures average prediction error in price units. Lower is better.', lstm: m.lstm.rmse?.toFixed(2), naive: m.naiveBaseline.rmse?.toFixed(2), linear: m.linearBaseline.rmse?.toFixed(2) },
    { label: 'MAE', desc: 'Mean Absolute Error — average absolute prediction error in price units.', lstm: m.lstm.mae?.toFixed(2), naive: m.naiveBaseline.mae?.toFixed(2), linear: m.linearBaseline.mae?.toFixed(2) },
    { label: 'MAPE', desc: 'Mean Absolute Percentage Error — relative prediction error.', lstm: `${(m.lstm.mape * 100).toFixed(2)}%`, naive: `${(m.naiveBaseline.mape * 100).toFixed(2)}%`, linear: `${(m.linearBaseline.mape * 100).toFixed(2)}%` },
    { label: 'Dir. accuracy', desc: 'Directional accuracy — fraction of days with correct up/down direction. 50% = random.', lstm: `${(m.lstm.directionalAccuracy * 100).toFixed(1)}%`, naive: `${(m.naiveBaseline.directionalAccuracy * 100).toFixed(1)}%`, linear: `${(m.linearBaseline.directionalAccuracy * 100).toFixed(1)}%` },
  ]

  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Model Performance</h1>
          <p className="page-subtitle">Evaluation on held-out test set — chronological split</p>
        </div>
        <DataProvenanceLabel type="illustrative" />
      </div>

      <div className="sci-alert">
        <strong>Illustrative values only.</strong> Real evaluation metrics require running the training notebook and loading saved artifacts. Values shown here are for visual demonstration of the interface.
      </div>

      <section className="sci-section">
        <h2 className="sci-section-title">Regression metrics</h2>
        <p className="sci-note">RMSE, MAE, and MAPE measure price-prediction accuracy on the test set. Evaluated on identical test samples for fair comparison.</p>
        <div className="perf-table-wrap">
          <table className="perf-table" aria-label="Regression metrics">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Description</th>
                <th>LSTM (2×128)</th>
                <th>Naive baseline</th>
                <th>Linear baseline</th>
              </tr>
            </thead>
            <tbody>
              {metrics.slice(0, 3).map(row => (
                <tr key={row.label}>
                  <td className="pm-name">{row.label}</td>
                  <td className="pm-desc">{row.desc}</td>
                  <td className="pm-lstm">{row.lstm ?? '—'}</td>
                  <td className="pm-base">{row.naive ?? '—'}</td>
                  <td className="pm-base">{row.linear ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Directional accuracy</h2>
        <p className="sci-note">Measures whether the predicted direction (up/down) was correct — a separate question from regression accuracy. 50% = random.</p>
        <div className="perf-table-wrap">
          <table className="perf-table" aria-label="Directional accuracy">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Description</th>
                <th>LSTM (2×128)</th>
                <th>Naive baseline</th>
                <th>Linear baseline</th>
              </tr>
            </thead>
            <tbody>
              {metrics.slice(3).map(row => (
                <tr key={row.label}>
                  <td className="pm-name">{row.label}</td>
                  <td className="pm-desc">{row.desc}</td>
                  <td className="pm-lstm">{row.lstm ?? '—'}</td>
                  <td className="pm-base">{row.naive ?? '—'}</td>
                  <td className="pm-base">{row.linear ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Walk-forward validation</h2>
        <div className="sci-unavailable-box">
          <span className="model-unavailable">Walk-forward evaluation unavailable</span>
          <p className="sci-note">Walk-forward (expanding window) retraining is listed in the project roadmap but has not yet been implemented. Fold-level results will appear here once artifacts are available.</p>
        </div>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Test set coverage</h2>
        <div className="sci-coverage">
          <div className="sci-cov-item"><span className="sci-cov-label">Test split</span><span className="sci-cov-value">15% of 24,800 rows ≈ 3,720 days</span></div>
          <div className="sci-cov-item"><span className="sci-cov-label">Approx. date range</span><span className="sci-cov-value">~2012 – 2026</span></div>
          <div className="sci-cov-item"><span className="sci-cov-label">Sequence offset</span><span className="sci-cov-value">First 60 rows used for lookback window</span></div>
        </div>
      </section>
    </div>
  )
}
