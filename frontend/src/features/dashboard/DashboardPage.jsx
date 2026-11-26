import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info, AlertCircle, CheckCircle2, Clock, Activity, ShieldCheck } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { DEMO_STOCKS, getSignalGroups } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { DEMO_FORECASTS } from '@/mocks/forecasts'
import { DEMO_PREDICTIONS } from '@/mocks/predictions'
import { MODEL_CONFIG } from '@/mocks/model'
import { formatPrice, formatReturn } from '@/lib/signals'
import { fetchStocks, fetchOHLCV, fetchForecast, fetchPredictions, fetchModelConfig } from '@/services/stockService'
import { SectorHeatmapWidget } from '@/components/intelligence/SectorHeatmapWidget'
import { MacroNewsWidget } from '@/components/intelligence/MacroNewsWidget'
import { InteractiveCandleChart } from '@/components/charts/InteractiveCandleChart'
import './DashboardPage.css'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('3M')
  const [selectedTicker, setSelectedTicker] = useState('^GSPC')
  const [stocks, setStocks] = useState(DEMO_STOCKS)
  const [ohlcvData, setOhlcvData] = useState([])
  const [forecast, setForecast] = useState(null)
  const [recentPredictions, setRecentPredictions] = useState(DEMO_PREDICTIONS.slice(0, 5))
  const [modelCfg, setModelCfg] = useState(MODEL_CONFIG)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      setLoading(true)
      try {
        const [fetchedStocks, fetchedOhlcv, fetchedForecast, fetchedPreds, fetchedCfg] = await Promise.allSettled([
          fetchStocks(),
          fetchOHLCV(selectedTicker, range),
          fetchForecast(selectedTicker),
          fetchPredictions({ ticker: selectedTicker, page: 1, pageSize: 5 }),
          fetchModelConfig()
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
          setRecentPredictions(fetchedPreds.value.records.slice(0, 5))
        }
        if (fetchedCfg.status === 'fulfilled' && fetchedCfg.value) {
          setModelCfg(fetchedCfg.value)
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
  const { bullish, bearish, neutral } = getSignalGroups()
  const activeForecast = forecast || DEMO_FORECASTS.find(f => f.ticker === selectedTicker)
  const isPrimary = stock.ticker === '^GSPC'

  const signalItems = [
    { label: 'Bullish (>+0.051%)', count: bullish.length, color: 'var(--bullish)', symbol: '↑' },
    { label: 'Neutral (−0.049% to +0.051%)', count: neutral.length, color: 'var(--neutral)', symbol: '→' },
    { label: 'Bearish (<−0.049%)', count: bearish.length, color: 'var(--bearish)', symbol: '↓' },
  ]
  const totalSignals = signalItems.reduce((acc, curr) => acc + curr.count, 0) || 1

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
          <strong>Market Data Notice:</strong> Market data reflects the latest daily session observations from Yahoo Finance (end-of-day close). ArthNex is trained on 6,764 historical daily sessions of the <strong>S&amp;P 500 Index (^GSPC)</strong> using 6 raw OHLCV features and a 60-day lookback window (80/10/10 chronological split).
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

      {/* Section 1: Hero Chart + Next-Day Forecast */}
      <div className="dash-hero-grid">
        {/* Primary chart */}
        <section className="dash-chart-section" aria-label={`${selectedTicker} price chart`}>
          <div className="dash-section-header">
            <div>
              <div className="dash-asset-header">
                <h2 className="dash-section-title">{stock?.name}</h2>
                <span className="dash-asset-tag">{stock.sector} · {stock.exchange}</span>
              </div>
              {loading ? (
                <Skeleton width="120px" height="32px" />
              ) : (
                <span className="dash-price">{formatPrice(stock?.currentPrice || stock?.mockPrice)}</span>
              )}
            </div>
            <ChartRangeSelector selected={range} onChange={setRange} />
          </div>
          {loading ? (
            <ChartSkeleton height="300px" />
          ) : (
            <InteractiveCandleChart
              data={ohlcv}
              forecast={activeForecast}
              height={300}
            />
          )}
          <p className="chart-sr-desc sr-only">{`Interactive candlestick and predictive cone chart for ${selectedTicker} — ${range} range.`}</p>
        </section>

        {/* Forecast panel */}
        <aside className="dash-forecast-panel">
          <div className="dash-forecast-header">
            <div>
              <h2 className="dash-section-title">Next-Day Forecast</h2>
              <p className="dash-forecast-sub">Model direction &amp; implied level</p>
            </div>
            <DataProvenanceLabel type={isPrimary ? 'demo' : 'illustrative'}>
              {isPrimary ? 'Core target' : 'Demo prediction'}
            </DataProvenanceLabel>
          </div>

          {activeForecast ? (
            <div className="forecast-panel-body">
              <div className="forecast-badge-row">
                <SignalBadge signal={activeForecast.signal || activeForecast.trendClassification} size="md" />
                <span className="forecast-threshold-hint">Threshold: +0.051% / −0.049%</span>
              </div>
              <div className="forecast-return">
                <span className="forecast-return-label">Predicted Return</span>
                <span className={`forecast-return-value ${activeForecast.predictedReturn >= 0 ? 'pos' : 'neg'}`}>
                  {formatReturn(activeForecast.predictedReturn)}
                </span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Predicted close</span>
                <span className="forecast-meta-value font-data">{formatPrice(activeForecast.predictedClose)}</span>
              </div>
              <div className="forecast-close-row">
                <span className="forecast-meta-label">Last observed close</span>
                <span className="forecast-meta-value font-data">{formatPrice(activeForecast.lastObservedClose || activeForecast.observedClose)}</span>
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
                <span className="rule-box-title">Classification Rule</span>
                <span className="rule-box-item">&bull; Bullish: Return &gt; +0.051%</span>
                <span className="rule-box-item">&bull; Bearish: Return &lt; −0.049%</span>
                <span className="rule-box-item">&bull; Neutral: −0.049% to +0.051%</span>
              </div>

              <Link to={`/app/forecast/${selectedTicker}`} className="forecast-detail-link">
                Detailed forecast analysis <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <p className="dash-unavailable">Forecast unavailable for {selectedTicker}</p>
          )}
        </aside>
      </div>

      {/* Section 2: Distribution + Model Specs side by side */}
      <div className="dash-middle-grid">
        {/* Signal distribution across universe */}
        <section className="dash-signals">
          <div className="dash-section-header">
            <div>
              <h2 className="dash-section-title">Instrument Signal Distribution</h2>
              <p className="dash-card-subtitle">Distribution across tracked market universe</p>
            </div>
            <span className="dash-header-tag">{totalSignals} Instruments</span>
          </div>

          <div className="signal-dist-container">
            <div className="signal-dist">
              {signalItems.map(item => {
                const pct = Math.round((item.count / totalSignals) * 100)
                return (
                  <div key={item.label} className="signal-dist-item">
                    <div className="signal-dist-bar-wrap">
                      <div
                        className="signal-dist-bar"
                        style={{
                          height: `${Math.max(16, pct)}%`,
                          background: item.color
                        }}
                        title={`${item.count} items (${pct}%)`}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="signal-dist-count" style={{ color: item.color }}>
                      {item.symbol} {item.count} <span className="signal-dist-pct">({pct}%)</span>
                    </span>
                    <span className="signal-dist-label">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Model Performance Summary card */}
        <section className="dash-perf-summary">
          <div className="dash-section-header">
            <div>
              <h2 className="dash-section-title">Model Status &amp; Specs</h2>
              <p className="dash-card-subtitle">PyTorch Stacked LSTM Architecture</p>
            </div>
            <Link to="/scientist/performance" className="dash-view-all">
              Research lab <ArrowRight size={13} />
            </Link>
          </div>

          <div className="dash-perf-grid">
            <div className="perf-metric-item">
              <span className="pmi-label">Architecture</span>
              <span className="pmi-value">{modelCfg.architecture || '2-layer LSTM (64 hidden)'}</span>
            </div>
            <div className="perf-metric-item">
              <span className="pmi-label">Lookback Window</span>
              <span className="pmi-value">{modelCfg.lookback || 60} Trading Days</span>
            </div>
            <div className="perf-metric-item">
              <span className="pmi-label">Features</span>
              <span className="pmi-value">6 Raw OHLCV</span>
            </div>
            <div className="perf-metric-item">
              <span className="pmi-label">Split Ratio</span>
              <span className="pmi-value">80 / 10 / 10 Chronological</span>
            </div>
          </div>

          <div className="dash-artifact-notice verified">
            <CheckCircle2 size={16} className="notice-icon-verified" />
            <span>
              <strong>Verified Active Model:</strong> LSTM v1.0 (6,764 sessions · 80/10/10 split). Directional Accuracy: <strong>55.39%</strong> &middot; Test RMSE: <strong>0.0097</strong>.
            </span>
          </div>
        </section>
      </div>

      {/* Section 3: Intelligence Row (Sector Heatmap + Macro News Feed) */}
      <div className="dash-intelligence-grid">
        <SectorHeatmapWidget />
        <MacroNewsWidget />
      </div>

      {/* Section 4: Recent prediction activity */}
      <section className="dash-watchlist">
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section-title">Recent Prediction Log</h2>
            <p className="dash-table-sub">Deterministic prediction records with realized outcome verification</p>
          </div>
          <Link to="/app/predictions" className="dash-view-all">View all history <ArrowRight size={13} /></Link>
        </div>
        <div className="dash-table-wrap">
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
                  <td className={p.predictedReturn >= 0 ? 'pos font-data' : 'neg font-data'}>
                    {formatReturn(p.predictedReturn)}
                  </td>
                  <td className={p.actualReturn >= 0 ? 'pos font-data' : 'neg font-data'}>
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
        </div>
      </section>
    </div>
  )
}
