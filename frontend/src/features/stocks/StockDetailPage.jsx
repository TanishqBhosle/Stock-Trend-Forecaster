import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useToast } from '@/components/ui/Toast'
import { getStock } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { getForecast } from '@/mocks/forecasts'
import { formatPrice, formatReturn } from '@/lib/signals'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine
} from 'recharts'
import './StockDetailPage.css'

function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="detail-tooltip">
      <span className="tt-date">{d?.date}</span>
      <span className="tt-value">Close: {formatPrice(d?.close)}</span>
      {d?.isForecast && <span className="tt-forecast">Illustrative forecast</span>}
    </div>
  )
}

export default function StockDetailPage() {
  const { ticker } = useParams()
  const [range, setRange] = useState('1Y')
  const { add, remove, has } = useWatchlist()
  const { addToast } = useToast()

  const stock = getStock(ticker)
  const forecast = getForecast(ticker)

  if (!stock) {
    return (
      <EmptyState
        illustration="search"
        title={`Ticker not found: ${ticker}`}
        description="This ticker is not in the demo dataset."
        actionLabel="Back to stocks"
        onAction={() => history.back()}
      />
    )
  }

  const allRows = getOHLCV(ticker)
  const rows = filterByRange(allRows, range)
  const chartData = rows.map(r => ({ ...r }))
  if (forecast) {
    chartData.push({
      date: forecast.forecastFor,
      close: forecast.predictedClose,
      open: forecast.predictedClose,
      high: forecast.predictedClose,
      low: forecast.predictedClose,
      volume: 0,
      isForecast: true,
    })
  }

  const lastRow = rows[rows.length - 1]
  const priceChange = lastRow && rows.length > 1
    ? ((rows[rows.length - 1].close - rows[rows.length - 2].close) / rows[rows.length - 2].close)
    : 0

  const inWatchlist = has(ticker)

  const toggleWatchlist = () => {
    if (inWatchlist) {
      remove(ticker)
      addToast(`${ticker} removed from watchlist`, { type: 'info' })
    } else {
      add(ticker)
      addToast(`${ticker} added to watchlist`, { type: 'success' })
    }
  }

  return (
    <div className="stock-detail">
      <div className="detail-header">
        <div className="detail-header-left">
          <Link to="/app/stocks" className="detail-back">← Stocks</Link>
          <div className="detail-title-row">
            <h1 className="detail-ticker">{ticker}</h1>
            <span className="detail-company">{stock.name}</span>
          </div>
          <div className="detail-price-row">
            <span className="detail-price">{formatPrice(stock.mockPrice)}</span>
            <span className={`detail-change ${priceChange >= 0 ? 'pos' : 'neg'}`}>
              {priceChange >= 0 ? '↑' : '↓'} {formatReturn(priceChange)}
            </span>
          </div>
        </div>
        <div className="detail-header-actions">
          <button
            className={`watchlist-btn ${inWatchlist ? 'active' : ''}`}
            onClick={toggleWatchlist}
            aria-label={inWatchlist ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
            aria-pressed={inWatchlist}
          >
            <Star size={16} fill={inWatchlist ? 'currentColor' : 'none'} />
            {inWatchlist ? 'Watching' : 'Watch'}
          </button>
          <Link to={`/app/forecast/${ticker}`} className="forecast-btn">
            View forecast →
          </Link>
          <DataProvenanceLabel type={ticker === '^GSPC' ? 'demo' : 'illustrative'}>
            {ticker === '^GSPC' ? 'Core Dataset (^GSPC)' : 'Illustrative Preview'}
          </DataProvenanceLabel>
        </div>
      </div>

      {/* Scope banner */}
      <div className="stock-detail-scope-callout">
        {ticker === '^GSPC' ? (
          <p>
            <strong>Primary Model Instrument (^GSPC):</strong> This is the primary dataset used for the ArthNex 2-layer stacked LSTM model. Trained on 24,800 daily records (1927–2026), 9 stationary engineered features, 70/15/15 chronological split, and a 60-day lookback window.
          </p>
        ) : (
          <p>
            <strong>Illustrative Equity Preview:</strong> The trained model pipeline is trained on the S&amp;P 500 (^GSPC). Forecasts and signals for {ticker} are deterministic demonstrative previews to illustrate single-stock analysis interfaces.
          </p>
        )}
      </div>

      {/* Price chart */}
      <section className="detail-chart-section" aria-label={`${ticker} price chart`}>
        <div className="detail-chart-header">
          <div>
            <h2 className="detail-section-title">Historical Price &amp; Forecast Overlay</h2>
            <div className="chart-legend-row">
              <span className="legend-item">
                <span className="legend-box observed-box" /> Observed Close
              </span>
              {forecast && (
                <span className="legend-item">
                  <span className="legend-box forecast-box" /> Forecast Target ({forecast.forecastFor})
                </span>
              )}
            </div>
          </div>
          <ChartRangeSelector selected={range} onChange={setRange} />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--chart-line)" stopOpacity={0.12}/>
                <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d?.slice(5)} />
            <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${v.toFixed(0)}`} width={50} domain={['auto','auto']} />
            <Tooltip content={<PriceTooltip />} />
            <Area type="monotone" dataKey="close" stroke="var(--chart-line)" strokeWidth={1.5} fill="url(#detailGrad)" dot={false} activeDot={{ r:3, fill:'var(--terracotta)', stroke:'none' }} />
            {forecast && (
              <Line type="monotone" dataKey={d => d.isForecast ? d.close : undefined} stroke="var(--chart-forecast)" strokeWidth={2} strokeDasharray="5 3" dot={{ r:4, fill:'var(--amber)', stroke:'none' }} />
            )}
            {forecast && (
              <ReferenceLine x={forecast.forecastFor} stroke="var(--amber)" strokeDasharray="4 3" strokeWidth={1} label={{ value:'Forecast', position:'insideTopRight', fontSize:9, fill:'var(--amber)', fontFamily:'var(--font-data)' }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <p className="sr-only">Historical price chart for {ticker} — {range} range. Illustrative demo data. Last close: {formatPrice(stock.mockPrice)}.</p>
      </section>

      {/* Volume chart */}
      <section className="detail-volume-section" aria-label={`${ticker} volume chart`}>
        <div className="detail-volume-header">
          <h2 className="detail-section-title">Trading Volume</h2>
          {ticker === '^GSPC' && (
            <span className="volume-context-note">
              Note: Pre-1950s records had 0 volume; volume is excluded from model feature set.
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={rows.slice(-60)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Bar dataKey="volume" fill="var(--chart-volume)" radius={[1,1,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* OHLC + Forecast grid */}
      <div className="detail-bottom-grid">
        <section className="detail-ohlc">
          <h2 className="detail-section-title">Latest OHLC</h2>
          {lastRow ? (
            <div className="ohlc-grid">
              {[
                { label: 'Open',  value: formatPrice(lastRow.open) },
                { label: 'High',  value: formatPrice(lastRow.high) },
                { label: 'Low',   value: formatPrice(lastRow.low) },
                { label: 'Close', value: formatPrice(lastRow.close) },
                { label: 'Volume', value: lastRow.volume?.toLocaleString() },
                { label: 'Date',  value: lastRow.date },
              ].map(item => (
                <div key={item.label} className="ohlc-item">
                  <span className="ohlc-label">{item.label}</span>
                  <span className="ohlc-value">{item.value}</span>
                </div>
              ))}
            </div>
          ) : <p className="detail-unavail">No OHLC data available</p>}
        </section>

        <section className="detail-forecast-summary">
          <h2 className="detail-section-title">Forecast summary</h2>
          <DataProvenanceLabel type="illustrative" />
          {forecast ? (
            <div className="forecast-summary-body">
              <SignalBadge signal={forecast.signal} />
              <div className="forecast-summary-grid">
                {[
                  { label: 'Expected return', value: formatReturn(forecast.predictedReturn), cls: forecast.predictedReturn >= 0 ? 'pos' : 'neg' },
                  { label: 'Predicted close', value: formatPrice(forecast.predictedClose), cls: '' },
                  { label: 'Last observed',   value: formatPrice(forecast.lastObservedClose), cls: '' },
                  { label: 'Forecast for',    value: forecast.forecastFor, cls: '' },
                  { label: 'Model version',   value: forecast.modelVersion, cls: '' },
                ].map(item => (
                  <div key={item.label} className="fs-item">
                    <span className="fs-label">{item.label}</span>
                    <span className={`fs-value ${item.cls}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <Link to={`/app/forecast/${ticker}`} className="forecast-full-link">
                Full forecast analysis →
              </Link>
            </div>
          ) : (
            <p className="detail-unavail">Forecast unavailable for this ticker</p>
          )}
        </section>
      </div>
    </div>
  )
}
