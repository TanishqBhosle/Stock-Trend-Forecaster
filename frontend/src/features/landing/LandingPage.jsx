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

// ── Verified LSTM performance metrics ─────────────────────────────────────────
const PERF_METRICS_DATA = [
  { name: 'Directional Accuracy', val: '55.39%', pct: 55.39, color: '#2F7F7A', note: '370 of 668 held-out sessions' },
  { name: 'Walk-Forward DA', val: '55.39%', pct: 55.39, color: '#2E4A57', note: '668 sequential 1-step tests' },
  { name: 'Test RMSE', val: '0.0097', pct: 48.0, color: '#C4552D', note: 'Beats 0.00968 baseline' },
  { name: 'Test MAE', val: '0.0065', pct: 36.0, color: '#E3A23B', note: 'Beats 0.00657 baseline' },
]

// ── Workflow steps ───────────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { num: '01', label: 'Historical Data', desc: '6,738 daily S&P 500 OHLCV observations from 2000–present via Yahoo Finance.' },
  { num: '02', label: 'Leak-Free Preprocessing', desc: '6 raw OHLCV features scaled with StandardScaler fit strictly on the 80% train split.' },
  { num: '03', label: 'Stacked PyTorch LSTM', desc: '2-layer LSTM (64 hidden units, 0.2 dropout, 60-day lookback) predicting continuous return.' },
  { num: '04', label: 'Out-of-Sample Evaluation', desc: 'Tested across 668 chronological sessions (RMSE: 0.0097, MAE: 0.0065, DA: 55.39%).' },
  { num: '05', label: 'Trend Classification', desc: 'Predicted return categorized into Bullish (>+0.15%), Neutral, or Bearish (<−0.15%).' },
]

// ── Main export ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [activeTicker, setActiveTicker] = useState('^GSPC')
  const [activeStep, setActiveStep] = useState(0)
  const [liveMarket, setLiveMarket] = useState(null)
  const [liveForecast, setLiveForecast] = useState(null)
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    let mounted = true
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    async function loadLiveData() {
      try {
        const [mRes, fRes] = await Promise.allSettled([
          fetch(`${apiBase}/api/market/summary`),
          fetch(`${apiBase}/api/forecast/latest`)
        ])
        if (!mounted) return
        if (mRes.status === 'fulfilled' && mRes.value.ok) {
          const mData = await mRes.value.json()
          setLiveMarket(mData)
          setIsLiveConnected(true)
        }
        if (fRes.status === 'fulfilled' && fRes.value.ok) {
          const fData = await fRes.value.json()
          setLiveForecast(fData)
        }
      } catch (err) {
        // Fallback to demo mocks
      }
    }
    loadLiveData()
    return () => { mounted = false }
  }, [])

  const stock = DEMO_STOCKS.find(s => s.ticker === activeTicker) || DEMO_STOCKS[0]
  const allRows = getOHLCV(activeTicker)
  const rows = filterByRange(allRows, '6M')
  const forecast = getForecast(activeTicker)

  const currentPrice = liveMarket?.latestClose ?? stock.mockPrice
  const changePct = liveMarket?.changePct ?? 0.38
  const predictedReturn = liveForecast?.predictedReturn ?? stock.mockReturn
  const predictedClose = liveForecast?.impliedClose ?? (forecast ? forecast.predictedClose : stock.mockPrice)
  const forecastDate = liveForecast?.targetDate ?? (forecast?.forecastFor ?? 'Next Session')
  const trendSignal = (liveForecast?.trendSignal ?? stock.mockSignal).toUpperCase()

  const chartData = rows.map(r => ({ date: r.date, close: r.close, isForecast: false }))
  if (predictedClose) {
    chartData.push({ date: forecastDate, close: predictedClose, isForecast: true })
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
                  <span className="ln-preview__market-value">{formatPrice(currentPrice)}</span>
                  <span className={`ln-preview__market-change ${changePct >= 0 ? 'positive' : 'negative'}`}>
                    {changePct >= 0 ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`}
                  </span>
                </div>
                <span
                  className="ln-preview__illus-badge"
                  style={{
                    background: isLiveConnected ? 'rgba(46, 125, 90, 0.14)' : 'rgba(227, 162, 59, 0.12)',
                    color: isLiveConnected ? 'var(--ln-positive)' : 'var(--ln-amber)',
                    borderColor: isLiveConnected ? 'rgba(46, 125, 90, 0.3)' : 'transparent',
                    fontWeight: 600,
                  }}
                >
                  {isLiveConnected ? 'Live S&P 500 Feed' : 'Illustrative Preview'}
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
                  <p className="ln-preview__company">S&amp;P 500 Index (^GSPC)</p>
                  <p className="ln-preview__price">{formatPrice(currentPrice)}</p>
                </div>
                <div className="ln-preview__signal-col">
                  <span className={`ln-preview__signal ln-preview__signal--${trendSignal.toLowerCase()}`}>
                    {trendSignal === 'BULLISH' ? '↑' : trendSignal === 'BEARISH' ? '↓' : '→'}
                    {' '}{trendSignal.charAt(0) + trendSignal.slice(1).toLowerCase()}
                  </span>
                  <span className={`ln-preview__return ${predictedReturn >= 0 ? 'positive' : 'negative'}`}>
                    {formatReturn(predictedReturn)} forecast
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="ln-preview__chart" aria-label={`6-month price chart for ${activeTicker}`}>
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
                    {predictedClose && (
                      <ReferenceLine
                        x={forecastDate}
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
                  <span className={`ln-preview__forecast-value ${predictedReturn >= 0 ? 'positive' : 'negative'}`}>
                    {formatReturn(predictedReturn)}
                  </span>
                </div>
                <div className="ln-preview__forecast-item">
                  <span className="ln-preview__forecast-label">Implied close</span>
                  <span className={`ln-preview__forecast-value ${predictedReturn >= 0 ? 'positive' : 'negative'}`}>
                    {formatPrice(predictedClose)}
                  </span>
                </div>
                <div className="ln-preview__forecast-item">
                  <span className="ln-preview__forecast-label">Target date</span>
                  <span className="ln-preview__forecast-value">{forecastDate}</span>
                </div>
              </div>

              {/* Model info bar */}
              <div className="ln-preview__model-bar">
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Model</span>
                  <span className="ln-preview__model-val">LSTM 2×64</span>
                </div>
                <div className="ln-preview__model-sep" aria-hidden="true" />
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Lookback</span>
                  <span className="ln-preview__model-val">60 days</span>
                </div>
                <div className="ln-preview__model-sep" aria-hidden="true" />
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Features</span>
                  <span className="ln-preview__model-val">6 OHLCV</span>
                </div>
                <div className="ln-preview__model-sep" aria-hidden="true" />
                <div className="ln-preview__model-item">
                  <span className="ln-preview__model-key">Horizon</span>
                  <span className="ln-preview__model-val">Next Session</span>
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
              { val: '6,738',   label: 'Daily Trading Days', desc: 'S&P 500 records from 2000–present' },
              { val: '6',       label: 'Raw OHLCV Features', desc: 'Open, High, Low, Close, Adj Close, Volume' },
              { val: '55.39%',  label: 'Directional Accuracy', desc: 'Held-out test split (668 sessions)' },
              { val: '0.0097',  label: 'Test Return RMSE', desc: 'Outperforms zero-return naive baseline' },
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
                    { label: 'Daily Return', value: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`, positive: changePct >= 0 },
                    { label: 'Lookback Window', value: '60 sessions', positive: null },
                    { label: 'Forecast Return', value: formatReturn(predictedReturn), positive: predictedReturn >= 0 },
                    { label: 'Trend Direction', value: trendSignal, positive: trendSignal === 'BULLISH' ? true : trendSignal === 'BEARISH' ? false : null },
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
                  Inspect genuine error metrics and directional accuracy
                  independently recalculated on the held-out test split.
                </p>
                <Link to="/scientist/performance" className="ln-product__feature-link">
                  Scientist View <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="ln-product__feature-visual" aria-label="Model evaluation benchmarks">
                <div className="ln-eval-bars">
                  {PERF_METRICS_DATA.map(m => (
                    <div key={m.name} className="ln-eval-bar__row">
                      <span className="ln-eval-bar__name">{m.name}</span>
                      <div className="ln-eval-bar__track">
                        <div
                          className="ln-eval-bar__fill"
                          style={{ width: `${m.pct}%`, background: m.color }}
                          aria-label={`${m.name} ${m.val}`}
                        />
                      </div>
                      <span className="ln-eval-bar__val">{m.val}</span>
                    </div>
                  ))}
                  <p className="ln-eval-bars__note">Verified test split (668 sessions)</p>
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
                  <div className="ln-forecasting__mini-chart" aria-label="S&P 500 historical data range">
                    <div className="ln-data-range">
                      <span className="ln-data-range__from">2000</span>
                      <div className="ln-data-range__bar">
                        <div className="ln-data-range__fill" style={{ width: '100%' }} />
                      </div>
                      <span className="ln-data-range__to">Present</span>
                    </div>
                    <p className="ln-data-range__note">6,738 daily observations · Yahoo Finance (^GSPC)</p>
                  </div>
                )}
                {activeStep === 1 && (
                  <div className="ln-features-list" aria-label="Feature list">
                    {['Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume', 'StandardScaler (Train Only)', 'Zero Leakage'].map(f => (
                      <span key={f} className="ln-feature-tag">{f}</span>
                    ))}
                  </div>
                )}
                {activeStep === 2 && (
                  <div className="ln-arch-pill-row">
                    {['Input: (batch, 60, 6)', 'LSTM (hidden=64)', 'LSTM (hidden=64)', 'Dropout 0.2', 'Linear (64 → 1)'].map(l => (
                      <span key={l} className="ln-arch-pill">{l}</span>
                    ))}
                  </div>
                )}
                {activeStep === 3 && (
                  <div className="ln-metric-chips">
                    {[
                      { k: 'Test RMSE', v: '0.009655' },
                      { k: 'Test MAE', v: '0.006537' },
                      { k: 'Dir. Acc.', v: '55.39%' },
                      { k: 'Walk-Forward', v: '55.39%' },
                    ].map(m => (
                      <div key={m.k} className="ln-metric-chip">
                        <span className="ln-metric-chip__key">{m.k}</span>
                        <span className="ln-metric-chip__val">{m.v}</span>
                      </div>
                    ))}
                    <p className="ln-metric-chips__note">Verified held-out test split (668 sessions, 2024–2026)</p>
                  </div>
                )}
                {activeStep === 4 && (
                  <div className="ln-signal-examples">
                    {[
                      { sig: 'BULLISH', label: 'Bullish', sym: '↑', desc: 'Return > +0.15%' },
                      { sig: 'NEUTRAL', label: 'Neutral', sym: '→', desc: '−0.15% to +0.15%' },
                      { sig: 'BEARISH', label: 'Bearish', sym: '↓', desc: 'Return < −0.15%' },
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
                { icon: <Activity size={16} />, label: 'PyTorch Architecture', desc: 'Single 2-layer stacked LSTM trained strictly on S&P 500 (^GSPC).' },
                { icon: <BarChart2 size={16} />, label: 'Zero Data Leakage', desc: 'Chronological 80/10/10 split with scalers fit exclusively on train data.' },
                { icon: <Database size={16} />, label: 'Verified Error Metrics', desc: 'Independently recalculated RMSE (0.0097) and MAE (0.0065).' },
                { icon: <FlaskConical size={16} />, label: 'SQLite Experiment Lab', desc: 'Live training run tracking connected to asynchronous PyTorch jobs.' },
                { icon: <Shield size={16} />, label: 'Honest Disclosures', desc: 'Daily Yahoo Finance close data with clear heuristic backtest separation.' },
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
                  <span className="ln-workspace-card__title">Model Performance &amp; Benchmarks</span>
                  <span className="ln-workspace-card__badge" style={{ background: 'rgba(46, 125, 90, 0.15)', color: 'var(--ln-positive)' }}>Verified PyTorch</span>
                </div>

                {/* Performance table */}
                <div className="ln-workspace-table" role="table" aria-label="Verified model comparison">
                  <div className="ln-workspace-table__head" role="row">
                    <span role="columnheader">Metric</span>
                    <span role="columnheader">PyTorch LSTM</span>
                    <span role="columnheader">Zero-Return Naive</span>
                    <span role="columnheader">Delta / Outcome</span>
                  </div>
                  {[
                    { metric: 'Test RMSE', lstm: '0.009655', naive: '0.009680', delta: '+0.26% lower error' },
                    { metric: 'Test MAE', lstm: '0.006537', naive: '0.006573', delta: '+0.55% lower error' },
                    { metric: 'Directional Acc.', lstm: '55.39%', naive: '55.39%', delta: 'Matched bull drift' },
                    { metric: 'Walk-Forward DA', lstm: '55.39%', naive: '—', delta: '668 sequential steps' },
                    { metric: 'Test Observations', lstm: '668 days', naive: '668 days', delta: 'Identical window' },
                  ].map(row => (
                    <div key={row.metric} className="ln-workspace-table__row" role="row">
                      <span className="ln-workspace-table__metric" role="rowheader">{row.metric}</span>
                      <span className="ln-workspace-table__val ln-workspace-table__val--highlight">{row.lstm}</span>
                      <span className="ln-workspace-table__val ln-workspace-table__val--muted">{row.naive}</span>
                      <span className="ln-workspace-table__val" style={{ color: 'var(--ln-positive)', fontSize: '11px', fontWeight: 600 }}>{row.delta}</span>
                    </div>
                  ))}
                </div>

                <p className="ln-workspace-card__provenance">
                  Held-out test split (2024-02-20 to 2026-10-16) · Independently verified against disk artifacts
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
