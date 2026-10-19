import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton'
import { runBacktest } from '@/services/stockService'
import { DEMO_STOCKS } from '@/mocks/stocks'
import { formatReturn } from '@/lib/signals'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import './BacktestPage.css'

const schema = z.object({
  ticker:         z.string().min(1, 'Select a ticker'),
  startDate:      z.string().min(1, 'Start date required'),
  endDate:        z.string().min(1, 'End date required'),
  initialCapital: z.string().refine(v => Number(v) >= 1000, 'Minimum capital is $1,000'),
  bullThreshold:  z.string(),
  bearThreshold:  z.string(),
  txCost:         z.string(),
}).refine(d => new Date(d.endDate) > new Date(d.startDate), {
  message: 'End date must be after start date', path: ['endDate'],
})

export default function BacktestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ticker: '^GSPC', startDate: '2024-01-01', endDate: '2025-01-01',
      initialCapital: '10000', bullThreshold: '0.5', bearThreshold: '-0.5', txCost: '0.1',
    },
  })

  const onSubmit = async (data) => {
    setLoading(true); setError(null); setResults(null)
    try {
      const res = await runBacktest({
        ticker: data.ticker,
        startDate: data.startDate,
        endDate: data.endDate,
        initialCapital: Number(data.initialCapital),
        bullishThreshold:  Number(data.bullThreshold) / 100,
        bearishThreshold:  Number(data.bearThreshold) / 100,
        transactionCostPct: Number(data.txCost) / 100,
      })
      setResults(res)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleReset = () => { reset(); setResults(null); setError(null) }

  return (
    <div className="backtest-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Backtesting Studio</h1>
          <p className="page-subtitle">Simulate a trend-following strategy using illustrative demo signals</p>
        </div>
        <DataProvenanceLabel type="illustrative">Illustrative Simulation</DataProvenanceLabel>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--amber)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <strong>Important Technical Disclosure:</strong> This backtesting module is an illustrative heuristic parameter exploration simulator. It evaluates a rule-based moving threshold strategy and is <strong>strictly separated from the primary PyTorch LSTM next-session forecasting model</strong>. It does not represent live market trading results, algorithmic execution, or guaranteed investment profitability.
      </div>

      <div className="backtest-layout">
        {/* Controls */}
        <aside className="backtest-controls">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <h2 className="backtest-controls-title">Strategy Parameters</h2>

            <Select id="ticker" label="Instrument" error={errors.ticker?.message} {...register('ticker')}>
              {DEMO_STOCKS.map(s => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name} {s.ticker === '^GSPC' ? '(Core Dataset)' : ''}
                </option>
              ))}
            </Select>

            <Input id="startDate" label="Start date" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input id="endDate" label="End date" type="date" error={errors.endDate?.message} {...register('endDate')} />
            <Input id="initialCapital" label="Initial capital ($)" type="number" min="1000" step="100" error={errors.initialCapital?.message} {...register('initialCapital')} />
            <Input id="bullThreshold" label="Bullish threshold (%)" type="number" step="0.1" error={errors.bullThreshold?.message} {...register('bullThreshold')} />
            <Input id="bearThreshold" label="Bearish threshold (%)" type="number" step="0.1" error={errors.bearThreshold?.message} {...register('bearThreshold')} />
            <Input id="txCost" label="Transaction cost (%)" type="number" step="0.01" error={errors.txCost?.message} {...register('txCost')} />

            <div className="backtest-buttons">
              <Button type="submit" fullWidth loading={loading} iconLeft={loading ? null : <Play size={14} />}>
                {loading ? 'Simulating…' : 'Run simulation'}
              </Button>
              <Button type="button" variant="ghost" fullWidth onClick={handleReset} iconLeft={<RotateCcw size={14} />}>
                Reset
              </Button>
            </div>
          </form>
          <div className="backtest-engine-notice">
            Simulated demo results — not a real backtesting engine. Does not use actual ML model inference.
          </div>
        </aside>

        {/* Results */}
        <main className="backtest-results">
          {loading ? (
            <div>
              <p className="backtest-loading-msg">Running simulation…</p>
              <ChartSkeleton height="260px" />
            </div>
          ) : error ? (
            <div className="backtest-error">
              <p>Simulation failed: {error}</p>
            </div>
          ) : results ? (
            <>
              <div className="results-header">
                <h2 className="results-title">Simulation results</h2>
                <DataProvenanceLabel type="illustrative">Simulated demo results</DataProvenanceLabel>
              </div>
              <div className="results-metrics">
                {[
                  { label: 'Total return', value: formatReturn(results.totalReturn), cls: results.totalReturn >= 0 ? 'pos' : 'neg' },
                  { label: 'Final capital', value: `$${results.finalCapital.toLocaleString()}`, cls: '' },
                  { label: 'Max drawdown', value: formatReturn(results.maxDrawdown), cls: 'neg' },
                  { label: 'Sharpe ratio', value: results.sharpeRatio.toFixed(2), cls: '' },
                  { label: 'Win rate', value: `${(results.winRate * 100).toFixed(1)}%`, cls: '' },
                  { label: 'Total trades', value: String(results.totalTrades), cls: '' },
                ].map(m => (
                  <div key={m.label} className="result-metric">
                    <span className="rm-label">{m.label}</span>
                    <span className={`rm-value ${m.cls}`}>{m.value}</span>
                  </div>
                ))}
              </div>

              <div className="equity-chart-wrap">
                <h2 className="results-title">Equity curve</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={results.equityCurve}>
                    <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d?.slice(5)} />
                    <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={50} />
                    <Tooltip contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} formatter={(v,name) => [`$${v.toLocaleString()}`, name]} />
                    <Legend wrapperStyle={{ fontFamily:'var(--font-data)', fontSize:'11px' }} />
                    <Line type="monotone" dataKey="equity" stroke="var(--terracotta)" strokeWidth={1.5} dot={false} name="Strategy" />
                    <Line type="monotone" dataKey="benchmark" stroke="var(--mist)" strokeWidth={1} dot={false} strokeDasharray="4 3" name="Benchmark" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="backtest-disclaimer">
                Simulated historical results do not guarantee future performance. This simulation ignores
                slippage, market impact, liquidity constraints, and corporate actions.
                {' '}<strong>Not financial advice.</strong>
              </p>
            </>
          ) : (
            <div className="backtest-placeholder">
              <p>Configure parameters and click "Run simulation" to see results.</p>
              <p className="backtest-placeholder-sub">
                Results are deterministic demo simulations, not real model outputs.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
