/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DEMO_STOCKS } from '@/mocks/stocks'
import './CommandPalette.css'

/**
 * Cmd/Ctrl+K command palette for ticker + navigation search.
 */
export function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const results = query.trim()
    ? DEMO_STOCKS.filter(
        (s) =>
          s.ticker.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : DEMO_STOCKS.slice(0, 6)

  useEffect(() => {
    if (open) {
      // Reset happens outside the effect body via ref to avoid cascading renders
      setTimeout(() => {
        setQuery('')
        setActiveIdx(0)
        inputRef.current?.focus()
      }, 0)
    }
  }, [open])

  const select = useCallback((stock) => {
    navigate(`/app/stocks/${stock.ticker}`)
    onClose()
  }, [navigate, onClose])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIdx]) { select(results[activeIdx]) }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="cmd-root" role="presentation">
          <motion.div
            className="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="cmd-positioner">
            <motion.div
              className="cmd-panel"
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-label="Stock search"
              onKeyDown={handleKeyDown}
            >
              <div className="cmd-input-row">
                <Search size={16} className="cmd-search-icon" aria-hidden="true" />
                <input
                  ref={inputRef}
                  className="cmd-input"
                  placeholder="Search tickers or company names…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
                  aria-label="Search stocks"
                  aria-autocomplete="list"
                  aria-controls="cmd-results"
                />
                <button className="cmd-close" onClick={onClose} aria-label="Close search">
                  <X size={14} />
                </button>
              </div>
              <div id="cmd-results" className="cmd-results" role="listbox" aria-label="Search results">
                {results.length === 0 ? (
                  <div className="cmd-empty">No matching tickers</div>
                ) : (
                  results.map((stock, i) => (
                    <button
                      key={stock.ticker}
                      role="option"
                      aria-selected={i === activeIdx}
                      className={`cmd-item ${i === activeIdx ? 'cmd-item-active' : ''}`}
                      onClick={() => select(stock)}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      <span className="cmd-ticker">{stock.ticker}</span>
                      <span className="cmd-name">{stock.name}</span>
                      <span className="cmd-sector">{stock.sector}</span>
                    </button>
                  ))
                )}
              </div>
              <div className="cmd-footer">
                <span className="cmd-hint"><kbd>↑↓</kbd> navigate</span>
                <span className="cmd-hint"><kbd>↵</kbd> open</span>
                <span className="cmd-hint"><kbd>Esc</kbd> close</span>
                <span className="cmd-demo">Demo data</span>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

export { useCommandPalette } from '@/hooks/useCommandPalette'
