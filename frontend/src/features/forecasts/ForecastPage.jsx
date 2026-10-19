import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { EmptyState } from '@/components/ui/EmptyState'
import { getStock } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { getForecast } from '@/mocks/forecasts'
import { MODEL_CONFIG } from '@/mocks/model'
import { formatPrice, formatReturn, signalSymbol } from '@/lib/signals'
import { fetchStock, fetchForecast, fetchOHLCV } from '@/services/stockService'
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
      {d?.isForecast && <span className="tt-fc">{d?.dataStatus === 'verified' ? 'Model forecast' : 'Illustrative forecast'}</span>}
    </div>
  )
}

export default function ForecastPage() {
  const { ticker } = useParams()
  const [range, setRange] = useState('3M')
  const [stock, setStock] = useState(() => getStock(ticker))
  const [forecast, setForecast] = useState(() => getForecast(ticker))
  const [ohlcvRows, setOhlcvRows] = useState([])

  useEffect(() => {
    let mounted = true
    async function loadForecastData() {
      try {
        const [stk, fc, ohlc] = await Promise.allSettled([
          fetchStock(ticker),
          fetchForecast(ticker),
          fetchOHLCV(ticker, range)
        ])
        if (!mounted) return
        if (stk.status === 'fulfilled' && stk.value) setStock(stk.value)
        if (fc.status === 'fulfilled' && fc.value) setForecast(fc.value)
        if (ohlc.status === 'fulfilled' && ohlc.value?.length > 0) setOhlcvRows(ohlc.value)
      } catch (err) {
        console.warn('Error loading live forecast data:', err)
      }
    }
    loadForecastData()
    return () => { mounted = false }
  }, [ticker, range])

  if (!stock) {
    return <EmptyState illustration="search" title={`Ticker not found: ${ticker}`} description="Not in demo dataset." actionLabel="View stocks" onAction={() => history.back()} />
  }

  const rows = ohlcvRows.length > 0 ? ohlcvRows : filterByRange(getOHLCV(ticker), range)
  const chartData = rows.map(r => ({ date: r.date, close: r.close }))
  if (forecast) {
    chartData.push({
      date: forecast.forecastFor,
      close: forecast.predictedClose,
      isForecast: true,
      dataStatus: forecast.dataStatus
    })
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
        <DataProvenanceLabel type={forecast?.dataStatus === 'verified' ? 'verified' : 'illustrative'}>
          {forecast?.dataStatus === 'verified' ? 'Verified LSTM Forecast' : 'Illustrative forecast'}
        </DataProvenanceLabel>
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

          {/* How return is calculated & Threshold rules */}
          <div className="forecast-explainer">
            <h2 className="forecast-section-title">Model Target &amp; Price Recovery Methodology</h2>
            <p className="forecast-explainer-text">
              The 2-layer stacked LSTM predicts the <em>stationary next-day return</em> as a continuous decimal.
              The predicted closing price is then recovered deterministically using today's observed closing price:
            </p>
            <div className="forecast-formula">
              <code>predicted_price = Close[t] × (1 + predicted_return)</code>
            </div>
            <p className="forecast-explainer-text">
              Predicting returns rather than raw price levels prevents out-of-distribution extrapolation
              when modern prices (over 5,000) exceed training set historical averages (~500).
            </p>

            <h3 className="forecast-thresholds-heading">Directional Trend Classification Rules</h3>
            <div className="forecast-thresholds-grid">
              <div className="threshold-rule-card bullish-rule">
                <span className="trc-label">BULLISH</span>
                <span className="trc-condition">Predicted Return &gt; +0.50% (+0.005)</span>
                <span className="trc-desc">Upward price movement exceeds noise boundary.</span>
              </div>
              <div className="threshold-rule-card neutral-rule">
                <span className="trc-label">NEUTRAL</span>
                <span className="trc-condition">−0.50% &le; Predicted Return &le; +0.50%</span>
                <span className="trc-desc">Movement within normal intraday volatility band.</span>
              </div>
              <div className="threshold-rule-card bearish-rule">
                <span className="trc-label">BEARISH</span>
                <span className="trc-condition">Predicted Return &lt; −0.50% (−0.005)</span>
                <span className="trc-desc">Downward price movement exceeds noise boundary.</span>
              </div>
            </div>
          </div>
        </main>

        {/* Evidence sidebar */}
        <aside className="forecast-sidebar">
          <section className="forecast-evidence">
            <h2 className="forecast-section-title">Forecast Metadata</h2>
            {forecast ? (
              <div className="evidence-rows">
                {[
                  { label: 'Forecast generated', value: forecast.forecastDate },
                  { label: 'Forecast target date', value: forecast.forecastFor },
                  { label: 'Horizon', value: '1 trading day (close-to-close)' },
                  { label: 'Model version', value: forecast.modelVersion },
                  { label: 'Architecture', value: MODEL_CONFIG.architecture },
                  { label: 'Lookback window', value: `${MODEL_CONFIG.lookback} days` },
                  { label: 'Input features', value: `${MODEL_CONFIG.features.length} stationary returns/ratios` },
                  { label: 'Primary dataset', value: MODEL_CONFIG.dataset.source },
                  { label: 'Dataset range', value: MODEL_CONFIG.dataset.dateRange },
                ].map(row => (
                  <div key={row.label} className="evidence-row">
                    <span className="ev-label">{row.label}</span>
                    <span className="ev-value font-data">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="model-unavailable-note">
                Model unavailable — run the training notebook to generate forecast artifacts.
              </p>
            )}
          </section>

          <section className="forecast-scope-box">
            <h3 className="scope-box-title">Instrument Scope</h3>
            <p className="scope-box-text">
              {ticker === '^GSPC'
                ? 'This forecast targets ^GSPC, the verified single-asset training set of ArthNex.'
                : `Note: The LSTM model is trained on S&P 500 (^GSPC). Single-stock forecast for ${ticker} is demonstrative.`}
            </p>
          </section>

          <section className="forecast-limitations">
            <h2 className="forecast-section-title">Known Limitations</h2>
            <ul className="limitations-list">
              {MODEL_CONFIG.limitations.slice(0, 4).map((l, i) => (
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
