import { useState, useEffect } from 'react'
import { Newspaper, ExternalLink, HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import './MacroNewsWidget.css'

export function MacroNewsWidget() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTooltip, setActiveTooltip] = useState(null)

  useEffect(() => {
    let mounted = true
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

    async function loadNews() {
      try {
        const res = await fetch(`${apiBase}/api/intelligence/news?limit=8`)
        if (res.ok && mounted) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setNews(data)
          }
        }
      } catch (err) {
        console.warn('Failed to load macro news feed:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadNews()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="macro-news-card loading-state">
        <div className="mn-header">
          <div className="mn-title-wrap">
            <Newspaper size={18} className="mn-icon" />
            <h3 className="mn-title">S&P 500 Macro & Real-Time Intelligence</h3>
          </div>
        </div>
        <div className="mn-skeleton-list">
          <div className="mn-skeleton-item" />
          <div className="mn-skeleton-item" />
          <div className="mn-skeleton-item" />
        </div>
      </div>
    )
  }

  return (
    <div className="macro-news-card">
      <div className="mn-header">
        <div className="mn-title-wrap">
          <Newspaper size={18} className="mn-icon" />
          <div>
            <h3 className="mn-title">S&P 500 Macro Intelligence & Sentiment Heat</h3>
            <p className="mn-sub">Real-time macroeconomic drivers classified by AI directional sentiment</p>
          </div>
        </div>
        <span className="mn-badge-live">LIVE MACRO FEED</span>
      </div>

      <div className="mn-list">
        {news.map((item) => {
          const isBullish = item.sentiment === 'Bullish'
          const isBearish = item.sentiment === 'Bearish'
          const badgeClass = isBullish ? 'sentiment-bullish' : isBearish ? 'sentiment-bearish' : 'sentiment-neutral'

          return (
            <article key={item.id} className="mn-item">
              <div className="mn-item-top">
                <span className="mn-category">{item.category}</span>
                <span className={`mn-sentiment-pill ${badgeClass}`}>
                  {isBullish ? <TrendingUp size={12} /> : isBearish ? <TrendingDown size={12} /> : <Minus size={12} />}
                  <span>{item.impactLabel}</span>
                </span>
              </div>

              <h4 className="mn-headline">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="mn-link">
                  {item.title}
                  <ExternalLink size={12} className="mn-ext" />
                </a>
              </h4>

              <div className="mn-meta-bar">
                <span className="mn-publisher">{item.publisher}</span>
                <span className="mn-date">{item.pubDate}</span>

                {item.educationalTakeaway && (
                  <div className="mn-edu-wrap">
                    <button
                      type="button"
                      className="mn-edu-trigger"
                      onClick={() => setActiveTooltip(activeTooltip === item.id ? null : item.id)}
                      title="Why this matters to S&P 500"
                    >
                      <HelpCircle size={13} />
                      <span>Why this matters</span>
                    </button>

                    {activeTooltip === item.id && (
                      <div className="mn-tooltip">
                        <div className="mn-tooltip-header">
                          <strong>Why this matters to S&P 500</strong>
                        </div>
                        <p>{item.educationalTakeaway}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

