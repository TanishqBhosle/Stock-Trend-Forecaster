import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import {
  ArrowRight, TrendingUp, BarChart2, FlaskConical, ChevronRight,
  Activity, Database, Cpu, Shield, ArrowUpRight
} from 'lucide-react'
import { ArthNexLogo } from '@/components/ui/ArthNexLogo'
import { DEMO_STOCKS } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { getForecast } from '@/mocks/forecasts'
import { formatReturn, formatPrice } from '@/lib/signals'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import './LandingPage.css'

// ── Scroll-aware navbar ──────────────────────────────────────────────────────
function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={`ln-nav ${scrolled ? 'ln-nav--scrolled' : ''}`} role="banner">
      <div className="ln-nav__inner">
        {/* Logo */}
        <Link to="/" className="ln-nav__logo-link" aria-label="ArthNex home">
          <ArthNexLogo variant="horizontal" size="sm" />
        </Link>

        {/* Center links */}
        <nav className="ln-nav__links" aria-label="Main navigation">
          <a href="#product" className="ln-nav__link">Platform</a>
          <a href="#forecasting" className="ln-nav__link">Forecasting</a>
          <a href="#research" className="ln-nav__link">Research</a>
          <a href="#methodology" className="ln-nav__link">Methodology</a>
        </nav>

        {/* Actions */}
        <div className="ln-nav__actions">
          <Link to="/login" className="ln-nav__sign-in">Sign In</Link>
          <Link to="/signup" className="ln-nav__cta">
            Get Started <ArrowRight size={14} />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="ln-nav__hamburger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(v => !v)}
        >
          <span className={`ln-hamburger__bar ${mobileOpen ? 'open' : ''}`} />
          <span className={`ln-hamburger__bar ${mobileOpen ? 'open' : ''}`} />
          <span className={`ln-hamburger__bar ${mobileOpen ? 'open' : ''}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="ln-nav__mobile-menu" role="dialog" aria-label="Navigation menu">
          <nav aria-label="Mobile navigation">
            <a href="#product" className="ln-mobile__link" onClick={() => setMobileOpen(false)}>Platform</a>
            <a href="#forecasting" className="ln-mobile__link" onClick={() => setMobileOpen(false)}>Forecasting</a>
            <a href="#research" className="ln-mobile__link" onClick={() => setMobileOpen(false)}>Research</a>
            <a href="#methodology" className="ln-mobile__link" onClick={() => setMobileOpen(false)}>Methodology</a>
          </nav>
          <div className="ln-mobile__actions">
            <Link to="/login" className="ln-mobile__sign-in" onClick={() => setMobileOpen(false)}>Sign In</Link>
            <Link to="/signup" className="ln-mobile__cta" onClick={() => setMobileOpen(false)}>Get Started</Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ── Reveal animation wrapper ─────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 24, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-72px' })
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={shouldReduce ? {} : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Hero chart tooltip ───────────────────────────────────────────────────────
function HeroTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="ln-tooltip">
      <span className="ln-tooltip__date">{d.date}</span>
      <span className="ln-tooltip__value">{formatPrice(d.close)}</span>
      {d.isForecast && <span className="ln-tooltip__tag">Model Forecast</span>}
    </div>
  )
}

// ── Compact model performance bars ───────────────────────────────────────────
const PERF_BAR_DATA = [
  { name: 'LSTM', dirAcc: 53.8, rmse: 42.18, color: '#2F7F7A' },
  { name: 'Naive', dirAcc: 49.1, rmse: 45.92, color: '#8A7F73' },
  { name: 'Linear', dirAcc: 48.3, rmse: 47.34, color: '#A9BCC4' },
]

// ── Workflow steps ───────────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { num: '01', label: 'Historical Data', desc: '~24,800 daily S&P 500 OHLCV records from 1927–2026.' },
  { num: '02', label: 'Feature Engineering', desc: '9 stationary features: returns, volatility, momentum, MA ratios.' },
  { num: '03', label: 'LSTM Forecasting', desc: '2-layer stacked LSTM, 128 units, 60-day lookback window.' },
  { num: '04', label: 'Model Evaluation', desc: 'RMSE, MAE, MAPE, directional accuracy on held-out test set.' },
  { num: '05', label: 'Trend Interpretation', desc: 'Predicted return classified: Bullish (>+0.5%), Neutral, Bearish (<−0.5%).' },
]

// ── Main export ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [activeTicker, setActiveTicker] = useState('^GSPC')
  const [activeStep, setActiveStep] = useState(0)
  const shouldReduce = useReducedMotion()

  const stock = DEMO_STOCKS.find(s => s.ticker === activeTicker) || DEMO_STOCKS[0]
  const allRows = getOHLCV(activeTicker)
  const rows = filterByRange(allRows, '6M')
  const forecast = getForecast(activeTicker)

  const chartData = rows.map(r => ({ date: r.date, close: r.close, isForecast: false }))
  if (forecast) {
    chartData.push({ date: forecast.forecastFor, close: forecast.predictedClose, isForecast: true })
  }

  return (
    <div className="ln-root">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <LandingNav />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="ln-hero" aria-labelledby="hero-headline">
        {/* Background layers */}
        <div className="ln-hero__bg" aria-hidden="true">
          <div className="ln-hero__glow ln-hero__glow--left" />
          <div className="ln-hero__glow ln-hero__glow--right" />
          <div className="ln-hero__grid" />
        </div>

        <div className="ln-hero__inner">
          {/* ── Left column ────────────────────────────────── */}
          <div className="ln-hero__copy">
            <motion.div
              className="ln-hero__badge"
              initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
            >
              <span className="ln-hero__badge-dot" aria-hidden="true" />
              Intelligent Market Analytics
            </motion.div>

            <motion.h1
              id="hero-headline"
              className="ln-hero__headline"
              initial={shouldReduce ? {} : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              See the signals<br />
              <span className="ln-hero__headline-accent">behind the market.</span>
            </motion.h1>

            <motion.p
              className="ln-hero__description"
              initial={shouldReduce ? {} : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.32 }}
            >
              Turn historical market data into actionable analytical insights.
              Explore stock trends, evaluate AI-powered forecasts, and understand
              model performance in one unified platform.
            </motion.p>

            <motion.div
              className="ln-hero__ctas"
              initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.46 }}
            >
              <Link to="/signup" className="ln-btn ln-btn--primary">
                Explore the Platform
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href="#forecasting" className="ln-btn ln-btn--ghost">
                View Forecasting
              </a>
            </motion.div>

            <motion.p
              className="ln-hero__credibility"
              initial={shouldReduce ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.62 }}
            >
              Built for market analysis, forecasting, and quantitative research.
            </motion.p>
          </div>

          {/* ── Right column: analytics preview ────────────── */}
          <motion.div
            className="ln-hero__preview"
            initial={shouldReduce ? {} : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Illustrative market analytics preview"
          >
            {/* Preview card */}
            <div className="ln-preview">
              {/* Header row */}
              <div className="ln-preview__header">
                <div className="ln-preview__market-status">
                  <span className="ln-preview__market-dot" aria-hidden="true" />
                  <span className="ln-preview__market-label">S&amp;P 500</span>
                  <span className="ln-preview__market-value">5,842.47</span>
                  <span className="ln-preview__market-change positive">+0.38%</span>
                </div>
                <span className="ln-preview__illus-badge" aria-label="Illustrative demo data">
                  Illustrative
                </span>
              </div>

              {/* Ticker switcher */}
              <div className="ln-preview__tickers" role="group" aria-label="Select ticker">
                {['^GSPC'].map(t => (
                  <button
                    key={t}
                    className={`ln-preview__ticker-btn ${activeTicker === t ? 'active' : ''}`}
                    onClick={() => setActiveTicker(t)}
                    aria-pressed={activeTicker === t}
                  >
                    S&P 500 Index (^GSPC)
                  </button>
                ))}
              </div>

              {/* Price row */}
              <div className="ln-preview__price-row">
                <div>
                  <p className="ln-preview__company">{stock.name}</p>
                  <p className="ln-preview__price">{formatPrice(stock.mockPrice)}</p>
                </div>
                <div className="ln-preview__signal-col">
                  <span className={`ln-preview__signal ln-preview__signal--${stock.mockSignal.toLowerCase()}`}>
                    {stock.mockSignal === 'BULLISH' ? '↑' : stock.mockSignal === 'BEARISH' ? '↓' : '→'}
                    {' '}{stock.mockSignal.charAt(0) + stock.mockSignal.slice(1).toLowerCase()}
                  </span>
                  <span className={`ln-preview__return ${stock.mockReturn >= 0 ? 'positive' : 'negative'}`}>
                    {formatReturn(stock.mockReturn)} forecast
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="ln-preview__chart" aria-label={`6-month price chart for ${activeTicker} — illustrative data`}>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="previewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2E4A57" stopOpacity={0.16} />
                        <stop offset="100%" stopColor="#2E4A57" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E3A23B" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="#E3A23B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontFamily: 'var(--font-data)', fontSize: 9, fill: '#7E8E98' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={d => d?.slice(5)}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={<HeroTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#2E4A57"
                      strokeWidth={2}
                      fill="url(#previewGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#C4552D', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                    {forecast && (
                      <ReferenceLine
                        x={forecast.forecastFor}
                        stroke="#E3A23B"
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast summary */}
              <div className="ln-preview__forecast-row">
                <div className="ln-preview__forecast-item">
                  <span className="ln-preview__forecast-label">Predicted return</span>
                  <span className={`ln-preview__forecast-value ${stock.mockReturn >= 0 ? 'positive' : 'negative'}`}>
                    {formatReturn(stock.mockReturn)}
                  </span>
                </div>
                <div className="ln-preview__forecast-item">
                  <span className="ln-preview__forecast-label">Predicted close</span>
                  <span className={`ln-preview__forecast-value ${stock.mockReturn >= 0 ? 'positive' : 'negative'}`}>
                    {forecast ? formatPrice(forecast.predictedClose) : '—'}
                  </span>
                </div>
                <div className="ln-preview__forecast-item">
                  <span className="ln-preview__forecast-label">Forecast date</span>
                  <span className="ln-preview__forecast-value">{forecast?.forecastFor ?? '—'}</span>
                </div>
              </div>

              {/* Model info bar */}
              <div className="ln-preview__model-bar">
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Model</span>
                  <span className="ln-preview__model-val">LSTM 2×128</span>
                </div>
                <div className="ln-preview__model-sep" aria-hidden="true" />
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Lookback</span>
                  <span className="ln-preview__model-val">60 days</span>
                </div>
                <div className="ln-preview__model-sep" aria-hidden="true" />
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Features</span>
                  <span className="ln-preview__model-val">9 stationary</span>
                </div>
                <div className="ln-preview__model-sep" aria-hidden="true" />
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Horizon</span>
                  <span className="ln-preview__model-val">Next day</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════════════ */}
      <div className="ln-trust-strip">
        <div className="ln-trust-strip__inner">
          {[
            { icon: <Cpu size={16} />, label: 'Machine Learning Forecasting' },
            { icon: <BarChart2 size={16} />, label: 'Historical Market Analysis' },
            { icon: <FlaskConical size={16} />, label: 'Quantitative Model Evaluation' },
            { icon: <Activity size={16} />, label: 'Interactive Market Visualization' },
          ].map((item, i) => (
            <div key={i} className="ln-trust-strip__item">
              <span className="ln-trust-strip__icon" aria-hidden="true">{item.icon}</span>
              <span className="ln-trust-strip__label">{item.label}</span>
              {i < 3 && <span className="ln-trust-strip__divider" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          STATS HIGHLIGHTS
      ══════════════════════════════════════════════════════ */}
      <section className="ln-stats" aria-label="Key platform metrics">
        <div className="ln-container">
          <div className="ln-stats__grid">
            {[
              { val: '24,800+', label: 'Daily Trading Days', desc: 'S&P 500 records from 1927–2026' },
              { val: '9',       label: 'Stationary Features', desc: 'Returns, volatility, momentum & MA' },
              { val: '53.8%',   label: 'Directional Accuracy', desc: 'Out-of-sample held-out test evaluation' },
              { val: '<150ms',  label: 'Inference Latency', desc: 'Sub-second model forecast updates' },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 0.08} className="ln-stats__item">
                <span className="ln-stats__val">{stat.val}</span>
                <span className="ln-stats__label">{stat.label}</span>
                <span className="ln-stats__desc">{stat.desc}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PRODUCT OVERVIEW
      ══════════════════════════════════════════════════════ */}
      <section id="product" className="ln-section ln-product" aria-labelledby="product-heading">
        <div className="ln-container">
          <Reveal className="ln-section__header">
            <p className="ln-section__eyebrow">Platform</p>
            <h2 id="product-heading" className="ln-section__heading">
              Everything you need to understand the trend.
            </h2>
            <p className="ln-section__subtext">
              Move from historical market data to model-driven analysis through
              a unified research experience.
            </p>
          </Reveal>

          <div className="ln-product__grid">
            {/* Feature 1 — AI Forecasting */}
            <Reveal delay={0.08} className="ln-product__feature ln-product__feature--primary">
              <div className="ln-product__feature-content">
                <div className="ln-product__feature-icon ln-product__feature-icon--terracotta" aria-hidden="true">
                  <TrendingUp size={20} />
                </div>
                <h3 className="ln-product__feature-title">AI Forecasting</h3>
                <p className="ln-product__feature-desc">
                  Explore next-day return forecasts and market trend classifications
                  generated by machine-learning models.
                </p>
                <Link to="/app/forecast/^GSPC" className="ln-product__feature-link">
                  View Forecasts <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
              {/* Compact chart visual */}
              <div className="ln-product__feature-visual" aria-label="Illustrative forecast chart">
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart
                    data={filterByRange(getOHLCV('^GSPC'), '3M').slice(-40)}
                    margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="prodGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C4552D" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#C4552D" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#C4552D"
                      strokeWidth={1.8}
                      fill="url(#prodGrad1)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Reveal>

            {/* Feature 2 — Market Intelligence */}
            <Reveal delay={0.14} className="ln-product__feature">
              <div className="ln-product__feature-content">
                <div className="ln-product__feature-icon ln-product__feature-icon--slate" aria-hidden="true">
                  <BarChart2 size={20} />
                </div>
                <h3 className="ln-product__feature-title">Market Intelligence</h3>
                <p className="ln-product__feature-desc">
                  Analyze historical market movements, returns, volatility, momentum,
                  and technical relationships across the index.
                </p>
                <Link to="/app/stocks" className="ln-product__feature-link">
                  Explore Stocks <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="ln-product__feature-visual" aria-label="Illustrative market metrics">
                <div className="ln-mini-metrics">
                  {[
                    { label: 'Daily Return', value: '+0.78%', positive: true },
                    { label: '20d Volatility', value: '0.91%', positive: null },
                    { label: '5d Momentum', value: '+2.14%', positive: true },
                    { label: 'MA7/MA20', value: '−0.32%', positive: false },
                  ].map(m => (
                    <div key={m.label} className="ln-mini-metrics__row">
                      <span className="ln-mini-metrics__label">{m.label}</span>
                      <span className={`ln-mini-metrics__value ${m.positive === true ? 'positive' : m.positive === false ? 'negative' : ''}`}>
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Feature 3 — Model Evaluation */}
            <Reveal delay={0.20} className="ln-product__feature">
              <div className="ln-product__feature-content">
                <div className="ln-product__feature-icon ln-product__feature-icon--teal" aria-hidden="true">
                  <FlaskConical size={20} />
                </div>
                <h3 className="ln-product__feature-title">Model Evaluation</h3>
                <p className="ln-product__feature-desc">
                  Compare forecasting approaches using established error metrics
                  and directional performance on a held-out test set.
                </p>
                <Link to="/scientist/performance" className="ln-product__feature-link">
                  Scientist View <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="ln-product__feature-visual" aria-label="Illustrative model comparison">
                <div className="ln-eval-bars">
                  {PERF_BAR_DATA.map(m => (
                    <div key={m.name} className="ln-eval-bar__row">
                      <span className="ln-eval-bar__name">{m.name}</span>
                      <div className="ln-eval-bar__track">
                        <div
                          className="ln-eval-bar__fill"
                          style={{ width: `${m.dirAcc * 1.8}%`, background: m.color }}
                          aria-label={`${m.name} directional accuracy ${m.dirAcc}%`}
                        />
                      </div>
                      <span className="ln-eval-bar__val">{m.dirAcc}%</span>
                    </div>
                  ))}
                  <p className="ln-eval-bars__note">Dir. accuracy (illustrative)</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FORECASTING SECTION
      ══════════════════════════════════════════════════════ */}
      <section id="forecasting" className="ln-section ln-forecasting" aria-labelledby="forecasting-heading">
        <div className="ln-container">
          <div className="ln-forecasting__layout">
            {/* Left: copy */}
            <div className="ln-forecasting__copy">
              <Reveal>
                <p className="ln-section__eyebrow">Forecasting</p>
                <h2 id="forecasting-heading" className="ln-section__heading">
                  From market history to measurable forecasts.
                </h2>
                <p className="ln-section__subtext">
                  Explore the patterns, features, and model evaluations behind the forecast.
                  Every prediction is traceable to a specific architecture and dataset.
                </p>
              </Reveal>

              {/* Workflow steps */}
              <div className="ln-workflow" aria-label="Forecasting workflow">
                {WORKFLOW_STEPS.map((step, i) => (
                  <Reveal key={i} delay={i * 0.07}>
                    <button
                      className={`ln-workflow__step ${activeStep === i ? 'active' : ''}`}
                      onClick={() => setActiveStep(i)}
                      aria-pressed={activeStep === i}
                    >
                      <span className="ln-workflow__num">{step.num}</span>
                      <span className="ln-workflow__label">{step.label}</span>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <span className="ln-workflow__connector" aria-hidden="true" />
                      )}
                    </button>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Right: detail panel */}
            <div className="ln-forecasting__detail">
              <motion.div
                key={activeStep}
                className="ln-forecasting__detail-card"
                initial={shouldReduce ? {} : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <p className="ln-forecasting__detail-num">{WORKFLOW_STEPS[activeStep].num}</p>
                <h3 className="ln-forecasting__detail-title">{WORKFLOW_STEPS[activeStep].label}</h3>
                <p className="ln-forecasting__detail-body">{WORKFLOW_STEPS[activeStep].desc}</p>

                {/* Step-specific visualizations */}
                {activeStep === 0 && (
                  <div className="ln-forecasting__mini-chart" aria-label="Illustrative data range">
                    <div className="ln-data-range">
                      <span className="ln-data-range__from">1927</span>
                      <div className="ln-data-range__bar">
                        <div className="ln-data-range__fill" />
                      </div>
                      <span className="ln-data-range__to">2026</span>
                    </div>
                    <p className="ln-data-range__note">~24,800 trading days · Yahoo Finance (^GSPC)</p>
                  </div>
                )}
                {activeStep === 1 && (
                  <div className="ln-features-list" aria-label="Feature list">
                    {['Daily Return', 'Price Range %', 'Close/MA7 Ratio', 'Close/MA20 Ratio',
                      '20d Volatility', 'MA7/MA20 Cross', '5d Momentum', '10d Momentum', 'Intraday Direction'].map(f => (
                        <span key={f} className="ln-feature-tag">{f}</span>
                      ))}
                  </div>
                )}
                {activeStep === 2 && (
                  <div className="ln-arch-pill-row">
                    {['Input: 60×9', 'LSTM 128', 'LSTM 128', 'Dropout 0.2', 'Dense → Return'].map(l => (
                      <span key={l} className="ln-arch-pill">{l}</span>
                    ))}
                  </div>
                )}
                {activeStep === 3 && (
                  <div className="ln-metric-chips">
                    {[
                      { k: 'RMSE', v: '42.18' },
                      { k: 'MAE', v: '31.55' },
                      { k: 'MAPE', v: '0.62%' },
                      { k: 'Dir. Acc', v: '53.8%' },
                    ].map(m => (
                      <div key={m.k} className="ln-metric-chip">
                        <span className="ln-metric-chip__key">{m.k}</span>
                        <span className="ln-metric-chip__val">{m.v}</span>
                      </div>
                    ))}
                    <p className="ln-metric-chips__note">Illustrative — run notebook for real values</p>
                  </div>
                )}
                {activeStep === 4 && (
                  <div className="ln-signal-examples">
                    {[
                      { sig: 'BULLISH', label: 'Bullish', sym: '↑', desc: 'Return > +0.5%' },
                      { sig: 'NEUTRAL', label: 'Neutral', sym: '→', desc: '−0.5% to +0.5%' },
                      { sig: 'BEARISH', label: 'Bearish', sym: '↓', desc: 'Return < −0.5%' },
                    ].map(s => (
                      <div key={s.sig} className={`ln-signal-ex ln-signal-ex--${s.sig.toLowerCase()}`}>
                        <span className="ln-signal-ex__sym">{s.sym}</span>
                        <span className="ln-signal-ex__label">{s.label}</span>
                        <span className="ln-signal-ex__desc">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          RESEARCH / DATA SCIENTIST SECTION
      ══════════════════════════════════════════════════════ */}
      <section id="research" className="ln-section ln-research" aria-labelledby="research-heading">
        <div className="ln-container">
          <Reveal className="ln-section__header">
            <p className="ln-section__eyebrow">Research</p>
            <h2 id="research-heading" className="ln-section__heading">
              Built for people who want to go deeper.
            </h2>
            <p className="ln-section__subtext">
              Move beyond a forecast and examine how the model performs
              against historical market behavior.
            </p>
          </Reveal>

          <div className="ln-research__layout">
            {/* Left: feature list */}
            <Reveal delay={0.06} className="ln-research__features">
              {[
                { icon: <Activity size={16} />, label: 'Model Comparison', desc: 'LSTM vs naive and linear baselines on identical test samples.' },
                { icon: <BarChart2 size={16} />, label: 'Actual vs Predicted', desc: 'Visualize predicted returns against realized outcomes.' },
                { icon: <Database size={16} />, label: 'Error Metrics (MAE/RMSE)', desc: 'Regression and directional accuracy reported separately.' },
                { icon: <FlaskConical size={16} />, label: 'Experiment Tracking', desc: 'Compare hyperparameter configurations and training runs.' },
                { icon: <Shield size={16} />, label: 'Honest Limitations', desc: 'Clear documentation of what the model can and cannot do.' },
              ].map((f, i) => (
                <div key={i} className="ln-research__feature-item">
                  <span className="ln-research__feature-icon" aria-hidden="true">{f.icon}</span>
                  <div>
                    <p className="ln-research__feature-label">{f.label}</p>
                    <p className="ln-research__feature-desc">{f.desc}</p>
                  </div>
                </div>
              ))}

              <Link to="/scientist/performance" className="ln-btn ln-btn--outline">
                Explore Research Tools <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </Reveal>

            {/* Right: workspace preview */}
            <Reveal delay={0.12} className="ln-research__workspace">
              <div className="ln-workspace-card">
                <div className="ln-workspace-card__header">
                  <span className="ln-workspace-card__title">Model Evaluation · Illustrative</span>
                  <span className="ln-workspace-card__badge">Data Scientist</span>
                </div>

                {/* Performance table */}
                <div className="ln-workspace-table" role="table" aria-label="Illustrative model comparison">
                  <div className="ln-workspace-table__head" role="row">
                    <span role="columnheader">Metric</span>
                    <span role="columnheader">LSTM</span>
                    <span role="columnheader">Naive</span>
                    <span role="columnheader">Linear</span>
                  </div>
                  {[
                    { metric: 'RMSE', lstm: '42.18', naive: '45.92', linear: '47.34' },
                    { metric: 'MAE', lstm: '31.55', naive: '34.21', linear: '35.87' },
                    { metric: 'MAPE', lstm: '0.62%', naive: '0.68%', linear: '0.71%' },
                    { metric: 'Dir. Acc.', lstm: '53.8%', naive: '49.1%', linear: '48.3%' },
                  ].map(row => (
                    <div key={row.metric} className="ln-workspace-table__row" role="row">
                      <span className="ln-workspace-table__metric" role="rowheader">{row.metric}</span>
                      <span className="ln-workspace-table__val ln-workspace-table__val--highlight">{row.lstm}</span>
                      <span className="ln-workspace-table__val ln-workspace-table__val--muted">{row.naive}</span>
                      <span className="ln-workspace-table__val ln-workspace-table__val--muted">{row.linear}</span>
                    </div>
                  ))}
                </div>

                <p className="ln-workspace-card__provenance">
                  Illustrative demo values · Run the training notebook for real metrics
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section id="methodology" className="ln-section ln-how" aria-labelledby="how-heading">
        <div className="ln-container">
          <Reveal className="ln-section__header">
            <p className="ln-section__eyebrow">How it works</p>
            <h2 id="how-heading" className="ln-section__heading">
              Three steps from data to insight.
            </h2>
          </Reveal>

          <div className="ln-how__steps">
            {[
              {
                num: '01',
                title: 'Explore the Market',
                body: 'Start with historical market data and understand recent price movements, volatility, and trend signals.',
                link: '/app/stocks',
                linkLabel: 'Open Stocks',
              },
              {
                num: '02',
                title: 'Generate a Forecast',
                body: 'Review the model\'s estimated next-day return and associated trend classification for a selected instrument.',
                link: '/app/forecast/^GSPC',
                linkLabel: 'View Forecast',
              },
              {
                num: '03',
                title: 'Evaluate the Results',
                body: 'Compare predictions with actual outcomes. Assess forecasting performance using regression and directional metrics.',
                link: '/scientist/performance',
                linkLabel: 'Research Tools',
              },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 0.1} className="ln-how__step">
                <span className="ln-how__step-num">{step.num}</span>
                <h3 className="ln-how__step-title">{step.title}</h3>
                <p className="ln-how__step-body">{step.body}</p>
                <Link to={step.link} className="ln-how__step-link">
                  {step.linkLabel} <ChevronRight size={12} aria-hidden="true" />
                </Link>
                {i < 2 && <div className="ln-how__connector" aria-hidden="true" />}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════ */}
      <section className="ln-section ln-final-cta" aria-labelledby="cta-heading">
        <div className="ln-final-cta__bg" aria-hidden="true">
          <div className="ln-final-cta__glow" />
        </div>
        <div className="ln-container">
          <Reveal className="ln-final-cta__inner">
            <h2 id="cta-heading" className="ln-final-cta__heading">
              Understand the trend.<br />
              <span className="ln-final-cta__heading-line2">Question the signal.</span><br />
              <span className="ln-final-cta__heading-accent">Measure the result.</span>
            </h2>
            <p className="ln-final-cta__sub">
              Explore a more analytical approach to stock trend forecasting with ArthNex.
            </p>
            <div className="ln-final-cta__actions">
              <Link to="/signup" className="ln-btn ln-btn--primary ln-btn--lg">
                Get Started <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a href="#product" className="ln-btn ln-btn--ghost ln-btn--lg">
                Explore the Platform
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer className="ln-footer" role="contentinfo">
        <div className="ln-container">
          <div className="ln-footer__top">
            {/* Brand column */}
            <div className="ln-footer__brand">
              <ArthNexLogo variant="horizontal" size="sm" />
              <p className="ln-footer__brand-desc">
                ArthNex is an AI-powered market intelligence platform for stock trend
                forecasting, historical analysis, and quantitative model evaluation.
              </p>
              <p className="ln-footer__disclaimer">
                Forecasts are estimates based on historical data and model assumptions.
                They are not guarantees of future performance or personalized investment advice.
              </p>
            </div>

            {/* Link columns */}
            <div className="ln-footer__links">
              <div className="ln-footer__col">
                <p className="ln-footer__col-heading">Platform</p>
                <Link to="/app/dashboard" className="ln-footer__link">Dashboard</Link>
                <Link to="/app/stocks" className="ln-footer__link">Stocks</Link>
                <Link to="/app/forecast/^GSPC" className="ln-footer__link">Forecasts</Link>
                <Link to="/app/backtest" className="ln-footer__link">Backtesting</Link>
                <Link to="/app/model-card" className="ln-footer__link">Model Card</Link>
              </div>
              <div className="ln-footer__col">
                <p className="ln-footer__col-heading">Research</p>
                <Link to="/scientist/performance" className="ln-footer__link">Performance</Link>
                <Link to="/scientist/models" className="ln-footer__link">Models</Link>
                <Link to="/scientist/experiments" className="ln-footer__link">Experiments</Link>
                <Link to="/scientist/dataset" className="ln-footer__link">Dataset</Link>
                <Link to="/scientist/model-card" className="ln-footer__link">Model Card</Link>
              </div>
              <div className="ln-footer__col">
                <p className="ln-footer__col-heading">Account</p>
                <Link to="/login" className="ln-footer__link">Sign In</Link>
                <Link to="/signup" className="ln-footer__link">Get Started</Link>
                <Link to="/onboarding" className="ln-footer__link">Onboarding</Link>
              </div>
            </div>
          </div>

          <div className="ln-footer__bottom">
            <span className="ln-footer__copy">
              © 2026 ArthNex · Academic research project · Not financial advice
            </span>
            <span className="ln-footer__demo-note">Demo data only · Illustrative values</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
