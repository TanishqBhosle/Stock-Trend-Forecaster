import { DataProvenanceLabel } from '@/components/ui/Badge'
import { ILLUSTRATIVE_METRICS } from '@/mocks/model'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import './ScientistPages.css'

const MODELS = [
  { key: 'lstm', name: 'LSTM (2×128)', version: 'v0.1', type: 'Deep learning' },
  { key: 'naiveBaseline', name: 'Naive baseline', version: 'baseline-naive', type: 'Statistical' },
  { key: 'linearBaseline', name: 'Linear regression', version: 'baseline-linear', type: 'Statistical' },
]

export default function ModelsPage() {
  const m = ILLUSTRATIVE_METRICS
  const chartData = [
    { metric: 'RMSE', LSTM: m.lstm.rmse, Naive: m.naiveBaseline.rmse, Linear: m.linearBaseline.rmse },
    { metric: 'MAE',  LSTM: m.lstm.mae,  Naive: m.naiveBaseline.mae,  Linear: m.linearBaseline.mae },
  ]

  return (
    <div className="sci-page">
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">Model Comparison</h1>
          <p className="page-subtitle">LSTM vs naive and linear baselines — illustrative demo values</p>
        </div>
        <DataProvenanceLabel type="illustrative" />
      </div>

      <div className="sci-alert">
        <strong>Illustrative values only.</strong> Metrics below are demo figures for interface demonstration. Real comparisons require running the training notebook.
      </div>

      <section className="sci-section">
        <h2 className="sci-section-title">Regression metrics comparison</h2>
        <p className="sci-note">Lower RMSE and MAE indicate better price-prediction accuracy. All models evaluated on the same held-out test samples.</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top:0, right:0, bottom:0, left:0 }}>
            <XAxis dataKey="metric" tick={{ fontFamily:'var(--font-data)', fontSize:10, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} />
            <Legend wrapperStyle={{ fontFamily:'var(--font-data)', fontSize:'11px' }} />
            <Bar dataKey="LSTM"   fill="var(--terracotta)" radius={[2,2,0,0]} />
            <Bar dataKey="Naive"  fill="var(--mist)"       radius={[2,2,0,0]} />
            <Bar dataKey="Linear" fill="var(--chart-volume)" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Directional accuracy comparison</h2>
        <p className="sci-note">Directional accuracy is a classification metric — it must not be compared against RMSE or MAE. 50% = no better than random guessing.</p>
        <div className="dir-acc-bars">
          {[
            { name: 'LSTM (2×128)',       val: m.lstm.directionalAccuracy,             color: 'var(--terracotta)' },
            { name: 'Naive baseline',     val: m.naiveBaseline.directionalAccuracy,    color: 'var(--mist)' },
            { name: 'Linear regression',  val: m.linearBaseline.directionalAccuracy,   color: 'var(--chart-volume)' },
          ].map(item => (
            <div key={item.name} className="dir-acc-bar-row">
              <span className="dir-acc-name">{item.name}</span>
              <div className="dir-acc-track">
                <div className="dir-acc-fill" style={{ width: `${item.val * 100}%`, background: item.color }} />
                <span className="dir-acc-baseline" style={{ left: '50%' }} aria-hidden="true" />
              </div>
              <span className="dir-acc-pct" style={{ color: item.color }}>{(item.val * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <p className="sci-note">The 50% baseline is marked. Values above 50% indicate some directional skill; values below indicate inverse skill. Small differences may not be statistically significant.</p>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Model inventory</h2>
        <div className="model-inventory">
          {MODELS.map(mod => (
            <div key={mod.key} className="model-card-row">
              <div>
                <p className="mc-inv-name">{mod.name}</p>
                <p className="mc-inv-type">{mod.type}</p>
              </div>
              <span className="mc-inv-version">{mod.version}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
