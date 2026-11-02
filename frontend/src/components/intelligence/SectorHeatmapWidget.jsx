import { useState, useEffect } from 'react'
import { PieChart, Info, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react'
import './SectorHeatmapWidget.css'

export function SectorHeatmapWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSector, setSelectedSector] = useState(null)

  useEffect(() => {
    let mounted = true
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

    async function loadSectors() {
      try {
        const res = await fetch(`${apiBase}/api/intelligence/sectors`)
        if (res.ok && mounted) {
          const payload = await res.json()
          setData(payload)
        }
      } catch (err) {
        console.warn('Failed to load sector heatmap:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadSectors()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="sector-heatmap-card loading-state">
        <div className="sh-header">
          <div className="sh-title-wrap">
            <PieChart size={18} className="sh-icon" />
            <h3 className="sh-title">S&P 500 GICS Sector Heatmap & Breadth</h3>
          </div>
        </div>
        <div className="sh-grid-skeleton" />
      </div>
    )
  }

  if (!data || !data.sectors) return null

  const { sectors, breadth, rotation } = data

  return (
    <div className="sector-heatmap-card">
      <div className="sh-header">
        <div className="sh-title-wrap">
          <PieChart size={18} className="sh-icon" />
          <div>
            <h3 className="sh-title">S&P 500 GICS Sector Heatmap & Breadth</h3>
            <p className="sh-sub">Performance across all 11 official S&P 500 sectors & capital rotation analysis</p>
          </div>
        </div>

        {breadth && (
          <div className="sh-breadth-badge">
            <span className="sh-breadth-pct">{breadth.breadthPct}% Advancing</span>
            <span className="sh-breadth-tag">{breadth.healthAssessment}</span>
          </div>
        )}
      </div>

      {/* Sector Rotation Insight Banner */}
      {rotation && (
        <div className="sh-rotation-banner">
          <div className="sh-rotation-icon">
            <Compass size={16} />
          </div>
          <div className="sh-rotation-content">
            <strong>Sector Rotation: {rotation.mode}</strong>
            <p>{rotation.insight}</p>
          </div>
        </div>
      )}

      {/* Interactive 11-Sector Treemap / Grid */}
      <div className="sh-grid">
        {sectors.map((s) => {
          const isPos = s.changePct > 0
          const isNeg = s.changePct < 0
          const colorClass = isPos ? 'heat-positive' : isNeg ? 'heat-negative' : 'heat-neutral'

          // Intensity based on magnitude
          const intensity = Math.min(Math.abs(s.changePct) / 2.5, 1.0)
          const opacity = 0.15 + (intensity * 0.4)

          return (
            <div
              key={s.ticker}
              className={`sh-cell ${colorClass}`}
              style={{
                backgroundColor: isPos
                  ? `rgba(46, 125, 90, ${opacity})`
                  : isNeg
                  ? `rgba(181, 72, 58, ${opacity})`
                  : 'rgba(120, 110, 100, 0.15)'
              }}
              onClick={() => setSelectedSector(selectedSector?.ticker === s.ticker ? null : s)}
            >
              <div className="sh-cell-top">
                <span className="sh-cell-ticker">{s.ticker}</span>
                <span className="sh-cell-weight">{s.weight}%</span>
              </div>
              <span className="sh-cell-name">{s.name}</span>
              <div className="sh-cell-bottom">
                <span className="sh-cell-change">
                  {isPos ? <ArrowUpRight size={13} /> : isNeg ? <ArrowDownRight size={13} /> : null}
                  {s.changePct > 0 ? `+${s.changePct}%` : `${s.changePct}%`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail popover if user clicked a sector */}
      {selectedSector && (
        <div className="sh-detail-card">
          <div className="sh-detail-header">
            <strong>{selectedSector.name} ({selectedSector.ticker})</strong>
            <span>Index Weight: {selectedSector.weight}%</span>
          </div>
          <p className="sh-detail-desc">{selectedSector.description}</p>
        </div>
      )}

      {/* Educational takeaway on Market Breadth */}
      <div className="sh-education-box">
        <Info size={14} className="sh-edu-icon" />
        <div className="sh-edu-text">
          <strong>Educational Takeaway — Market Breadth vs Index Illusion:</strong>
          <p>
            Because the S&P 500 is market-cap weighted, a 3% rally in Mega-Cap Tech (XLK) can pull the entire index higher even if 8 out of 11 sectors are falling. A truly sustainable bull market requires <em>broad market breadth</em> where multiple cyclical sectors (Financials, Industrials, Materials) advance together.
          </p>
        </div>
      </div>
    </div>
  )
}

