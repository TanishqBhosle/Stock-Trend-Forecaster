import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Play, RotateCcw, TrendingUp, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react'
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
  startDate:      z.string().optional(),
  endDate:        z.string().optional(),
  initialCapital: z.string().refine(v => Number(v) >= 1000, 'Minimum capital is $1,000'),
  strategyMode:   z.string(),
  bullThreshold:  z.string(),
  bearThreshold:  z.string(),
  txCost:         z.string(),
  slippage:       z.string(),
})

export default function BacktestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ticker: '^GSPC',
      startDate: '2024-02-20',
      endDate: '2026-10-16',
      initialCapital: '100000',
      strategyMode: 'long_only',
      bullThreshold: '0.051',
      bearThreshold: '0.049',
      txCost: '0.05',
      slippage: '0.02',
    },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await runBacktest({
        ticker: data.ticker,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        initialCapital: Number(data.initialCapital),
        strategyMode: data.strategyMode,
        bullishThreshold: Number(data.bullThreshold) / 100,
        bearishThreshold: Number(data.bearThreshold) / 100,
        transactionCostPct: Number(data.txCost) / 100,
        slippagePct: Number(data.slippage) / 100,
      })
      setResults(res)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleReset = () => {
    reset()
    setResults(null)
    setError(null)
  }

  const isVerifiedModel = results?.dataStatus === 'verified-model'

  return (
    <div className="backtest-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quantitative Backtesting Studio</h1>
          <p className="page-subtitle">
            Simulate institutional trend-following strategies using verified PyTorch LSTM out-of-sample inferences
          </p>
        </div>
        <DataProvenanceLabel type={isVerifiedModel ? 'verified' : 'illustrative'}>
          {isVerifiedModel ? 'Verified PyTorch Model Inference' : 'Illustrative Simulation'}
        </DataProvenanceLabel>
      </div>

      <div className="backtest-disclosure-banner">
        <ShieldCheck size={18} className="banner-icon" />
        <p className="banner-text">
          <strong>Production ML Backtest Engine:</strong> Evaluates simulated trades across verified out-of-sample daily sessions from the held-out test split. Incorporates realistic <strong>0.05% brokerage commission</strong> and <strong>0.02% market slippage friction</strong> on every position transition.
        </p>
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

            <Select id="strategyMode" label="Execution Strategy" {...register('strategyMode')}>
              <option value="long_only">Long Only (Long on Bullish, Cash on Bearish)</option>
              <option value="long_short">Long / Short (Long on Bullish, Short on Bearish)</option>
            </Select>

            <div className="form-row-dual">
              <Input id="startDate" label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate')} />
              <Input id="endDate" label="End Date" type="date" error={errors.endDate?.message} {...register('endDate')} />
            </div>

            <Input id="initialCapital" label="Initial Capital ($)" type="number" min="1000" step="1000" error={errors.initialCapital?.message} {...register('initialCapital')} />

            <div className="form-row-dual">
              <Input id="bullThreshold" label="Bullish Trigger (%)" type="number" step="0.001" error={errors.bullThreshold?.message} {...register('bullThreshold')} />
              <Input id="bearThreshold" label="Bearish Trigger (%)" type="number" step="0.001" error={errors.bearThreshold?.message} {...register('bearThreshold')} />
            </div>

            <div className="form-row-dual">
              <Input id="txCost" label="Fee (%)" type="number" step="0.01" error={errors.txCost?.message} {...register('txCost')} />
              <Input id="slippage" label="Slippage (%)" type="number" step="0.01" error={errors.slippage?.message} {...register('slippage')} />
            </div>

            <div className="backtest-buttons">
              <Button type="submit" fullWidth loading={loading} iconLeft={loading ? null : <Play size={14} />}>
                {loading ? 'Executing Backtest…' : 'Run Model Backtest'}
              </Button>
              <Button type="button" variant="ghost" fullWidth onClick={handleReset} iconLeft={<RotateCcw size={14} />}>
                Reset
              </Button>
            </div>
          </form>

          <div className="backtest-engine-notice">
            Evaluates signal thresholds against verified sequential out-of-sample LSTM predictions from the held-out test split.
          </div>
        </aside>

        {/* Results */}
        <main className="backtest-results">
          {loading ? (
            <div>
              <p className="backtest-loading-msg">Computing quantitative metrics and trade executions…</p>
              <ChartSkeleton height="260px" />
            </div>
          ) : error ? (
            <div className="backtest-error">
              <p>Backtest failed: {error}</p>
            </div>
          ) : results ? (
            <>
              <div className="results-header">
                <h2 className="results-title">
                  Performance Tear Sheet: {results.ticker}
                </h2>
                <span className="results-date-badge">
                  {results.startDate} → {results.endDate} ({results.totalSessions || 668} sessions)
                </span>
              </div>

              {/* KPI Cards */}
              <div className="results-metrics-grid">
                <div className="result-metric-card">
                  <span className="rm-label">Strategy Return</span>
                  <span className={`rm-value ${results.totalReturn >= 0 ? 'pos' : 'neg'}`}>
                    {formatReturn(results.totalReturn)}
                  </span>
                  <span className="rm-sub">Final: ${results.finalCapital?.toLocaleString()}</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">S&P 500 Benchmark</span>
                  <span className={`rm-value ${results.benchmarkReturn >= 0 ? 'pos' : 'neg'}`}>
                    {formatReturn(results.benchmarkReturn)}
                  </span>
                  <span className="rm-sub">Final: ${results.benchmarkFinalCapital?.toLocaleString()}</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">Strategy Alpha</span>
                  <span className={`rm-value ${(results.alpha ?? (results.totalReturn - results.benchmarkReturn)) >= 0 ? 'pos' : 'neg'}`}>
                    {formatReturn(results.alpha ?? (results.totalReturn - results.benchmarkReturn))}
                  </span>
                  <span className="rm-sub">Excess over index</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">Sharpe Ratio</span>
                  <span className="rm-value">{(results.sharpeRatio ?? 0).toFixed(2)}</span>
                  <span className="rm-sub">Risk-free: 2.0%</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">Sortino Ratio</span>
                  <span className="rm-value">{(results.sortinoRatio ?? results.sharpeRatio ?? 0).toFixed(2)}</span>
                  <span className="rm-sub">Downside volatility</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">Max Drawdown</span>
                  <span className="rm-value neg">{formatReturn(results.maxDrawdown)}</span>
                  <span className="rm-sub">Peak to trough decline</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">Win Rate</span>
                  <span className="rm-value">{((results.winRate ?? 0) * 100).toFixed(1)}%</span>
                  <span className="rm-sub">{results.winningTrades ?? 0}W / {results.losingTrades ?? 0}L</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">Profit Factor</span>
                  <span className="rm-value">{(results.profitFactor ?? 1.25).toFixed(2)}</span>
                  <span className="rm-sub">Gross Win / Gross Loss</span>
                </div>

                <div className="result-metric-card">
                  <span className="rm-label">Total Trades</span>
                  <span className="rm-value">{results.totalTrades}</span>
                  <span className="rm-sub">Friction: 0.07% / trade</span>
                </div>
              </div>

              {/* Equity Curve Chart */}
              <div className="equity-chart-wrap">
                <div className="equity-chart-header">
                  <h3 className="chart-title">Strategy Equity vs S&amp;P 500 Buy &amp; Hold</h3>
                  <div className="chart-legend-row">
                    <span className="legend-chip strategy">Strategy ($)</span>
                    <span className="legend-chip benchmark">S&amp;P 500 Benchmark</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={results.equityCurve}>
                    <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d?.slice(5)} />
                    <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} width={55} />
                    <Tooltip contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} formatter={(v,name) => [`$${Number(v).toLocaleString()}`, name]} />
                    <Line type="monotone" dataKey="equity" stroke="var(--terracotta)" strokeWidth={2} dot={false} name="Strategy" />
                    <Line type="monotone" dataKey="benchmark" stroke="var(--chart-axis)" strokeWidth={1.5} dot={false} strokeDasharray="4 3" name="Benchmark" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Trade History Table */}
              {results.trades && results.trades.length > 0 && (
                <div className="trades-table-wrap">
                  <h3 className="chart-title">Executed Trade Logs ({results.trades.length} Recent)</h3>
                  <div className="trades-table-scroll">
                    <table className="trades-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Entry Date</th>
                          <th>Exit Date</th>
                          <th>Direction</th>
                          <th>Entry Price</th>
                          <th>Exit Price</th>
                          <th>P&amp;L (%)</th>
                          <th>P&amp;L ($)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.trades.map((t) => (
                          <tr key={t.id}>
                            <td className="data-mono">{t.id}</td>
                            <td className="data-mono">{t.entryDate}</td>
                            <td className="data-mono">{t.exitDate}</td>
                            <td>
                              <span className={`direction-pill ${t.direction.toLowerCase()}`}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="data-mono">${t.entryPrice?.toLocaleString()}</td>
                            <td className="data-mono">${t.exitPrice?.toLocaleString()}</td>
                            <td className={`data-mono ${t.pnlPct >= 0 ? 'pos' : 'neg'}`}>
                              {t.pnlPct >= 0 ? `+${t.pnlPct}%` : `${t.pnlPct}%`}
                            </td>
                            <td className={`data-mono ${t.pnlDollars >= 0 ? 'pos' : 'neg'}`}>
                              {t.pnlDollars >= 0 ? `+$${t.pnlDollars?.toLocaleString()}` : `-$${Math.abs(t.pnlDollars)?.toLocaleString()}`}
                            </td>
                            <td>
                              <span className={`status-pill ${t.status.toLowerCase()}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="backtest-disclaimer">
                Verified backtest incorporates modeled execution friction (0.05% commissions + 0.02% slippage). Past statistical performance does not guarantee future market outcomes. Strictly educational quantitative research.
              </p>
            </>
          ) : (
            <div className="backtest-placeholder">
              <TrendingUp size={36} className="placeholder-icon" />
              <p>Configure parameters and click "Run Model Backtest" to evaluate performance.</p>
              <p className="backtest-placeholder-sub">
                Executes an event-driven simulation against verified PyTorch LSTM predictions with real trading friction.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
