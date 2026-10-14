import { useParams, Link } from 'react-router-dom'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DEMO_EXPERIMENTS } from '@/mocks/experiments'
import './ScientistPages.css'

export default function ExperimentDetailPage() {
  const { id } = useParams()
  const exp = DEMO_EXPERIMENTS.find(e => e.id === id)

  if (!exp) {
    return <EmptyState illustration="search" title={`Experiment not found: ${id}`} actionLabel="Back to experiments" onAction={() => history.back()} />
  }

  return (
    <div className="sci-page">
      <Link to="/scientist/experiments" style={{ fontSize:'var(--text-sm)', color:'var(--text-muted)', textDecoration:'none', marginBottom:'var(--space-4)', display:'inline-block' }}>← Experiments</Link>
      <div className="page-header">
        <div>
          <h1 className="page-title sci-title">{exp.name}</h1>
          <p className="page-subtitle">{exp.id} · {exp.createdAt}</p>
        </div>
        <DataProvenanceLabel type="illustrative" />
      </div>

      <section className="sci-section">
        <h2 className="sci-section-title">Configuration</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0' }}>
          {[
            ['Architecture', exp.architecture],
            ['Hidden size', exp.hiddenSize ?? '—'],
            ['Layers', exp.numLayers ?? '—'],
            ['Lookback', `${exp.lookback} days`],
            ['Dropout', exp.dropout ?? '—'],
            ['Validation method', exp.validationMethod],
            ['Version', exp.version],
            ['Created', exp.createdAt],
          ].map(([label, value]) => (
            <div key={label} className="mc-row">
              <span className="mc-label">{label}</span>
              <span className="mc-value">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sci-section">
        <h2 className="sci-section-title">Results</h2>
        <div className="results-metrics">
          {[
            { label: 'Val loss', value: exp.valLoss?.toFixed(5) ?? '—' },
            { label: 'RMSE', value: exp.rmse?.toFixed(2) ?? '—' },
            { label: 'MAE', value: exp.mae?.toFixed(2) ?? '—' },
            { label: 'Dir. accuracy', value: exp.directionalAccuracy != null ? `${(exp.directionalAccuracy * 100).toFixed(1)}%` : '—' },
          ].map(m => (
            <div key={m.label} className="result-metric">
              <span className="rm-label">{m.label}</span>
              <span className="rm-value">{m.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
