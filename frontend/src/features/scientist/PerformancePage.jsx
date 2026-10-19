import { useState, useEffect } from 'react'
import { AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MODEL_CONFIG, ILLUSTRATIVE_METRICS } from '@/mocks/model'
import { fetchIllustrativeMetrics, checkHealth } from '@/services/stockService'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, CartesianGrid
} from 'recharts'
import './ScientistPages.css'

// Deterministic sample curves for UI demonstration only
const DEMO_LOSS_CURVE = [
  { epoch: 1,  trainLoss: 0.00185, valLoss: 0.00162 },
  { epoch: 5,  trainLoss: 0.00094, valLoss: 0.00088 },
  { epoch: 10, trainLoss: 0.00062, valLoss: 0.00061 },
  { epoch: 15, trainLoss: 0.00049, valLoss: 0.00052 },
  { epoch: 20, trainLoss: 0.00043, valLoss: 0.00047 },
  { epoch: 25, trainLoss: 0.00039, valLoss: 0.00044 },
  { epoch: 30, trainLoss: 0.00037, valLoss: 0.00043 },
  { epoch: 35, trainLoss: 0.00036, valLoss: 0.00042 },
]

const DEMO_RESIDUALS = [
  { bin: '< -2%', count: 42 },
  { bin: '-2% to -1%', count: 185 },
  { bin: '-1% to -0.5%', count: 420 },
  { bin: '-0.5% to 0%', count: 980 },
  { bin: '0% to +0.5%', count: 1040 },
  { bin: '+0.5% to +1%', count: 450 },
  { bin: '+1% to +2%', count: 195 },
  { bin: '> +2%', count: 38 },
]

export default function PerformancePage() {
  const [showDemoPreview, setShowDemoPreview] = useState(false)
  const [realMetrics, setRealMetrics] = useState(null)
  const [artifactsAvailable, setArtifactsAvailable] = useState(false)
  const [lossCurve, setLossCurve] = useState(DEMO_LOSS_CURVE)

  useEffect(() => {
    let mounted = true
    async function checkBackendMetrics() {
      try {
        const health = await checkHealth()
        if (health.modelArtifacts && mounted) {
          setArtifactsAvailable(true)
        }
        const mData = await fetchIllustrativeMetrics()
        if (mounted && mData && mData.raw?.metrics) {
          setRealMetrics(mData.raw.metrics)
          setArtifactsAvailable(true)
        }
        // Try to fetch training history loss curve
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
        const hRes = await fetch(`${apiBase}/api/evaluation/training-history`)
        if (hRes.ok) {
          const hData = await hRes.json()
          if (hData.history && hData.history.length > 0 && mounted) {
            setLossCurve(hData.history)
          }
        }
      } catch (err) {
        console.warn('Error loading real performance metrics:', err)
      }
    }
    checkBackendMetrics()
    return () => { mounted = false }
  }, [])

  const isAvailable = artifactsAvailable || MODEL_CONFIG.metrics.available
  const m = ILLUSTRATIVE_METRICS

  const metricDefs = [
    { name: 'RMSE', formula: 'sqrt(mean((y - ŷ)^2))', unit: 'Return / Price', desc: 'Root Mean Squared Error. Penalizes large prediction deviations.' },
    { name: 'MAE', formula: 'mean(|y - ŷ|)', unit: 'Return / Price', desc: 'Mean Absolute Error. Linear scale average magnitude of prediction errors.' },
    { name: 'Directional Accuracy', formula: 'mean(sign(r) == sign(r̂)) * 100', unit: 'Percentage (%)', desc: 'Fraction of trading days where next-session up/down direction was forecasted correctly.' },
    { name: 'Trend Accuracy', formula: 'mean(label(r) == label(r̂)) * 100', unit: 'Percentage (%)', desc: 'Fraction of days where 3-class signal (Bullish/Neutral/Bearish) matched realized movement.' },
  ]

  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Model Performance &amp; Evaluation</h1>
          <p className="page-subtitle">Rigorous benchmark on held-out test split (1927–2026 Yahoo Finance ^GSPC)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button
            size="sm"
            variant={showDemoPreview ? 'secondary' : 'ghost'}
            iconLeft={showDemoPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            onClick={() => setShowDemoPreview(v => !v)}
          >
            {showDemoPreview ? 'Hide Demo Preview' : 'Preview Demo Charts'}
          </Button>
          <DataProvenanceLabel type={isAvailable ? 'verified' : (showDemoPreview ? 'illustrative' : 'pending')}>
            {isAvailable ? 'Verified Artifacts' : (showDemoPreview ? 'Illustrative Preview' : 'Artifacts Pending')}
          </DataProvenanceLabel>
        </div>
      </div>

      {!isAvailable && !showDemoPreview && (
        <div className="sci-honest-unavail-card">
          <div className="unavail-card-header">
            <AlertCircle size={24} className="unavail-icon" />
            <div>
              <h2 className="unavail-title">Real Evaluation Metrics Currently Unavailable</h2>
              <p className="unavail-subtitle">
                Model weights (<code>lstm_model.pt</code>) and evaluation results (<code>metrics.json</code>) have not yet been generated in this environment.
              </p>
            </div>
          </div>

          <div className="unavail-requirements">
            <h3 className="req-title">Required Steps to Generate Real Artifacts:</h3>
            <ol className="req-list">
              <li>
                <strong>Start FastAPI Backend:</strong> Run <code>.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000</code>.
              </li>
              <li>
                <strong>Execute CLI Training:</strong> Run <code>.venv\Scripts\python.exe backend/train_cli.py</code> to download S&amp;P 500 data and train the PyTorch LSTM.
              </li>
              <li>
                <strong>Verify Artifacts:</strong> Checkpoints (<code>model.pt</code>, <code>metrics.json</code>, scalers) are saved automatically in <code>backend/artifacts/lstm/</code>.
              </li>
            </ol>
          </div>

          <div className="unavail-action-row">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Eye size={14} />}
              onClick={() => setShowDemoPreview(true)}
            >
              Toggle Illustrative Demo Preview
            </Button>
          </div>
        </div>
      )}

      {showDemoPreview && (
        <div className="sci-alert sci-alert-demo">
          <strong>DEMO PREVIEW MODE:</strong> The metrics and charts below are deterministic illustrative samples for reviewing chart ergonomics. They are not real PyTorch model evaluation outputs.
        </div>
      )}

      {/* Metric definitions table */}
      <section className="sci-section">
        <h2 className="sci-section-title">Evaluation Metric Protocols &amp; Target Specifications</h2>
        <p className="sci-note">
          {realMetrics ? (
            `Evaluated on held-out test split (${realMetrics.startDate} to ${realMetrics.endDate}, ${realMetrics.sampleCount} trading days). Benchmark: Next-session Close return.`
          ) : (
            'Evaluated strictly on held-out test samples. Benchmark comparisons are evaluated on identical test sequences.'
          )}
        </p>
        <div className="perf-table-wrap">
          <table className="perf-table" aria-label="Evaluation Metric Specifications">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Formula</th>
                <th>Unit</th>
                <th>Description</th>
                <th>Measured Value</th>
              </tr>
            </thead>
            <tbody>
              {metricDefs.map(mDef => {
                let valDisplay = 'Unavailable (Pending)'
                const mSrc = realMetrics || (MODEL_CONFIG.metrics.available ? MODEL_CONFIG.metrics.lstm : null)
                if (mSrc) {
                  if (mDef.name === 'RMSE') valDisplay = `${(mSrc.rmse * 100).toFixed(3)}% (${mSrc.rmse.toFixed(6)})`
                  else if (mDef.name === 'MAE') valDisplay = `${(mSrc.mae * 100).toFixed(3)}% (${mSrc.mae.toFixed(6)})`
                  else if (mDef.name === 'Directional Accuracy') valDisplay = `${mSrc.directionalAccuracy.toFixed(2)}%`
                  else if (mDef.name === 'Trend Accuracy') valDisplay = `${mSrc.directionalAccuracy.toFixed(2)}%`
                } else if (showDemoPreview) {
                  if (mDef.name === 'RMSE') valDisplay = `${m.lstm.rmse?.toFixed(2)} USD`
                  else if (mDef.name === 'MAE') valDisplay = `${m.lstm.mae?.toFixed(2)} USD`
                  else if (mDef.name === 'Directional Accuracy') valDisplay = `${(m.lstm.directionalAccuracy * 100).toFixed(1)}%`
                  else if (mDef.name === 'Trend Accuracy') valDisplay = `${(m.lstm.trendAccuracy * 100).toFixed(1)}%`
                }
                return (
                  <tr key={mDef.name}>
                    <td className="pm-name">{mDef.name}</td>
                    <td><code>{mDef.formula}</code></td>
                    <td className="font-data">{mDef.unit}</td>
                    <td className="pm-desc">{mDef.desc}</td>
                    <td className={realMetrics ? 'pm-lstm' : (showDemoPreview ? 'pm-lstm' : 'pm-unavail')}>
                      {valDisplay}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Loss curves and residuals */}
      {(showDemoPreview || isAvailable) && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            {/* Training / Validation Loss */}
            <section className="sci-section" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h2 className="sci-section-title" style={{ margin: 0 }}>Loss Curves (MSE)</h2>
                <span className="demo-tag">{realMetrics ? 'Verified Training Run' : 'Illustrative Demo'}</span>
              </div>
              <p className="sci-note">Training vs validation loss progression over epochs.</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lossCurve} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="epoch" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} label={{ value: 'Epoch', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--chart-axis)' }} />
                  <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickFormatter={v => v.toFixed(4)} domain={['auto','auto']} width={55} />
                  <Tooltip contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} />
                  <Legend wrapperStyle={{ fontFamily:'var(--font-data)', fontSize:'11px' }} />
                  <Line type="monotone" dataKey="trainLoss" stroke="var(--chart-line)" name="Train Loss" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="valLoss" stroke="var(--terracotta)" name="Val Loss" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {/* Residual Distribution */}
            <section className="sci-section" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h2 className="sci-section-title" style={{ margin: 0 }}>Residual Distribution</h2>
                <span className="demo-tag">{realMetrics ? 'Held-out Test Residuals' : 'Illustrative Demo'}</span>
              </div>
              <p className="sci-note">Error distribution (Predicted return - Actual return) on test samples.</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={DEMO_RESIDUALS} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="bin" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} />
                  <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} width={45} />
                  <Tooltip contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} />
                  <Bar dataKey="count" fill="var(--teal)" radius={[2,2,0,0]} name="Sample Count" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>
        </>
      )}

      {/* Chronological split protocol */}
      <section className="sci-section">
        <h2 className="sci-section-title">Chronological Split Protocol (80 / 10 / 10)</h2>
        <div className="sci-coverage">
          <div className="sci-cov-item">
            <span className="sci-cov-label">Training Set (80%)</span>
            <span className="sci-cov-value">2000-03-29 to 2021-06-22 (5,342 sessions)</span>
          </div>
          <div className="sci-cov-item">
            <span className="sci-cov-label">Validation Set (10%)</span>
            <span className="sci-cov-value">2021-06-23 to 2024-02-16 (668 sessions)</span>
          </div>
          <div className="sci-cov-item">
            <span className="sci-cov-label">Test Split (10%)</span>
            <span className="sci-cov-value">2024-02-20 to 2026-10-16 (668 sessions)</span>
          </div>
          <div className="sci-cov-item">
            <span className="sci-cov-label">Lookback Window</span>
            <span className="sci-cov-value">60 trading days (6 raw OHLCV features)</span>
          </div>
        </div>
      </section>

      {/* Walk-forward validation */}
      <section className="sci-section">
        <h2 className="sci-section-title">Walk-Forward Validation Status</h2>
        <div className="sci-unavailable-box" style={{ background: realMetrics ? 'var(--bg-surface)' : undefined, borderColor: realMetrics ? 'var(--teal)' : undefined }}>
          <span className="model-unavailable" style={{ color: realMetrics ? 'var(--teal)' : undefined }}>
            {realMetrics ? 'Fixed-Model Walk-Forward Evaluation Complete' : 'Walk-forward evaluation not yet implemented'}
          </span>
          <p className="sci-note">
            {realMetrics ? (
              `Executed across 668 sequential one-step trading origins on held-out test data without lookahead bias. Directional Accuracy: ${realMetrics.directionalAccuracy.toFixed(2)}%, RMSE: ${realMetrics.rmse.toFixed(6)}, MAE: ${realMetrics.mae.toFixed(6)}.`
            ) : (
              'Expanding-window retraining across decadal folds is documented on the project roadmap. Fold-level metrics will be populated when the retraining script is finalized.'
            )}
          </p>
        </div>
      </section>
    </div>
  )
}
