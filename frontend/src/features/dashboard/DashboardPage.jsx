import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { DEMO_STOCKS, getSignalGroups } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { DEMO_FORECASTS } from '@/mocks/forecasts'
import { DEMO_PREDICTIONS } from '@/mocks/predictions'
import { MODEL_CONFIG } from '@/mocks/model'
import { formatPrice, formatReturn } from '@/lib/signals'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts'
import './DashboardPage.css'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="dash-tooltip">
      <span>{d.date}</span>
      <span>{formatPrice(d.close)}</span>
    </div>
  )
}

import { fetchStocks, fetchOHLCV, fetchForecast, fetchPredictions } from '@/services/stockService'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('3M')
  const [selectedTicker, setSelectedTicker] = useState('^GSPC')
  const [stocks, setStocks] = useState(DEMO_STOCKS)
  const [ohlcvData, setOhlcvData] = useState([])
  const [forecast, setForecast] = useState(null)
  const [recentPredictions, setRecentPredictions] = useState(DEMO_PREDICTIONS.slice(0, 4))

  useEffect(() => {
    let mounted = true
    async function loadData() {
      setLoading(true)
      try {
        const [fetchedStocks, fetchedOhlcv, fetchedForecast, fetchedPreds] = await Promise.allSettled([
          fetchStocks(),
          fetchOHLCV(selectedTicker, range),
          fetchForecast(selectedTicker),
          fetchPredictions({ ticker: selectedTicker, page: 1, pageSize: 4 })
        ])
        if (!mounted) return
        if (fetchedStocks.status === 'fulfilled' && fetchedStocks.value) {
          setStocks(fetchedStocks.value)
        }
        if (fetchedOhlcv.status === 'fulfilled' && fetchedOhlcv.value?.length > 0) {
          setOhlcvData(fetchedOhlcv.value)
        }
        if (fetchedForecast.status === 'fulfilled' && fetchedForecast.value) {
          setForecast(fetchedForecast.value)
        }
        if (fetchedPreds.status === 'fulfilled' && fetchedPreds.value?.records?.length > 0) {
          setRecentPredictions(fetchedPreds.value.records.slice(0, 4))
        }
      } catch (err) {
        console.warn('Dashboard load error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => { mounted = false }
  }, [selectedTicker, range])

  const stock = stocks.find(s => s.ticker === selectedTicker) || stocks[0]
  const ohlcv = ohlcvData.length > 0 ? ohlcvData : filterByRange(getOHLCV(selectedTicker), range)
  const chartData = ohlcv.map(r => ({ date: r.date, close: r.close }))
  const { bullish, bearish, neutral } = getSignalGroups()
  const activeForecast = forecast || DEMO_FORECASTS.find(f => f.ticker === selectedTicker)
  const isPrimary = stock.ticker === '^GSPC'

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <div className="dash-title-row">
            <h1 className="dash-title">Financial Research Dashboard</h1>
            {isPrimary ? (
              <span className="dash-primary-badge">Primary Model Asset (^GSPC)</span>
            ) : (
              <span className="dash-demo-badge">Demonstrative Stock Preview</span>
            )}
          </div>
          <p className="dash-subtitle">
            Educational time-series research &amp; directional trend forecasting — S&amp;P 500 Index
          </p>
        </div>
        <DataProvenanceLabel type="verified">
          Latest Daily Data: Yahoo Finance ^GSPC (2000–present)
        </DataProvenanceLabel>
      </div>

      {/* Dataset & Scope Banner */}
      <div className="dash-scope-banner">
        <Info size={16} className="dash-scope-icon" />
        <p className="dash-scope-text">
          <strong>Market Data Notice:</strong> Market data reflects the latest available daily session observations from Yahoo Finance (not real-time streaming tick data). ArthNex is trained on 6,738 historical daily sessions of the <strong>S&amp;P 500 Index (^GSPC)</strong> (2000–present) using exactly 6 raw OHLCV features and a 60-day lookback window.
        </p>
      </div>

      {/* Instrument selector strip */}
      <div className="market-strip" role="tablist" aria-label="Available instruments">
        {stocks.map(s => {
          const isSelected = selectedTicker === s.ticker
          const isGspc = s.ticker === '^GSPC'
          return (
            <button
              key={s.ticker}
              role="tab"
              className={`market-strip-item ${isSelected ? 'active' : ''} ${isGspc ? 'primary-item' : ''}`}
              onClick={() => setSelectedTicker(s.ticker)}
              aria-selected={isSelected}
            >
              <div className="ms-ticker-row">
                <span className="ms-ticker">{s.ticker}</span>
                {isGspc && <span className="ms-index-tag">CORE</span>}
              </div>
              <span className="ms-price">{formatPrice(s.currentPrice || s.mockPrice)}</span>
              <span className={`ms-change ${(s.changePct ?? s.mockChangePct) >= 0 ? 'pos' : 'neg'}`}>
                {(s.changePct ?? s.mockChangePct) >= 0 ? '↑' : '↓'} {Math.abs(s.changePct ?? s.mockChangePct).toFixed(2)}%
              </span>
            </button>
          )
        })}
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">

        {/* Primary chart */}
        <section className="dash-chart-section" aria-label={`${selectedTicker} price chart`}>
          <div className="dash-section-header">
            <div>
              <div className="dash-asset-header">
                <h2 className="dash-section-title">{stock?.name}</h2>
                <span className="dash-asset-tag">{stock.sector} · {stock.exchange}</span>
              </div>
              {loading ? <Skeleton width="120px" height="32px" /> :
                <span className="dash-price">{formatPrice(stock?.currentPrice || stock?.mockPrice)}</span>
              }
            </div>
            <ChartRangeSelector selected={range} onChange={setRange} />
          </div>
          {loading ? <ChartSkeleton height="240px" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-line)" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d?.slice(5)} />
                <YAxis hide domain={['auto','auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="close" stroke="var(--chart-line)" strokeWidth={1.5} fill="url(#dashGrad)" dot={false} activeDot={{ r:3, fill:'var(--terracotta)', stroke:'none' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="dash-chart-footer">
            <span className="dash-chart-legend">
              <span className="legend-indicator" /> Historical Close
            </span>
            <span className="dash-chart-meta">
              {ohlcv.length} trading sessions in range · Clean OHLCV series
            </span>
          </div>
          <p className="chart-sr-desc sr-only">{`Historical price chart for ${selectedTicker} — ${range} range.`}</p>
        </section>

        {/* Forecast panel */}
        <aside className="dash-forecast-panel">
          <div className="dash-forecast-header">
            <h2 className="dash-section-title">Next-Day Forecast</h2>
            <DataProvenanceLabel type={isPrimary ? 'demo' : 'illustrative'}>
              {isPrimary ? 'Core model target' : 'Demo prediction'}
            </DataProvenanceLabel>
          </div>

          {activeForecast ? (
            <div className="forecast-panel-body">
              <div className="forecast-badge-row">
                <SignalBadge signal={activeForecast.signal || activeForecast.trendClassification} size="md" />
                <span className="forecast-threshold-hint">Threshold: ±0.5%</span>
              </div>
              <div className="forecast-return">
                <span className="forecast-return-label">Predicted Return</span>
                <span className={`forecast-return-value ${activeForecast.predictedReturn >= 0 ? 'pos' : 'neg'}`}>
                  {formatReturn(activeForecast.predictedReturn)}
                </span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Predicted close</span>
                <span className="forecast-meta-value">{formatPrice(activeForecast.predictedClose)}</span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Last observed close</span>
                <span className="forecast-meta-value">{formatPrice(activeForecast.lastObservedClose || activeForecast.observedClose)}</span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Forecast target</span>
                <span className="forecast-meta-value font-data">{activeForecast.forecastFor}</span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Model version</span>
                <span className="forecast-meta-value font-data">{activeForecast.modelVersion}</span>
              </div>

              <div className="forecast-rule-box">
                <span className="rule-box-title">Classification Rule:</span>
                <span className="rule-box-item">Bullish: Return &gt; +0.5%</span>
                <span className="rule-box-item">Bearish: Return &lt; −0.5%</span>
                <span className="rule-box-item">Neutral: Within ±0.5%</span>
              </div>

              <Link to={`/app/forecast/${selectedTicker}`} className="forecast-detail-link">
                Detailed forecast analysis <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <p className="dash-unavailable">Forecast unavailable for {selectedTicker}</p>
          )}
        </aside>

        {/* Signal distribution across universe */}
        <section className="dash-signals">
          <h2 className="dash-section-title">Instrument Signal Distribution</h2>
          <div className="signal-dist">
            {[
              { label: 'Bullish (>+0.5%)', count: bullish.length, color: 'var(--bullish)', symbol: '↑' },
              { label: 'Neutral (±0.5%)', count: neutral.length, color: 'var(--neutral)', symbol: '→' },
              { label: 'Bearish (<−0.5%)', count: bearish.length, color: 'var(--bearish)', symbol: '↓' },
            ].map(item => (
              <div key={item.label} className="signal-dist-item">
                <div className="signal-dist-bar-wrap">
                  <div
                    className="signal-dist-bar"
                    style={{ height: `${(item.count / (stocks.length || 1)) * 70}px`, background: item.color }}
                    aria-hidden="true"
                  />
                </div>
                <span className="signal-dist-count" style={{ color: item.color }}>{item.symbol} {item.count}</span>
                <span className="signal-dist-label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Model Performance Summary card */}
        <section className="dash-perf-summary">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Model Status &amp; Specs</h2>
            <Link to="/scientist/performance" className="dash-view-all">
              Research lab <ArrowRight size={12} />
            </Link>
          </div>
          <div className="dash-perf-grid">
            <div className="perf-metric-item">
              <span className="pmi-label">Architecture</span>
              <span className="pmi-value">{MODEL_CONFIG.architecture}</span>
            </div>
            <div className="perf-metric-item">
              <span className="pmi-label">Lookback Window</span>
              <span className="pmi-value">{MODEL_CONFIG.lookback} Trading Days</span>
            </div>
            <div className="perf-metric-item">
              <span className="pmi-label">Features</span>
              <span className="pmi-value">6 Raw OHLCV Features</span>
            </div>
            <div className="perf-metric-item">
              <span className="pmi-label">Split Ratio</span>
              <span className="pmi-value">80 / 10 / 10 Chronological</span>
            </div>
          </div>
          <div className="dash-artifact-notice">
            <Clock size={14} className="notice-icon" />
            <span>
              Real evaluation metrics pending: Run <code>Stock_Trend_Forecaster.ipynb</code> to generate <code>metrics.json</code> &amp; weights.
            </span>
          </div>
        </section>

        {/* Recent prediction activity */}
        <section className="dash-watchlist">
          <div className="dash-section-header">
            <div>
              <h2 className="dash-section-title">Recent Prediction Log</h2>
              <p className="dash-table-sub">Deterministic prediction records with outcome verification</p>
            </div>
            <Link to="/app/predictions" className="dash-view-all">View all history <ArrowRight size={12} /></Link>
          </div>
          <table className="dash-table" aria-label="Recent predictions">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Signal</th>
                <th>Pred. Return</th>
                <th>Actual Return</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {recentPredictions.map(p => (
                <tr key={p.id}>
                  <td className="font-data">{p.predictionDate}</td>
                  <td>
                    <Link to={`/app/stocks/${p.ticker}`} className="dash-ticker-link">
                      {p.ticker}
                    </Link>
                  </td>
                  <td><SignalBadge signal={p.predictedDirection} size="sm" /></td>
                  <td className={p.predictedReturn >= 0 ? 'pos' : 'neg'}>
                    {formatReturn(p.predictedReturn)}
                  </td>
                  <td className={p.actualReturn >= 0 ? 'pos' : 'neg'}>
                    {p.actualReturn != null ? formatReturn(p.actualReturn) : '—'}
                  </td>
                  <td>
                    {p.correct === true ? (
                      <span className="outcome-tag outcome-correct"><CheckCircle2 size={12} /> Correct</span>
                    ) : p.correct === false ? (
                      <span className="outcome-tag outcome-incorrect"><AlertCircle size={12} /> Incorrect</span>
                    ) : (
                      <span className="outcome-tag outcome-pending"><Clock size={12} /> Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

      </div>
    </div>
  )
}
