import { useState, useMemo } from 'react'
import { Info } from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { ChartRangeSelector } from '@/components/ui/ChartRangeSelector'
import { DEMO_STOCKS } from '@/mocks/stocks'
import { getOHLCV, filterByRange } from '@/mocks/ohlcv'
import { formatPrice, formatReturn } from '@/lib/signals'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import './PortfolioPage.css'

const COLORS = ['var(--chart-line)','var(--terracotta)','var(--teal)','var(--amber)']
const AVAILABLE = DEMO_STOCKS
 
export default function PortfolioPage() {
  const [selected, setSelected] = useState(['^GSPC'])
  const [range, setRange] = useState('6M')

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
          <h1 className="page-title">Multi-Instrument Comparison</h1>
          <p className="page-subtitle">Normalised relative price movement (% from period start)</p>
        </div>
        <DataProvenanceLabel type="demo" />
      </div>

      {/* Scope callout */}
      <div className="portfolio-scope-callout">
        <Info size={16} className="callout-icon" />
        <p className="callout-text">
          <strong>Single-Asset Architecture Scope:</strong> ArthNex is trained on single-asset S&amp;P 500 (^GSPC) daily time-series data. Multi-asset portfolio analysis, correlation matrices, and custom allocations require multi-asset model pipelines. To prevent fabricating artificial portfolio returns, this view provides purely relative price-performance comparisons.
        </p>
      </div>

      <div className="portfolio-controls">
        <div className="portfolio-ticker-select" role="group" aria-label="Select instruments to compare (max 4)">
          {AVAILABLE.map((s) => (
            <button
              key={s.ticker}
              className={`pticker-btn ${selected.includes(s.ticker) ? 'active' : ''} ${s.ticker === '^GSPC' ? 'core-btn' : ''}`}
              onClick={() => toggle(s.ticker)}
              aria-pressed={selected.includes(s.ticker)}
              style={{ '--accent': COLORS[selected.indexOf(s.ticker)] }}
            >
              {s.ticker} {s.ticker === '^GSPC' ? '(Core)' : ''}
            </button>
          ))}
        </div>
        <ChartRangeSelector selected={range} onChange={setRange} />
      </div>

      {selected.length === 0 ? (
        <p className="portfolio-empty">Select at least one ticker to compare.</p>
      ) : (
        <>
          <div className="portfolio-chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" tickFormatter={d=>d?.slice(5)} />
                <YAxis tick={{ fontFamily:'var(--font-data)', fontSize:9, fill:'var(--chart-axis)' }} tickLine={false} axisLine={false} tickFormatter={v=>`${v > 0 ? '+' : ''}${v}%`} width={55} />
                <Tooltip formatter={(v,name) => [`${v > 0 ? '+' : ''}${v}%`, name]} contentStyle={{ fontFamily:'var(--font-data)', fontSize:'11px', background:'var(--chart-tooltip-bg)', border:'1px solid var(--chart-tooltip-border)', borderRadius:'4px' }} />
                <Legend wrapperStyle={{ fontFamily:'var(--font-data)', fontSize:'11px' }} />
                {selected.map((ticker, i) => (
                  <Line key={ticker} type="monotone" dataKey={ticker} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} activeDot={{ r:3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="portfolio-table-wrap">
            <table className="portfolio-table" aria-label="Portfolio comparison metrics">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Company</th>
                  <th>Current price</th>
                  <th>Forecast return</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((ticker, i) => {
                  const s = DEMO_STOCKS.find(st => st.ticker === ticker)
                  if (!s) return null
                  return (
                    <tr key={ticker}>
                      <td style={{ color: COLORS[i % COLORS.length], fontWeight: 600 }}>{ticker}</td>
                      <td className="pt-name">{s.name}</td>
                      <td>{formatPrice(s.mockPrice)}</td>
                      <td className={s.mockReturn >= 0 ? 'pos' : 'neg'}>{formatReturn(s.mockReturn)}</td>
                      <td><SignalBadge signal={s.mockSignal} size="sm" /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="portfolio-disclaimer">
            Note: This comparison uses illustrative demo data and does not reflect a connected brokerage account.
            Normalised to period start = 0%.
          </p>
        </>
      )}
    </div>
  )
}
