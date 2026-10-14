import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { DEMO_STOCKS, getSignalGroups } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { DEMO_FORECASTS } from '@/mocks/forecasts'
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('3M')
  const [selectedTicker, setSelectedTicker] = useState('AAPL')

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(t)
  }, [])

  const stock = DEMO_STOCKS.find(s => s.ticker === selectedTicker)
  const ohlcv = filterByRange(getOHLCV(selectedTicker), range)
  const chartData = ohlcv.map(r => ({ date: r.date, close: r.close }))
  const { bullish, bearish, neutral } = getSignalGroups()
  const forecast = DEMO_FORECASTS.find(f => f.ticker === selectedTicker)

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">Market overview and trend signals</p>
        </div>
        <DataProvenanceLabel type="demo" />
      </div>

      {/* Market strip */}
      <div className="market-strip">
        {DEMO_STOCKS.filter(s => s.ticker !== '^GSPC').slice(0, 7).map(s => (
          <button
            key={s.ticker}
            className={`market-strip-item ${selectedTicker === s.ticker ? 'active' : ''}`}
            onClick={() => setSelectedTicker(s.ticker)}
            aria-pressed={selectedTicker === s.ticker}
          >
            <span className="ms-ticker">{s.ticker}</span>
            <span className="ms-price">{formatPrice(s.mockPrice)}</span>
            <span className={`ms-change ${s.mockChangePct >= 0 ? 'pos' : 'neg'}`}>
              {s.mockChangePct >= 0 ? '↑' : '↓'} {Math.abs(s.mockChangePct).toFixed(2)}%
            </span>
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">

        {/* Primary chart */}
        <section className="dash-chart-section" aria-label={`${selectedTicker} price chart`}>
          <div className="dash-section-header">
            <div>
              <h2 className="dash-section-title">{stock?.name}</h2>
              {loading ? <Skeleton width="80px" height="28px" /> :
                <span className="dash-price">{formatPrice(stock?.mockPrice)}</span>
              }
            </div>
            <ChartRangeSelector selected={range} onChange={setRange} />
          </div>
          {loading ? <ChartSkeleton height="220px" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-line)" stopOpacity={0.10}/>
                    <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d.slice(5)} />
                <YAxis hide domain={['auto','auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="close" stroke="var(--chart-line)" strokeWidth={1.5} fill="url(#dashGrad)" dot={false} activeDot={{ r:3, fill:'var(--terracotta)', stroke:'none' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <p className="chart-sr-desc sr-only">{`Historical price chart for ${selectedTicker} — ${range} range. Illustrative demo data.`}</p>
        </section>

        {/* Forecast panel */}
        <aside className="dash-forecast-panel">
          <h2 className="dash-section-title">Next-day forecast</h2>
          <DataProvenanceLabel type="illustrative" />
          {forecast ? (
            <div className="forecast-panel-body">
              <SignalBadge signal={forecast.signal} size="md" />
              <div className="forecast-return">
                <span className="forecast-return-label">Expected return</span>
                <span className={`forecast-return-value ${forecast.predictedReturn >= 0 ? 'pos' : 'neg'}`}>
                  {formatReturn(forecast.predictedReturn)}
                </span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Predicted close</span>
                <span className="forecast-meta-value">{formatPrice(forecast.predictedClose)}</span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Last observed</span>
                <span className="forecast-meta-value">{formatPrice(forecast.lastObservedClose)}</span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Forecast for</span>
                <span className="forecast-meta-value font-data">{forecast.forecastFor}</span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Model</span>
                <span className="forecast-meta-value font-data">{forecast.modelVersion}</span>
              </div>
              <Link to={`/app/forecast/${selectedTicker}`} className="forecast-detail-link">
                Full analysis <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <p className="dash-unavailable">Forecast unavailable</p>
          )}
        </aside>

        {/* Signal distribution */}
        <section className="dash-signals">
          <h2 className="dash-section-title">Signal distribution</h2>
          <div className="signal-dist">
            {[
              { label: 'Bullish', count: bullish.length, color: 'var(--bullish)', symbol: '↑' },
              { label: 'Neutral', count: neutral.length, color: 'var(--neutral)', symbol: '→' },
              { label: 'Bearish', count: bearish.length, color: 'var(--bearish)', symbol: '↓' },
            ].map(item => (
              <div key={item.label} className="signal-dist-item">
                <div className="signal-dist-bar-wrap">
                  <div
                    className="signal-dist-bar"
                    style={{ height: `${(item.count / DEMO_STOCKS.length) * 80}px`, background: item.color }}
                    aria-hidden="true"
                  />
                </div>
                <span className="signal-dist-count" style={{ color: item.color }}>{item.symbol} {item.count}</span>
                <span className="signal-dist-label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Watchlist preview */}
        <section className="dash-watchlist">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Top signals</h2>
            <Link to="/app/stocks" className="dash-view-all">View all <ArrowRight size={12} /></Link>
          </div>
          <table className="dash-table" aria-label="Top signals">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Price</th>
                <th>Return</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_STOCKS.filter(s => s.ticker !== '^GSPC').slice(0, 8).map(s => (
                <tr key={s.ticker}>
                  <td>
                    <Link to={`/app/stocks/${s.ticker}`} className="dash-ticker-link">
                      {s.ticker}
                    </Link>
                  </td>
                  <td>{formatPrice(s.mockPrice)}</td>
                  <td className={s.mockReturn >= 0 ? 'pos' : 'neg'}>
                    {formatReturn(s.mockReturn)}
                  </td>
                  <td><SignalBadge signal={s.mockSignal} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
