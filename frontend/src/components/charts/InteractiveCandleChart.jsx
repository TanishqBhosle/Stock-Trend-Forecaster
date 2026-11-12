import { useState, useMemo, useRef } from 'react'
import { formatPrice } from '@/lib/signals'
import { CandlestickChart, Activity, Eye, EyeOff } from 'lucide-react'
import './InteractiveCandleChart.css'

/**
 * High-Performance SVG Interactive Candlestick Chart
 * with ±1σ and ±2σ Predictive Confidence Cone
 */
export function InteractiveCandleChart({
  data = [],
  forecast = null,
  height = 280,
  showVolume = true
}) {
  const [chartMode, setChartMode] = useState('candles') // 'candles' | 'area'
  const [showCone, setShowCone] = useState(true)
  const [hoverIndex, setHoverIndex] = useState(null)
  const svgRef = useRef(null)

  // Ensure valid dataset
  const validData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((d) => ({
      date: d.date,
      open: Number(d.open ?? d.close),
      high: Number(d.high ?? Math.max(d.open ?? d.close, d.close)),
      low: Number(d.low ?? Math.min(d.open ?? d.close, d.close)),
      close: Number(d.close),
      volume: Number(d.volume ?? 1000000),
    }))
  }, [data])

  // Project 5-Day Forward Confidence Cone
  const coneProjections = useMemo(() => {
    if (!validData.length || !showCone) return []
    const lastRow = validData[validData.length - 1]
    const lastClose = lastRow.close
    const lastDate = new Date(lastRow.date)

    // Expected drift and daily standard deviation (annualized ~13.5% vol -> daily ~0.85%)
    const dailyDrift = forecast?.predicted_return ?? 0.0005
    const dailyVol = 0.0085

    const points = []
    for (let step = 1; step <= 5; step++) {
      const projDate = new Date(lastDate)
      projDate.setDate(projDate.getDate() + (step > 2 ? step + 2 : step)) // approximate business days
      const dateStr = projDate.toISOString().slice(0, 10)

      const driftComp = Math.pow(1 + dailyDrift, step)
      const median = lastClose * driftComp
      const spread1 = lastClose * (dailyVol * Math.sqrt(step))
      const spread2 = lastClose * (2 * dailyVol * Math.sqrt(step))

      points.push({
        date: `T+${step} (${dateStr.slice(5)})`,
        step,
        median,
        upper1: median + spread1,
        lower1: median - spread1,
        upper2: median + spread2,
        lower2: median - spread2,
      })
    }
    return points
  }, [validData, forecast, showCone])

  // Chart viewport scaling
  const chartLayout = useMemo(() => {
    if (!validData.length) return null

    // Determine min/max across visible data and projected cone
    let minVal = Math.min(...validData.map((d) => d.low))
    let maxVal = Math.max(...validData.map((d) => d.high))

    if (showCone && coneProjections.length) {
      for (const p of coneProjections) {
        if (p.upper2 > maxVal) maxVal = p.upper2
        if (p.lower2 < minVal) minVal = p.lower2
      }
    }

    const padding = (maxVal - minVal) * 0.06 || 10
    minVal -= padding
    maxVal += padding

    const totalBars = validData.length + (showCone ? coneProjections.length : 0)
    return {
      minVal,
      maxVal,
      range: maxVal - minVal,
      totalBars,
    }
  }, [validData, coneProjections, showCone])

  if (!chartLayout || !validData.length) {
    return <div className="candle-empty">Awaiting market session records…</div>
  }

  const { minVal, maxVal, range, totalBars } = chartLayout
  const width = 800
  const chartH = height - 50 // Reserve bottom 50px for x-axis / volume

  const getY = (val) => chartH - ((val - minVal) / range) * chartH
  const getX = (idx) => (idx / (totalBars - 1 || 1)) * (width - 40) + 20

  const activeItem = hoverIndex !== null && hoverIndex < validData.length ? validData[hoverIndex] : validData[validData.length - 1]

  // Generate Area Path for Area Mode
  const areaPath = useMemo(() => {
    if (chartMode !== 'area' || !validData.length) return ''
    let d = `M ${getX(0)} ${getY(validData[0].close)}`
    for (let i = 1; i < validData.length; i++) {
      d += ` L ${getX(i)} ${getY(validData[i].close)}`
    }
    return d
  }, [validData, chartMode, totalBars, minVal, maxVal])

  // Generate Cone SVG Polygons
  const coneSvgData = useMemo(() => {
    if (!showCone || !coneProjections.length || !validData.length) return null
    const startIndex = validData.length - 1
    const lastX = getX(startIndex)
    const lastY = getY(validData[startIndex].close)

    // Outer 2-sigma cone polygon
    let outerPoints = [`${lastX},${lastY}`]
    for (let i = 0; i < coneProjections.length; i++) {
      outerPoints.push(`${getX(startIndex + 1 + i)},${getY(coneProjections[i].upper2)}`)
    }
    for (let i = coneProjections.length - 1; i >= 0; i--) {
      outerPoints.push(`${getX(startIndex + 1 + i)},${getY(coneProjections[i].lower2)}`)
    }

    // Inner 1-sigma cone polygon
    let innerPoints = [`${lastX},${lastY}`]
    for (let i = 0; i < coneProjections.length; i++) {
      innerPoints.push(`${getX(startIndex + 1 + i)},${getY(coneProjections[i].upper1)}`)
    }
    for (let i = coneProjections.length - 1; i >= 0; i--) {
      innerPoints.push(`${getX(startIndex + 1 + i)},${getY(coneProjections[i].lower1)}`)
    }

    // Median line path
    let medianPath = `M ${lastX} ${lastY}`
    for (let i = 0; i < coneProjections.length; i++) {
      medianPath += ` L ${getX(startIndex + 1 + i)} ${getY(coneProjections[i].median)}`
    }

    return {
      outerPoly: outerPoints.join(' '),
      innerPoly: innerPoints.join(' '),
      medianPath,
      lastX,
      lastY,
    }
  }, [coneProjections, validData, showCone, chartLayout])

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const clampedX = Math.max(20, Math.min(width - 20, (mouseX / rect.width) * width))
    const barWidth = (width - 40) / (totalBars - 1 || 1)
    const rawIdx = Math.round((clampedX - 20) / barWidth)
    const targetIdx = Math.max(0, Math.min(validData.length - 1, rawIdx))
    setHoverIndex(targetIdx)
  }

  const handleMouseLeave = () => {
    setHoverIndex(null)
  }

  return (
    <div className="interactive-candle-container">
      {/* Chart Toolbar Controls */}
      <div className="candle-toolbar">
        <div className="candle-mode-group">
          <button
            type="button"
            className={`candle-mode-btn ${chartMode === 'candles' ? 'active' : ''}`}
            onClick={() => setChartMode('candles')}
            title="Switch to OHLC Candlestick View"
          >
            <CandlestickChart size={13} />
            <span>Candles</span>
          </button>
          <button
            type="button"
            className={`candle-mode-btn ${chartMode === 'area' ? 'active' : ''}`}
            onClick={() => setChartMode('area')}
            title="Switch to Continuous Trend View"
          >
            <Activity size={13} />
            <span>Trend Area</span>
          </button>
        </div>

        <button
          type="button"
          className={`cone-toggle-btn ${showCone ? 'active' : ''}`}
          onClick={() => setShowCone((v) => !v)}
          title="Toggle 5-day predictive confidence cone overlay"
        >
          {showCone ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>Prediction Cone (±1σ / ±2σ)</span>
        </button>
      </div>

      {/* Dynamic Session Readout Header */}
      {activeItem && (
        <div className="session-readout-strip">
          <span className="readout-date">{activeItem.date}</span>
          <span className="readout-stat">
            O: <strong>{formatPrice(activeItem.open)}</strong>
          </span>
          <span className="readout-stat">
            H: <strong>{formatPrice(activeItem.high)}</strong>
          </span>
          <span className="readout-stat">
            L: <strong>{formatPrice(activeItem.low)}</strong>
          </span>
          <span className="readout-stat">
            C: <strong className={activeItem.close >= activeItem.open ? 'pos' : 'neg'}>{formatPrice(activeItem.close)}</strong>
          </span>
          <span className="readout-stat muted">
            Vol: <strong>{(activeItem.volume / 1e6).toFixed(1)}M</strong>
          </span>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="svg-chart-viewport" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="candle-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-line)" stopOpacity="0.18" />
              <stop offset="95%" stopColor="var(--chart-line)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="coneOuterGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="coneInnerGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="20" y1={chartH * 0.25} x2={width - 20} y2={chartH * 0.25} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <line x1="20" y1={chartH * 0.5} x2={width - 20} y2={chartH * 0.5} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <line x1="20" y1={chartH * 0.75} x2={width - 20} y2={chartH * 0.75} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <line x1="20" y1={chartH} x2={width - 20} y2={chartH} stroke="var(--border)" />

          {/* Price axis labels */}
          <text x={width - 15} y={getY(maxVal) + 10} fill="var(--chart-axis)" fontSize="9" fontFamily="var(--font-data)" textAnchor="end">
            ${maxVal.toFixed(0)}
          </text>
          <text x={width - 15} y={getY(minVal) - 4} fill="var(--chart-axis)" fontSize="9" fontFamily="var(--font-data)" textAnchor="end">
            ${minVal.toFixed(0)}
          </text>

          {/* Area Mode Path */}
          {chartMode === 'area' && (
            <>
              <path
                d={`${areaPath} L ${getX(validData.length - 1)} ${chartH} L ${getX(0)} ${chartH} Z`}
                fill="url(#areaFillGrad)"
              />
              <path d={areaPath} fill="none" stroke="var(--chart-line)" strokeWidth="1.8" />
            </>
          )}

          {/* Candlestick Bars */}
          {chartMode === 'candles' &&
            validData.map((d, i) => {
              const x = getX(i)
              const yHigh = getY(d.high)
              const yLow = getY(d.low)
              const yOpen = getY(d.open)
              const yClose = getY(d.close)

              const isUp = d.close >= d.open
              const candleTop = Math.min(yOpen, yClose)
              const candleHeight = Math.max(2, Math.abs(yClose - yOpen))
              const candleColor = isUp ? 'var(--bullish)' : 'var(--bearish)'

              return (
                <g key={d.date} className="candle-group">
                  {/* Wick */}
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={candleColor} strokeWidth="1" opacity="0.85" />
                  {/* Body */}
                  <rect
                    x={x - 2.5}
                    y={candleTop}
                    width="5"
                    height={candleHeight}
                    fill={isUp ? candleColor : candleColor}
                    stroke={candleColor}
                    strokeWidth="0.5"
                    rx="0.5"
                  />
                </g>
              )
            })}

          {/* 5-Day ML Prediction Confidence Cone */}
          {showCone && coneSvgData && (
            <g className="confidence-cone-group">
              {/* Outer 2-sigma polygon */}
              <polygon points={coneSvgData.outerPoly} fill="url(#coneOuterGrad)" stroke="var(--teal)" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
              {/* Inner 1-sigma polygon */}
              <polygon points={coneSvgData.innerPoly} fill="url(#coneInnerGrad)" stroke="var(--teal)" strokeWidth="1" opacity="0.8" />
              {/* Median forecast line */}
              <path d={coneSvgData.medianPath} fill="none" stroke="var(--terracotta)" strokeWidth="1.75" strokeDasharray="4 2" />

              {/* T+5 Marker Label */}
              <circle
                cx={getX(validData.length + coneProjections.length - 1)}
                cy={getY(coneProjections[coneProjections.length - 1].median)}
                r="3"
                fill="var(--terracotta)"
              />
              <text
                x={getX(validData.length + coneProjections.length - 1) - 4}
                y={getY(coneProjections[coneProjections.length - 1].upper1) - 8}
                fill="var(--teal)"
                fontSize="9"
                fontFamily="var(--font-data)"
                textAnchor="end"
                fontWeight="bold"
              >
                +1σ Cone
              </text>
            </g>
          )}

          {/* Active Hover Crosshair */}
          {hoverIndex !== null && hoverIndex < validData.length && (
            <g className="crosshair-group">
              <line
                x1={getX(hoverIndex)}
                y1={0}
                x2={getX(hoverIndex)}
                y2={chartH}
                stroke="var(--terracotta)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(validData[hoverIndex].close)}
                r="3.5"
                fill="var(--terracotta)"
                stroke="var(--bg-elevated)"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Date Axis Labeling */}
          {validData.length > 0 && (
            <>
              <text x={getX(0)} y={height - 12} fill="var(--chart-axis)" fontSize="9" fontFamily="var(--font-data)">
                {validData[0].date.slice(5)}
              </text>
              <text
                x={getX(Math.floor(validData.length / 2))}
                y={height - 12}
                fill="var(--chart-axis)"
                fontSize="9"
                fontFamily="var(--font-data)"
                textAnchor="middle"
              >
                {validData[Math.floor(validData.length / 2)].date.slice(5)}
              </text>
              <text
                x={getX(validData.length - 1)}
                y={height - 12}
                fill="var(--chart-axis)"
                fontSize="9"
                fontFamily="var(--font-data)"
                textAnchor="end"
              >
                {validData[validData.length - 1].date.slice(5)}
              </text>
              {showCone && (
                <text
                  x={getX(validData.length + coneProjections.length - 1)}
                  y={height - 12}
                  fill="var(--teal)"
                  fontSize="9"
                  fontFamily="var(--font-data)"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  T+5 Proj
                </text>
              )}
            </>
          )}
        </svg>
      </div>

      {/* Chart Footer Indicator Legend */}
      <div className="candle-footer">
        <div className="footer-indicators">
          <span className="indicator-item">
            <span className="dot green" /> Bullish Session
          </span>
          <span className="indicator-item">
            <span className="dot red" /> Bearish Session
          </span>
          {showCone && (
            <>
              <span className="indicator-item">
                <span className="dash orange" /> Projected Drift
              </span>
              <span className="indicator-item">
                <span className="box teal" /> ±1σ &amp; ±2σ Confidence Cone
              </span>
            </>
          )}
        </div>
        <span className="footer-meta">
          {validData.length} Clean OHLCV Bars · Hover to inspect session wick/body
        </span>
      </div>
    </div>
  )
}
