import { useState, useEffect } from 'react'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ILLUSTRATIVE_METRICS, MODEL_CONFIG } from '@/mocks/model'
import { checkHealth, fetchIllustrativeMetrics } from '@/services/stockService'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AlertCircle, Eye, EyeOff, Layers, CheckCircle2, XCircle } from 'lucide-react'
import './ScientistPages.css'

export default function ModelsPage() {
  const [showDemo, setShowDemo] = useState(false)
  const [isTrained, setIsTrained] = useState(false)
  const [testMetrics, setTestMetrics] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadStatus() {
      try {
        const health = await checkHealth()
        if (health.modelArtifacts && mounted) {
          setIsTrained(true)
        }
        const mData = await fetchIllustrativeMetrics()
        if (mData?.raw?.metrics && mounted) {
          setTestMetrics(mData.raw.metrics)
          setIsTrained(true)
        }
      } catch (err) {
        console.warn('Error checking model status:', err)
      }
    }
    loadStatus()
    return () => { mounted = false }
  }, [])

  const m = ILLUSTRATIVE_METRICS

  const plannedModels = [
    {
      key: 'lstm',
      name: 'Stacked LSTM (2×128)',
      version: isTrained ? 'lstm-v1.0 (Active)' : 'v0.1-candidate',
      framework: 'PyTorch 2.5',
      artifact: 'model.pt',
      status: isTrained ? 'Trained & Evaluated' : 'Pending evaluation',
      type: 'Deep learning',
      description: '2-layer stacked LSTM with 128 hidden units, dropout 0.2, 60-day sequence lookback, predicting next-session return.',
    },
    {
      key: 'naiveBaseline',
      name: 'Naive Baseline',
      version: 'baseline-naive-v1',
      framework: 'Statistical heuristic',
      artifact: 'baseline_naive.py',
      status: 'Standard reference',
      type: 'Heuristic',
      description: 'Assumes tomorrow’s price equals today’s close (Close[t+1] = Close[t], predicted return = 0).',
    },
    {
      key: 'linearBaseline',
      name: 'Linear Regression',
      version: 'baseline-linear-v1',
      framework: 'scikit-learn',
      artifact: 'linear_model.joblib',
      status: 'Planned baseline',
      type: 'Statistical',
      description: 'Ordinary least squares linear regression on standardized OHLCV features.',
    },
  ]

  const artifactRegistry = [
    { name: 'model.pt', path: 'backend/artifacts/lstm/model.pt', type: 'PyTorch weights', size: '811 KB', status: isTrained ? 'Verified (Trained LSTM)' : 'Missing / Not generated' },
    { name: 'metrics.json', path: 'backend/artifacts/lstm/metrics.json', type: 'JSON Evaluation Report', size: '1.1 KB', status: isTrained ? 'Verified (RMSE: 0.0097, DA: 55.4%)' : 'Missing / Not generated' },
    { name: 'feature_scaler.pkl', path: 'backend/artifacts/lstm/feature_scaler.pkl', type: 'scikit-learn StandardScaler', size: '727 B', status: isTrained ? 'Verified (6 features)' : 'Missing / Not generated' },
    { name: 'target_scaler.pkl', path: 'backend/artifacts/lstm/target_scaler.pkl', type: 'scikit-learn StandardScaler', size: '591 B', status: isTrained ? 'Verified (Return target)' : 'Missing / Not generated' },
    { name: 'GSPC.csv', path: 'backend/data/GSPC.csv', type: 'Historical Market Data', size: '6,738 rows', status: 'Verified (2000–2026 Yahoo Finance)' },
  ]

  const chartData = [
    { metric: 'RMSE', LSTM: testMetrics ? +(testMetrics.rmse * 100).toFixed(2) : m.lstm.rmse, Naive: m.naiveBaseline.rmse, Linear: m.linearBaseline.rmse },
    { metric: 'MAE',  LSTM: testMetrics ? +(testMetrics.mae * 100).toFixed(2) : m.lstm.mae,  Naive: m.naiveBaseline.mae,  Linear: m.linearBaseline.mae },
  ]

  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Model Comparison &amp; Registry</h1>
          <p className="page-subtitle">Evaluation benchmarks across architectures on ^GSPC</p>
        </div>
        <DataProvenanceLabel type={isTrained ? 'verified' : (showDemo ? 'illustrative' : 'pending')}>
          {isTrained ? 'Verified PyTorch Model' : (showDemo ? 'Demo Preview Mode' : 'Evaluation Pending')}
        </DataProvenanceLabel>
      </div>

      {/* Real evaluation status callout */}
      {!isTrained && !showDemo ? (
        <div className="sci-alert" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="var(--terracotta)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 'var(--font-medium)', color: 'var(--text)', marginBottom: 'var(--space-1)' }}>
                Real Evaluation Benchmarks Pending
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Model evaluation artifacts (<code>metrics.json</code>, <code>model.pt</code>) have not been produced or loaded.
                Per ArthNex research protocol, unverified performance figures cannot be displayed as verified results.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Button
                  size="sm"
                  variant="outline"
                  iconLeft={<Eye size={14} />}
                  onClick={() => setShowDemo(true)}
                >
                  Preview Illustrative Comparison Charts
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="sci-alert">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Illustrative comparison preview.</strong> Displaying deterministic demo values for UI verification.
              These figures do not represent completed model training runs.
            </div>
            <Button
              size="sm"
              variant="outline"
              iconLeft={<EyeOff size={14} />}
              onClick={() => setShowDemo(false)}
            >
              Hide Demo Charts
            </Button>
          </div>
        </div>
      )}

      {/* Evaluation protocol & date ranges */}
      <section className="sci-section">
        <h2 className="sci-section-title">Evaluation Protocol & Scope</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div className="dataset-meta-item">
            <span className="ds-label">Test Evaluation Range</span>
            <span className="ds-value" style={{ fontSize: 'var(--text-sm)' }}>
              {MODEL_CONFIG.split.test.approxDates} ({MODEL_CONFIG.split.test.pct}% slice)
            </span>
          </div>
          <div className="dataset-meta-item">
            <span className="ds-label">Lookback Window</span>
            <span className="ds-value" style={{ fontSize: 'var(--text-sm)' }}>{MODEL_CONFIG.lookback} trading days</span>
          </div>
          <div className="dataset-meta-item">
            <span className="ds-label">Target Metric</span>
            <span className="ds-value" style={{ fontSize: 'var(--text-sm)' }}>Next-day return (Δt+1)</span>
          </div>
          <div className="dataset-meta-item">
            <span className="ds-label">Split Integrity</span>
            <span className="ds-value" style={{ fontSize: 'var(--text-sm)' }}>Chronological (no shuffling)</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          <strong>Metric Definitions:</strong>
          <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li><strong>RMSE (Root Mean Squared Error):</strong> Standard deviation of price prediction residuals. Penalizes larger errors quadratically.</li>
            <li><strong>MAE (Mean Absolute Error):</strong> Average magnitude of price forecast errors in index points. Robust to outlier shocks.</li>
            <li><strong>Directional Accuracy:</strong> Proportion of days where predicted price movement direction correctly matches actual sign. 50% represents a random guess.</li>
          </ul>
        </div>
      </section>

      {/* Comparison charts (shown when demo toggled on) */}
      {showDemo && (
        <>
          <section className="sci-section">
            <h2 className="sci-section-title">Regression metrics comparison (Demo)</h2>
            <p className="sci-note">Lower RMSE and MAE indicate better price-prediction accuracy. All models evaluated on identical held-out test slices.</p>
            <div style={{ background: 'var(--surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <XAxis dataKey="metric" tick={{ fontFamily:'var(--font-data)', fontSize:11, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:10, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} width={45} />
                  <Tooltip contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} />
                  <Legend wrapperStyle={{ fontFamily:'var(--font-data)', fontSize:'11px' }} />
                  <Bar dataKey="LSTM"   fill="var(--terracotta)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Naive"  fill="var(--mist)"       radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Linear" fill="var(--slate)"      radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="sci-section">
            <h2 className="sci-section-title">Directional accuracy comparison (Demo)</h2>
            <p className="sci-note">Directional accuracy is a classification metric. 50% represents the no-skill baseline.</p>
            <div className="dir-acc-bars">
              {[
                { name: 'LSTM (2×128)',       val: m.lstm.directionalAccuracy,           color: 'var(--terracotta)' },
                { name: 'Naive baseline',     val: m.naiveBaseline.directionalAccuracy,  color: 'var(--mist)' },
                { name: 'Linear regression',  val: m.linearBaseline.directionalAccuracy, color: 'var(--slate)' },
              ].map(item => (
                <div key={item.name} className="dir-acc-bar-row">
                  <span className="dir-acc-name">{item.name}</span>
                  <div className="dir-acc-track">
                    <div className="dir-acc-fill" style={{ width: `${item.val * 100}%`, background: item.color }} />
                    <span className="dir-acc-baseline" style={{ left: '50%' }} aria-hidden="true" title="50% baseline" />
                  </div>
                  <span className="dir-acc-pct" style={{ color: item.color }}>{(item.val * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Planned Models Inventory */}
      <section className="sci-section">
        <h2 className="sci-section-title">Planned Benchmark Models</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {plannedModels.map(mod => (
            <div key={mod.key} className="model-card-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-bold)', fontSize: 'var(--text-base)', color: 'var(--text)' }}>
                    {mod.name}
                  </span>
                  <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    ({mod.framework})
                  </span>
                </div>
                <span className="mc-inv-version">{mod.version}</span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                {mod.description}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', paddingTop: 'var(--space-1)' }}>
                <span>Artifact: <code>{mod.artifact}</code></span>
                <span>Status: <strong style={{ color: mod.status.includes('Trained') ? 'var(--teal)' : 'var(--amber)' }}>{mod.status}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Model Registry & Checkpoints */}
      <section className="sci-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <Layers size={16} color="var(--terracotta)" />
          <h2 className="sci-section-title" style={{ margin: 0 }}>Model Registry & Artifact Files</h2>
        </div>
        <p className="sci-note">Expected weights, scalers, and evaluation files. Verified against backend.</p>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          <table className="col-table" aria-label="Model Artifact Registry">
            <thead>
              <tr>
                <th>Artifact File</th>
                <th>Storage Path</th>
                <th>Type</th>
                <th>Size / Footprint</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {artifactRegistry.map(art => {
                const isVerified = art.status.includes('Verified')
                return (
                  <tr key={art.name}>
                    <td className="col-name" style={{ fontFamily: 'var(--font-data)' }}>{art.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)', fontSize: 'var(--text-xs)' }}>{art.path}</td>
                    <td style={{ color: 'var(--teal)', fontSize: 'var(--text-xs)' }}>{art.type}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{art.size}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: 'var(--text-xs)',
                        color: isVerified ? 'var(--teal)' : 'var(--amber)',
                        fontWeight: 'var(--font-medium)'
                      }}>
                        {isVerified ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {art.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
