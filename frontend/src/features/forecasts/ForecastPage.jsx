import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { EmptyState } from '@/components/ui/EmptyState'
import { getStock } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { getForecast } from '@/mocks/forecasts'
import { MODEL_CONFIG } from '@/mocks/model'
import { formatPrice, formatReturn, signalSymbol } from '@/lib/signals'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import './ForecastPage.css'

function ForecastTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="forecast-tt">
      <span>{d?.date}</span>
      <span>{formatPrice(d?.close)}</span>
      {d?.isForecast && <span className="tt-fc">Illustrative forecast</span>}
    </div>
  )
}

export default function ForecastPage() {
  const { ticker } = useParams()
  const [range, setRange] = useState('3M')

  const stock = getStock(ticker)
  const forecast = getForecast(ticker)

  if (!stock) {
    return <EmptyState illustration="search" title={`Ticker not found: ${ticker}`} description="Not in demo dataset." actionLabel="View stocks" onAction={() => history.back()} />
  }

  const rows = filterByRange(getOHLCV(ticker), range)
  const chartData = rows.map(r => ({ date: r.date, close: r.close }))
  if (forecast) {
    chartData.push({ date: forecast.forecastFor, close: forecast.predictedClose, isForecast: true })
  }

  const signalSym = forecast ? signalSymbol(forecast.signal) : '—'

  return (
    <div className="forecast-page">
      <div className="forecast-page-header">
        <div>
          <Link to={`/app/stocks/${ticker}`} className="forecast-back">← {ticker}</Link>
          <h1 className="forecast-headline">
            <span className="forecast-headline-ticker">{ticker}</span>
            Next-day forecast
          </h1>
          <p className="forecast-company">{stock.name}</p>
        </div>
        <DataProvenanceLabel type="illustrative">Illustrative forecast</DataProvenanceLabel>
      </div>

      <div className="forecast-layout">
        {/* Main forecast panel */}
        <main className="forecast-main">
          {/* Big figure */}
          <div className="forecast-figure">
            <div className="forecast-figure-left">
              <p className="forecast-figure-label">Expected return</p>
              {forecast ? (
                <p className={`forecast-figure-value ${forecast.predictedReturn >= 0 ? 'pos' : 'neg'}`}>
                  {signalSym} {formatReturn(forecast.predictedReturn)}
                </p>
              ) : (
                <p className="forecast-figure-value unavail">Model unavailable</p>
              )}
            </div>
            <div className="forecast-figure-right">
              {forecast ? <SignalBadge signal={forecast.signal} size="md" /> : null}
              <p className="forecast-figure-sub">
                Predicted close: {forecast ? formatPrice(forecast.predictedClose) : '—'}
              </p>
              <p className="forecast-figure-sub">
                Last observed: {formatPrice(stock.mockPrice)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="forecast-chart-wrap">
            <div className="forecast-chart-header">
              <h2 className="forecast-section-title">Historical + forecast</h2>
              <ChartRangeSelector selected={range} onChange={setRange} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--chart-line)" stopOpacity={0.10}/>
                    <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d?.slice(5)} />
                <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${v.toFixed(0)}`} width={50} domain={['auto','auto']} />
                <Tooltip content={<ForecastTooltip />} />
                <Area type="monotone" dataKey="close" stroke="var(--chart-line)" strokeWidth={1.5} fill="url(#fcGrad)" dot={false} activeDot={{ r:3, fill:'var(--terracotta)', stroke:'none' }} />
                {forecast && (
                  <>
                    <ReferenceLine x={forecast.forecastFor} stroke="var(--amber)" strokeDasharray="4 3" strokeWidth={1} />
                    <Line type="monotone" dataKey={d => d.isForecast ? d.close : undefined} stroke="var(--amber)" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r:5, fill:'var(--amber)', stroke:'var(--bg-elevated)', strokeWidth:2 }} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
            <p className="sr-only">Chart showing {range} historical price for {ticker} with an illustrative next-day forecast point.</p>
          </div>

          {/* How return is calculated */}
          <div className="forecast-explainer">
            <h2 className="forecast-section-title">How the expected return is calculated</h2>
            <p className="forecast-explainer-text">
              The LSTM model predicts the <em>next-day return</em> as a decimal (e.g., 0.008 for +0.8%).
              The predicted closing price is then recovered as:
            </p>
            <div className="forecast-formula">
              <code>predicted_price = Close[t] × (1 + predicted_return)</code>
            </div>
            <p className="forecast-explainer-text">
              This approach uses a stationary target (returns) rather than raw price levels,
              which prevents the StandardScaler from extrapolating when prices far exceed
              training-period values.
            </p>
          </div>
        </main>

        {/* Evidence sidebar */}
        <aside className="forecast-sidebar">
          <section className="forecast-evidence">
            <h2 className="forecast-section-title">Forecast metadata</h2>
            {forecast ? (
              <div className="evidence-rows">
                {[
                  { label: 'Forecast date',   value: forecast.forecastDate },
                  { label: 'Forecast for',    value: forecast.forecastFor },
                  { label: 'Model version',   value: forecast.modelVersion },
                  { label: 'Horizon',         value: '1 trading day' },
                  { label: 'Architecture',    value: MODEL_CONFIG.architecture },
                  { label: 'Lookback',        value: `${MODEL_CONFIG.lookback} days` },
                  { label: 'Input features',  value: `${MODEL_CONFIG.features.length}` },
                ].map(row => (
                  <div key={row.label} className="evidence-row">
                    <span className="ev-label">{row.label}</span>
                    <span className="ev-value">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="model-unavailable-note">
                Model unavailable — run the training notebook to generate forecast artifacts.
              </p>
            )}
          </section>

          <section className="forecast-limitations">
            <h2 className="forecast-section-title">Limitations</h2>
            <ul className="limitations-list">
              {MODEL_CONFIG.limitations.slice(0, 3).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <Link to="/app/model-card" className="forecast-modelcard-link">Full model card →</Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
