import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { DEMO_STOCKS } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { getForecast } from '@/mocks/forecasts'
import { ILLUSTRATIVE_METRICS } from '@/mocks/model'
import { formatReturn, formatPrice } from '@/lib/signals'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import './LandingPage.css'

// ── Ticker tape data ──────────────────────────────────────────────────────────
const TAPE_ITEMS = DEMO_STOCKS.filter(s => s.ticker !== '^GSPC').map(s => ({
  ticker: s.ticker,
  price: s.mockPrice,
  change: s.mockChangePct,
}))

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="landing-tooltip">
      <span className="landing-tooltip-date">{d.date}</span>
      <span className="landing-tooltip-value">{formatPrice(d.close)}</span>
      {d.isForecast && <span className="landing-tooltip-tag">Illustrative forecast</span>}
    </div>
  )
}

// ── Section reveal animation ──────────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Methodology steps ─────────────────────────────────────────────────────────
const METHODOLOGY_STEPS = [
  {
    num: '01',
    title: 'Historical Data',
    body: 'Nearly a century of S&P 500 daily OHLCV data (1927–2026) from Yahoo Finance. Price data is retained throughout; volume is excluded from the initial feature set due to missing records in the pre-1950s era.',
    visual: 'data',
  },
  {
    num: '02',
    title: 'Feature Engineering',
    body: 'Nine stationary input features derived from raw prices: daily returns, intraday volatility, moving-average ratios, realized volatility, and momentum signals. Stationarity prevents the scaler from extrapolating when test prices far exceed training prices.',
    visual: 'features',
  },
  {
    num: '03',
    title: 'Model Forecast',
    body: 'A two-layer stacked LSTM with 128 hidden units per layer processes 60-day sequences to predict the next-day return. The predicted price is recovered as Close[t] × (1 + predicted_return).',
    visual: 'model',
  },
  {
    num: '04',
    title: 'Trend Signal',
    body: 'The predicted return is classified into a directional signal: Bullish (> +0.5%), Neutral (±0.5%), or Bearish (< −0.5%). Color, symbol, and text are used together — never color alone.',
    visual: 'signal',
  },
  {
    num: '05',
    title: 'Performance Evaluation',
    body: 'The LSTM is benchmarked against a naive baseline (tomorrow = today) on identical test samples. Regression metrics (RMSE, MAE, MAPE) and directional accuracy are reported separately to avoid conflating regression with classification.',
    visual: 'evaluation',
  },
]

// ── Main component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [chartRange, setChartRange] = useState('6M')
  const [activeTicker, setActiveTicker] = useState('AAPL')
  const [activeStep, setActiveStep] = useState(0)
  const shouldReduce = useReducedMotion()

  const stock = DEMO_STOCKS.find(s => s.ticker === activeTicker) || DEMO_STOCKS[0]
  const allRows = getOHLCV(activeTicker)
  const rows = filterByRange(allRows, chartRange)
  const forecast = getForecast(activeTicker)

  // Build chart data: historical + 1 forecast point
  const chartData = rows.map(r => ({ date: r.date, close: r.close, isForecast: false }))
  if (forecast) {
    chartData.push({
      date: forecast.forecastFor,
      close: forecast.predictedClose,
      isForecast: true,
    })
  }

  return (
    <div className="landing">

      {/* ── Navigation ───────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-wordmark">
            <span className="landing-wordmark-text">Stock Trend Forecaster</span>
          </Link>
          <nav className="landing-nav-links" aria-label="Main navigation">
            <a href="#product" className="landing-nav-link">Product</a>
            <a href="#forecasting" className="landing-nav-link">Forecasting</a>
            <a href="#performance" className="landing-nav-link">Model Performance</a>
            <a href="#methodology" className="landing-nav-link">Methodology</a>
            <a href="#about" className="landing-nav-link">About</a>
          </nav>
          <div className="landing-nav-actions">
            <Link to="/login" className="landing-nav-link">Login</Link>
            <Link to="/signup">
              <Button size="sm" variant="primary">Get Started</Button>
            </Link>
          </div>
          {/* Mobile nav */}
          <Link to="/signup" className="landing-nav-mobile-cta">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* ── Ticker tape ──────────────────────────────────────── */}
      <div className="ticker-tape-wrap" aria-label="Demo ticker data" role="marquee">
        <span className="ticker-tape-label">Demo data</span>
        <div className="ticker-tape">
          <div className="ticker-tape-track" aria-hidden={!shouldReduce}>
            {[...TAPE_ITEMS, ...TAPE_ITEMS].map((item, i) => (
              <span key={i} className="ticker-tape-item">
                <span className="ticker-tape-ticker">{item.ticker}</span>
                <span className="ticker-tape-price">{formatPrice(item.price)}</span>
                <span className={`ticker-tape-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                  {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change).toFixed(2)}%
                </span>
                <span className="ticker-tape-sep" aria-hidden="true">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="landing-hero" aria-labelledby="hero-headline">
        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <motion.p
              className="landing-hero-eyebrow"
              initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              S&P 500 LSTM Research Tool
            </motion.p>
            <motion.h1
              id="hero-headline"
              className="landing-hero-headline"
              initial={shouldReduce ? {} : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Understand the trend.{' '}
              <span className="landing-hero-accent">Examine the evidence.</span>
            </motion.h1>
            <motion.p
              className="landing-hero-description"
              initial={shouldReduce ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              Explore historical market behaviour, inspect next-day price forecasts, and evaluate
              trend signals through transparent model-performance evidence.
            </motion.p>
            <motion.div
              className="landing-hero-ctas"
              initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link to="/signup">
                <Button size="lg" iconRight={<ArrowRight size={18} />}>
                  Explore the Platform
                </Button>
              </Link>
              <a href="#methodology">
                <Button size="lg" variant="ghost">How It Works</Button>
              </a>
            </motion.div>
          </div>

          {/* ── Hero chart preview ────────────────────────────── */}
          <motion.div
            className="landing-hero-preview"
            initial={shouldReduce ? {} : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Illustrative demo forecast preview"
          >
            <div className="preview-card">
              <div className="preview-header">
                <div className="preview-ticker-select">
                  {['AAPL', 'NVDA', 'MSFT', 'SPY'].map(t => (
                    <button
                      key={t}
                      className={`preview-ticker-btn ${activeTicker === t ? 'active' : ''}`}
                      onClick={() => setActiveTicker(t)}
                      aria-pressed={activeTicker === t}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <DataProvenanceLabel type="illustrative">Illustrative demo data</DataProvenanceLabel>
              </div>

              <div className="preview-price-row">
                <div>
                  <p className="preview-company">{stock.name}</p>
                  <p className="preview-price">{formatPrice(stock.mockPrice)}</p>
                </div>
                <div className="preview-signal-col">
                  <SignalBadge signal={stock.mockSignal} />
                  <span className={`preview-return ${stock.mockReturn >= 0 ? 'positive' : 'negative'}`}>
                    {formatReturn(stock.mockReturn)} forecast
                  </span>
                </div>
              </div>

              <ChartRangeSelector
                selected={chartRange}
                onChange={setChartRange}
              />

              <div className="preview-chart" aria-label={`Historical price chart for ${activeTicker} — illustrative data`}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--chart-line)" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontFamily: 'var(--font-data)', fontSize: 9, fill: 'var(--chart-axis)' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={d => d?.slice(5)}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="var(--chart-line)"
                      strokeWidth={1.5}
                      fill="url(#chartGrad)"
                      dot={false}
                      activeDot={{ r: 3, fill: 'var(--terracotta)', stroke: 'none' }}
                    />
                    {/* Forecast reference line */}
                    {forecast && (
                      <ReferenceLine
                        x={forecast.forecastFor}
                        stroke="var(--amber)"
                        strokeDasharray="4 3"
                        strokeWidth={1}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="preview-meta">
                <div className="preview-meta-row">
                  <span className="preview-meta-label">Forecast for</span>
                  <span className="preview-meta-value">{forecast?.forecastFor ?? '—'}</span>
                </div>
                <div className="preview-meta-row">
                  <span className="preview-meta-label">Model</span>
                  <span className="preview-meta-value">{forecast?.modelVersion ?? '—'}</span>
                </div>
                <div className="preview-meta-row">
                  <span className="preview-meta-label">Predicted close</span>
                  <span className={`preview-meta-value ${stock.mockReturn >= 0 ? 'positive' : 'negative'}`}>
                    {forecast ? formatPrice(forecast.predictedClose) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Product introduction ─────────────────────────────── */}
      <section id="product" className="landing-section landing-product">
        <div className="container">
          <div className="landing-product-grid">
            <div className="landing-product-text">
              <Reveal>
                <p className="section-number">01</p>
                <h2 className="landing-section-heading">
                  A research tool for inspecting forecasts,<br/>
                  not a signal generator to act on.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="landing-body">
                  Market forecasting models are surrounded by ambiguity — between what was
                  observed and what was predicted, between regression accuracy and directional
                  correctness, between a backtest and a live trading result.
                </p>
                <p className="landing-body">
                  Stock Trend Forecaster makes these distinctions explicit. Every data point
                  is labeled. Every metric is explained. Every limitation is stated.
                </p>
              </Reveal>
            </div>
            <div className="landing-product-distinctions">
              {[
                { label: 'Historical observations', desc: 'Actual closing prices and volume from a verified market dataset. Dated and sourced.', color: 'var(--chart-line)' },
                { label: 'Forecast outputs', desc: 'Next-day return predictions from the trained LSTM model, recovered as price values.', color: 'var(--amber)' },
                { label: 'Trend classification', desc: 'A directional signal derived from the predicted return using documented thresholds.', color: 'var(--teal)' },
                { label: 'Model evaluation', desc: 'Regression and directional accuracy metrics measured on a held-out chronological test set.', color: 'var(--terracotta)' },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.07}>
                  <div className="distinction-item">
                    <span className="distinction-dot" style={{ background: item.color }} />
                    <div>
                      <p className="distinction-label">{item.label}</p>
                      <p className="distinction-desc">{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Model performance ledger ─────────────────────────── */}
      <section id="performance" className="landing-section landing-performance">
        <div className="container">
          <Reveal>
            <p className="section-number">02</p>
            <h2 className="landing-section-heading">Model performance</h2>
            <p className="landing-body landing-performance-intro">
              Illustrative benchmark figures — for visual demonstration only.
              Real evaluation metrics are generated by running the training notebook.
            </p>
            <DataProvenanceLabel type="illustrative" className="landing-provenance" />
          </Reveal>

          <div className="perf-ledger">
            <div className="perf-ledger-header">
              <span className="perf-col-label">Metric</span>
              <span className="perf-col-label">LSTM</span>
              <span className="perf-col-label">Naive baseline</span>
              <span className="perf-col-label">Linear baseline</span>
            </div>
            <hr className="perf-rule" />
            {[
              { metric: 'RMSE (price units)', key: 'rmse', fmt: v => v?.toFixed(2) ?? '—' },
              { metric: 'MAE (price units)',  key: 'mae',  fmt: v => v?.toFixed(2) ?? '—' },
              { metric: 'MAPE',               key: 'mape', fmt: v => v != null ? `${(v * 100).toFixed(2)}%` : '—' },
              { metric: 'Directional accuracy', key: 'directionalAccuracy', fmt: v => v != null ? `${(v * 100).toFixed(1)}%` : '—' },
            ].map(({ metric, key, fmt }) => (
              <Reveal key={metric}>
                <div className="perf-ledger-row">
                  <span className="perf-metric-name">{metric}</span>
                  <span className="perf-value">{fmt(ILLUSTRATIVE_METRICS.lstm[key])}</span>
                  <span className="perf-value perf-value-muted">{fmt(ILLUSTRATIVE_METRICS.naiveBaseline[key])}</span>
                  <span className="perf-value perf-value-muted">{fmt(ILLUSTRATIVE_METRICS.linearBaseline[key])}</span>
                </div>
                <hr className="perf-row-rule" />
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="perf-note">
              Regression metrics (RMSE, MAE, MAPE) measure price-prediction accuracy.
              Directional accuracy measures whether the up/down direction was correct.
              These are separate questions and require separate evaluation.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── LSTM vs baselines ────────────────────────────────── */}
      <section id="forecasting" className="landing-section section-ink landing-baselines">
        <div className="container">
          <Reveal>
            <p className="section-number" style={{ color: 'rgba(169,188,196,0.55)' }}>03</p>
            <h2 className="landing-section-heading" style={{ color: 'var(--text-inverse)' }}>
              LSTM versus baselines
            </h2>
            <p className="landing-body" style={{ color: 'rgba(251,248,242,0.65)' }}>
              A model is only as informative as the comparison it is set against.
              The LSTM is evaluated on the same held-out test samples as the naive and
              linear baselines — using identical preprocessing and evaluation windows.
            </p>
            <DataProvenanceLabel type="illustrative" />
          </Reveal>

          <div className="baselines-grid">
            {[
              {
                name: 'LSTM (2×128)',
                type: 'Deep learning',
                rmse: ILLUSTRATIVE_METRICS.lstm.rmse,
                dirAcc: ILLUSTRATIVE_METRICS.lstm.directionalAccuracy,
                note: 'Trained on 9 stationary features with a 60-day lookback window.',
                highlight: true,
              },
              {
                name: 'Naive baseline',
                type: 'Statistical',
                rmse: ILLUSTRATIVE_METRICS.naiveBaseline.rmse,
                dirAcc: ILLUSTRATIVE_METRICS.naiveBaseline.directionalAccuracy,
                note: "Tomorrow's predicted price equals today's closing price.",
                highlight: false,
              },
              {
                name: 'Linear regression',
                type: 'Statistical',
                rmse: ILLUSTRATIVE_METRICS.linearBaseline.rmse,
                dirAcc: ILLUSTRATIVE_METRICS.linearBaseline.directionalAccuracy,
                note: 'OLS regression on the same 9 stationary features.',
                highlight: false,
              },
            ].map((m, i) => (
              <Reveal key={m.name} delay={i * 0.08}>
                <div className={`baseline-card ${m.highlight ? 'baseline-card-highlight' : ''}`}>
                  <div className="baseline-card-header">
                    <span className="baseline-card-type">{m.type}</span>
                    <h3 className="baseline-card-name">{m.name}</h3>
                  </div>
                  <div className="baseline-metrics">
                    <div className="baseline-metric">
                      <span className="baseline-metric-label">RMSE</span>
                      <span className="baseline-metric-value">{m.rmse?.toFixed(2) ?? '—'}</span>
                    </div>
                    <div className="baseline-metric">
                      <span className="baseline-metric-label">Dir. accuracy</span>
                      <span className="baseline-metric-value">{m.dirAcc != null ? `${(m.dirAcc * 100).toFixed(1)}%` : '—'}</span>
                    </div>
                  </div>
                  <p className="baseline-card-note">{m.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology sequence ─────────────────────────────── */}
      <section id="methodology" className="landing-section landing-methodology">
        <div className="container">
          <Reveal>
            <p className="section-number">04</p>
            <h2 className="landing-section-heading">How it works</h2>
          </Reveal>
          <div className="methodology-grid">
            <div className="methodology-steps">
              {METHODOLOGY_STEPS.map((step, i) => (
                <button
                  key={i}
                  className={`methodology-step ${activeStep === i ? 'methodology-step-active' : ''}`}
                  onClick={() => setActiveStep(i)}
                  aria-pressed={activeStep === i}
                >
                  <span className="methodology-step-num">{step.num}</span>
                  <span className="methodology-step-title">{step.title}</span>
                </button>
              ))}
            </div>
            <div className="methodology-detail">
              <motion.div
                key={activeStep}
                initial={shouldReduce ? {} : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
              >
                <p className="methodology-detail-num">{METHODOLOGY_STEPS[activeStep].num}</p>
                <h3 className="methodology-detail-title">{METHODOLOGY_STEPS[activeStep].title}</h3>
                <p className="methodology-detail-body">{METHODOLOGY_STEPS[activeStep].body}</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Limitations ──────────────────────────────────────── */}
      <section id="about" className="landing-section landing-limitations">
        <div className="container">
          <Reveal>
            <p className="section-number">05</p>
            <h2 className="landing-section-heading">Limitations and honest caveats</h2>
          </Reveal>
          <div className="limitations-body">
            {[
              {
                title: 'Forecast uncertainty',
                body: 'LSTM predictions carry inherent uncertainty. A directional accuracy above 50% does not mean the model is reliable enough for trading decisions. Confidence intervals are not currently provided.',
              },
              {
                title: 'Single-asset scope',
                body: 'The model was trained on S&P 500 index data only (^GSPC). Individual stock forecasts shown in this interface are illustrative demos, not outputs of a trained per-stock model.',
              },
              {
                title: 'Model drift',
                body: "Financial markets change over time. A model trained on 1927–2026 data may not generalize well to future market regimes. Walk-forward retraining is listed in the project roadmap but has not been implemented.",
              },
              {
                title: 'Backtest assumptions',
                body: 'Simulated backtest results ignore transaction costs, slippage, market impact, liquidity constraints, and corporate actions. Past simulated performance does not predict future results.',
              },
              {
                title: 'Not financial advice',
                body: 'This application is a research and educational tool. Nothing here constitutes investment advice. Do not make financial decisions based on these forecasts or backtest results.',
              },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="limitation-item">
                  <h3 className="limitation-title">{item.title}</h3>
                  <p className="limitation-body">{item.body}</p>
                </div>
                <hr className="limitation-rule" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="landing-section landing-cta">
        <div className="container">
          <Reveal>
            <h2 className="landing-cta-heading">
              Inspect the evidence<br/>before drawing conclusions.
            </h2>
            <p className="landing-body landing-cta-sub">
              A full research workspace for stock trend analysis, model evaluation, and backtesting.
            </p>
            <Link to="/signup">
              <Button size="lg" iconRight={<ArrowRight size={18} />}>
                Open the Platform
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="footer-wordmark">Stock Trend Forecaster</span>
              <p className="footer-tagline">Research-grade LSTM forecasting for the S&P 500.</p>
              <span className="footer-disclaimer">Demo data — not financial advice</span>
            </div>
            <div className="footer-links">
              <div className="footer-link-group">
                <p className="footer-link-heading">Product</p>
                <Link to="/app/dashboard" className="footer-link">Dashboard</Link>
                <Link to="/app/stocks" className="footer-link">Stocks</Link>
                <Link to="/app/forecast/AAPL" className="footer-link">Forecasts</Link>
                <Link to="/app/backtest" className="footer-link">Backtesting</Link>
              </div>
              <div className="footer-link-group">
                <p className="footer-link-heading">Methodology</p>
                <a href="#methodology" className="footer-link">How it works</a>
                <Link to="/app/model-card" className="footer-link">Model card</Link>
                <Link to="/scientist/performance" className="footer-link">Performance</Link>
              </div>
              <div className="footer-link-group">
                <p className="footer-link-heading">Account</p>
                <Link to="/login" className="footer-link">Login</Link>
                <Link to="/signup" className="footer-link">Get started</Link>
              </div>
            </div>
          </div>
          <hr className="footer-rule" />
          <div className="footer-bottom">
            <span className="footer-copy">
              Stock Trend Forecaster · Academic project · Not financial advice
            </span>
            <span className="footer-demo">Demo data only</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
