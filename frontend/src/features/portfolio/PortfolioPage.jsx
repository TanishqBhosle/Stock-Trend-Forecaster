import { useState, useMemo, useEffect } from 'react'
import { Info, Plus, Trash2, TrendingUp, DollarSign, PieChart, ShieldCheck } from 'lucide-react'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { DEMO_STOCKS } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { formatPrice, formatReturn } from '@/lib/signals'
import {
  fetchPersistedPortfolio,
  addPersistedPortfolioHolding,
  deletePersistedPortfolioHolding
} from '@/services/stockService'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import './PortfolioPage.css'

const COLORS = ['var(--chart-line)', 'var(--terracotta)', 'var(--teal)', 'var(--amber)']
const AVAILABLE = DEMO_STOCKS

export default function PortfolioPage() {
  const { addToast } = useToast()
  const [selected, setSelected] = useState(['^GSPC'])
  const [range, setRange] = useState('6M')
  const [holdings, setHoldings] = useState([])
  const [loadingHoldings, setLoadingHoldings] = useState(true)
  const [isDbSynced, setIsDbSynced] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Add holding form state
  const [newTicker, setNewTicker] = useState('^GSPC')
  const [newShares, setNewShares] = useState('10')
  const [newPrice, setNewPrice] = useState('5500')
  const [newDate, setNewDate] = useState('2024-03-15')
  const [newNotes, setNewNotes] = useState('Core investment')
  const [submitting, setSubmitting] = useState(false)

  // Load portfolio holdings on mount
  useEffect(() => {
    let mounted = true
    async function loadPortfolio() {
      setLoadingHoldings(true)
      try {
        const data = await fetchPersistedPortfolio()
        if (mounted && data && Array.isArray(data)) {
          setHoldings(data)
          setIsDbSynced(true)
        } else if (mounted) {
          // Local fallback initial holding
          setHoldings([
            {
              id: 1,
              ticker: '^GSPC',
              shares: 10,
              avgBuyPrice: 5400,
              currentPrice: 5864.67,
              marketValue: 58646.7,
              totalCost: 54000,
              unrealizedPnl: 4646.7,
              unrealizedPnlPct: 0.086,
              purchaseDate: '2024-03-15',
              notes: 'Core Index Position'
            }
          ])
        }
      } catch (err) {
        console.warn('Portfolio load error:', err)
      } finally {
        if (mounted) setLoadingHoldings(false)
      }
    }
    loadPortfolio()
    return () => { mounted = false }
  }, [])

  const handleAddHolding = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ticker: newTicker,
        shares: Number(newShares),
        avgBuyPrice: Number(newPrice),
        purchaseDate: newDate,
        notes: newNotes
      }
      const created = await addPersistedPortfolioHolding(payload)
      if (created) {
        setHoldings(prev => [...prev, created])
        setIsDbSynced(true)
      } else {
        // Optimistic local add
        const currentRefPrice = 5864.67
        const totalCost = Number(newShares) * Number(newPrice)
        const marketValue = Number(newShares) * currentRefPrice
        const pnl = marketValue - totalCost
        setHoldings(prev => [
          ...prev,
          {
            id: Date.now(),
            ...payload,
            currentPrice: currentRefPrice,
            marketValue,
            totalCost,
            unrealizedPnl: pnl,
            unrealizedPnlPct: pnl / totalCost
          }
        ])
      }
      addToast(`Added ${newShares} shares of ${newTicker} to portfolio`, { type: 'success' })
      setShowAddModal(false)
    } catch (err) {
      addToast(`Failed to add holding: ${err.message}`, { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteHolding = async (id, ticker) => {
    try {
      await deletePersistedPortfolioHolding(id)
      setHoldings(prev => prev.filter(h => h.id !== id))
      addToast(`Removed ${ticker} from portfolio`, { type: 'info' })
    } catch (err) {
      addToast(`Failed to remove holding: ${err.message}`, { type: 'error' })
    }
  }

  const portfolioSummary = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue || (h.shares * h.avgBuyPrice)), 0)
    const totalCost = holdings.reduce((sum, h) => sum + (h.totalCost || (h.shares * h.avgBuyPrice)), 0)
    const totalPnl = totalValue - totalCost
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) : 0
    return { totalValue, totalCost, totalPnl, totalPnlPct }
  }, [holdings])

  const toggle = (ticker) => {
    setSelected(prev =>
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : prev.length < 4 ? [...prev, ticker] : prev
    )
  }

  const chartData = useMemo(() => {
    if (!selected.length) return []
    const seriesMap = {}
    for (const ticker of selected) {
      const rows = filterByRange(getOHLCV(ticker), range)
      const base = rows[0]?.close || 1
      for (const row of rows) {
        if (!seriesMap[row.date]) seriesMap[row.date] = { date: row.date }
        seriesMap[row.date][ticker] = +((row.close / base - 1) * 100).toFixed(2)
      }
    }
    return Object.values(seriesMap).sort((a, b) => a.date.localeCompare(b.date))
  }, [selected, range])

  return (
    <div className="portfolio-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Portfolio Holdings &amp; Multi-Asset Comparison</h1>
          <p className="page-subtitle">Track equity allocations, cost basis, real-time P&amp;L, and relative performance</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <DataProvenanceLabel type={isDbSynced ? "verified" : "demo"}>
            {isDbSynced ? "PostgreSQL Synced" : "Client Cached"}
          </DataProvenanceLabel>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            iconLeft={<Plus size={14} />}
          >
            Add Holding
          </Button>
        </div>
      </div>

      {/* Portfolio KPI Summary Strip */}
      <div className="portfolio-kpi-grid">
        <div className="portfolio-kpi-card">
          <span className="kpi-label">Total Portfolio Value</span>
          <span className="kpi-value">${portfolioSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="kpi-sub">Total Cost Basis: ${portfolioSummary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="portfolio-kpi-card">
          <span className="kpi-label">Unrealized P&amp;L ($)</span>
          <span className={`kpi-value ${portfolioSummary.totalPnl >= 0 ? 'pos' : 'neg'}`}>
            {portfolioSummary.totalPnl >= 0 ? `+$${portfolioSummary.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(portfolioSummary.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
          <span className="kpi-sub">Mark-to-market gain/loss</span>
        </div>
        <div className="portfolio-kpi-card">
          <span className="kpi-label">Unrealized Return (%)</span>
          <span className={`kpi-value ${portfolioSummary.totalPnlPct >= 0 ? 'pos' : 'neg'}`}>
            {formatReturn(portfolioSummary.totalPnlPct)}
          </span>
          <span className="kpi-sub">{holdings.length} Active Position{holdings.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Persisted Holdings Table */}
      <div className="portfolio-holdings-section">
        <div className="section-header-row">
          <h2 className="portfolio-section-title">Active Holdings ({holdings.length})</h2>
        </div>
        <div className="portfolio-table-wrap">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Avg Cost</th>
                <th>Current Price</th>
                <th>Market Value</th>
                <th>P&amp;L ($)</th>
                <th>Return (%)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const pnl = h.unrealizedPnl ?? ((h.currentPrice - h.avgBuyPrice) * h.shares)
                const pnlPct = h.unrealizedPnlPct ?? ((h.currentPrice - h.avgBuyPrice) / h.avgBuyPrice)
                return (
                  <tr key={h.id}>
                    <td>
                      <span className="holding-ticker-tag">{h.ticker}</span>
                    </td>
                    <td>{h.shares}</td>
                    <td>${Number(h.avgBuyPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${Number(h.currentPrice || h.avgBuyPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${Number(h.marketValue || (h.shares * h.avgBuyPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={pnl >= 0 ? 'pos' : 'neg'}>
                      {pnl >= 0 ? `+$${Number(pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `-$${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </td>
                    <td className={pnlPct >= 0 ? 'pos' : 'neg'}>
                      {formatReturn(pnlPct)}
                    </td>
                    <td>
                      <button
                        className="delete-holding-btn"
                        onClick={() => handleDeleteHolding(h.id, h.ticker)}
                        title="Remove holding"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Instrument Relative Performance Comparison */}
      <div className="portfolio-chart-section">
        <div className="portfolio-section-header">
          <div>
            <h2 className="portfolio-section-title">Relative Price Performance Comparison</h2>
            <p className="portfolio-section-sub">Normalized percentage movement (%) from starting date</p>
          </div>
          <ChartRangeSelector selected={range} onChange={setRange} />
        </div>

        <div className="portfolio-controls">
          <div className="portfolio-ticker-select" role="group" aria-label="Select instruments to compare (max 4)">
            {AVAILABLE.map((s) => (
              <button
                key={s.ticker}
                type="button"
                className={`pticker-btn ${selected.includes(s.ticker) ? 'active' : ''} ${s.ticker === '^GSPC' ? 'core-btn' : ''}`}
                onClick={() => toggle(s.ticker)}
                aria-pressed={selected.includes(s.ticker)}
              >
                {s.ticker}
              </button>
            ))}
          </div>
        </div>

        <div className="portfolio-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d?.slice(5)} />
              <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} tickFormatter={v=>`${v>0?'+':''}${v}%`} width={45} />
              <Tooltip contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} formatter={(v,name) => [`${v > 0 ? '+' : ''}${v}%`, name]} />
              {selected.map((ticker, i) => (
                <Line
                  key={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={1.75}
                  dot={false}
                  name={ticker}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add Holding Modal */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Equity Holding"
        description="Record a new stock or index position. Changes are persisted to the database."
      >
        <form onSubmit={handleAddHolding} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Select
            id="new-ticker"
            label="Instrument"
            value={newTicker}
            onChange={e => setNewTicker(e.target.value)}
          >
            {DEMO_STOCKS.map(s => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} — {s.name}
              </option>
            ))}
          </Select>

          <Input
            id="new-shares"
            label="Number of Shares"
            type="number"
            step="0.1"
            min="0.1"
            required
            value={newShares}
            onChange={e => setNewShares(e.target.value)}
          />

          <Input
            id="new-price"
            label="Average Buy Price ($)"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
          />

          <Input
            id="new-date"
            label="Purchase Date"
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
          />

          <Input
            id="new-notes"
            label="Strategy / Notes (Optional)"
            placeholder="e.g. Core long-term holding"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add to Portfolio
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
