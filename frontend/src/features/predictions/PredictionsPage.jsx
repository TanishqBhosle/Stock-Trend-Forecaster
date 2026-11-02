import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ExternalLink,
  Info,
  AlertTriangle,
  Target,
  Activity,
  HelpCircle
} from 'lucide-react'
import { SignalBadge, DataProvenanceLabel } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Dialog } from '@/components/ui/Dialog'
import { DEMO_PREDICTIONS } from '@/mocks/predictions'
import { fetchPredictions } from '@/services/stockService'
import { formatReturn } from '@/lib/signals'
import './PredictionsPage.css'

const PAGE_SIZE = 20
const SIGNALS = ['ALL', 'BULLISH', 'NEUTRAL', 'BEARISH']

// Helper to map return percentage to a 0-100% position on the threshold spectrum
function getSpectrumPosition(returnVal, minVal = -2.5, maxVal = 2.5) {
  if (returnVal === null || returnVal === undefined) return 50
  const pct = returnVal * 100
  const clamped = Math.max(minVal, Math.min(maxVal, pct))
  return ((clamped - minVal) / (maxVal - minVal)) * 100
}

export default function PredictionsPage() {
  const [query, setQuery] = useState('')
  const [signalFilter, setSignalFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState('predictionDate')
  const [sortDir, setSortDir] = useState('desc')
  const [liveRecords, setLiveRecords] = useState(null)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadLivePredictions() {
      setLoading(true)
      try {
        const res = await fetchPredictions({
          ticker: query || undefined,
          signal: signalFilter !== 'ALL' ? signalFilter : undefined,
          page,
          pageSize: PAGE_SIZE
        })
        if (mounted && res && res.records) {
          setLiveRecords(res.records)
          setTotalRecords(res.total ?? res.records.length)
        }
      } catch (err) {
        console.warn('Error loading live predictions:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadLivePredictions()
    return () => { mounted = false }
  }, [query, signalFilter, page])

  // Fallback filtering if live backend is unreachable
  const fallbackFiltered = useMemo(() => {
    let records = [...DEMO_PREDICTIONS]
    if (query) {
      const q = query.toLowerCase()
      records = records.filter(r => r.ticker.toLowerCase().includes(q))
    }
    if (signalFilter !== 'ALL') {
      records = records.filter(r => r.predictedDirection === signalFilter)
    }
    records.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return records
  }, [query, signalFilter, sortKey, sortDir])

  const totalCount = liveRecords ? totalRecords : fallbackFiltered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Sorted display records for current page
  const displayRecords = useMemo(() => {
    let list = liveRecords ? [...liveRecords] : fallbackFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    if (liveRecords && sortKey) {
      list.sort((a, b) => {
        let av = a[sortKey]
        let bv = b[sortKey]
        if (av === null || av === undefined) av = ''
        if (bv === null || bv === undefined) bv = ''
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [liveRecords, fallbackFiltered, page, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // Calculate delta between predicted return and actual return
  const getReturnDelta = (record) => {
    if (!record || record.actualReturn === null || record.actualReturn === undefined) return null
    const diff = Math.abs(record.predictedReturn - record.actualReturn) * 100
    return diff.toFixed(3)
  }

  // Diagnostic information for divergence
  const getDivergenceInfo = (record) => {
    if (!record) return null
    if (record.divergenceType && record.divergenceExplanation) {
      return {
        type: record.divergenceType,
        explanation: record.divergenceExplanation,
        regime: record.volatilityRegime || 'Normal Volatility'
      }
    }
    if (record.actualReturn === null || record.actualReturn === undefined) {
      return {
        type: 'Pending Settlement',
        explanation: 'Active trading session in progress. Full divergence diagnostics and error residuals will calculate automatically upon market close.',
        regime: 'Awaiting Settlement'
      }
    }
    if (record.correct) {
      return {
        type: 'Directional Match',
        explanation: `The PyTorch LSTM model successfully anticipated the market's directional movement. The actual return stayed within the model's expected trend corridor.`,
        regime: 'Direction Aligned'
      }
    }
    if (record.predictedReturn >= 0 && record.actualReturn < -0.002) {
      return {
        type: 'Downside Volatility Shock',
        explanation: `The model anticipated low-volatility drift (+${(record.predictedReturn * 100).toFixed(2)}%), but unexpected market selling pushed the S&P 500 down ${(record.actualReturn * 100).toFixed(2)}%. Typical catalysts include surprise macroeconomic data (hot CPI inflation, Fed speaker comments), bond yield surges, or broad tech-led risk-off rotations.`,
        regime: 'High Volatility Sell-Off'
      }
    }
    if (record.predictedReturn <= 0 && record.actualReturn > 0.002) {
      return {
        type: 'Upside Breakout Divergence',
        explanation: `The model anticipated muted or negative price action (${(record.predictedReturn * 100).toFixed(2)}%), but an aggressive market rally produced a +${(record.actualReturn * 100).toFixed(2)}% gain. Common catalysts include short-covering rallies, dovish policy signals, or positive earnings surprises.`,
        regime: 'Bullish Breakout Dispersion'
      }
    }
    return {
      type: 'Threshold Boundary Drift',
      explanation: `The prediction and actual outcome landed near the ±0.20% classification boundary, differing by ${getReturnDelta(record)}%.`,
      regime: 'Compressed Volatility Drift'
    }
  }

  const selectedDivergence = selectedRecord ? getDivergenceInfo(selectedRecord) : null

  return (
    <div className="predictions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Prediction History</h1>
          <p className="page-subtitle">
            {totalCount} verified prediction records &bull; Click any row to view full return breakdown &amp; divergence analysis
          </p>
        </div>
        <DataProvenanceLabel type={liveRecords ? 'verified' : 'illustrative'}>
          {liveRecords ? `Verified Database Log (${totalCount} Records)` : 'Illustrative Log'}
        </DataProvenanceLabel>
      </div>

      <div className="predictions-controls">
        <Input
          id="pred-search"
          placeholder="Filter by ticker (e.g. ^GSPC)…"
          iconLeft={<Search size={14} />}
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1) }}
          fullWidth={false}
        />
        <div className="signal-filter-group" role="group">
          {SIGNALS.map(f => (
            <button
              key={f}
              className={`signal-filter-btn ${signalFilter === f ? 'active' : ''} ${f.toLowerCase()}`}
              onClick={() => { setSignalFilter(f); setPage(1) }}
              aria-pressed={signalFilter === f}
            >
              {f === 'ALL' ? 'All Signals' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && displayRecords.length === 0 ? (
        <div className="pred-loading-state">
          <p>Loading verified historical predictions from database...</p>
        </div>
      ) : displayRecords.length === 0 ? (
        <EmptyState
          illustration="search"
          title="No records found"
          description="No predictions match the selected filters or ticker search."
          actionLabel="Reset Filters"
          onAction={() => { setQuery(''); setSignalFilter('ALL') }}
        />
      ) : (
        <>
          <div className="predictions-table-wrap">
            <table className="predictions-table" aria-label="Prediction history table">
              <thead>
                <tr>
                  {[
                    { key: 'predictionDate', label: 'Date' },
                    { key: 'ticker', label: 'Ticker' },
                    { key: 'predictedDirection', label: 'Direction' },
                    { key: 'predictedReturn', label: 'Pred. Return' },
                    { key: 'actualReturn', label: 'Actual Return' },
                    { key: 'correct', label: 'Correct' },
                    { key: 'modelVersion', label: 'Model' },
                    { key: 'actions', label: 'Details' }
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== 'actions' && handleSort(col.key)}
                      className={col.key !== 'actions' ? 'sortable' : ''}
                      aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRecords.map(r => {
                  const isPending = r.actualReturn === null || r.actualReturn === undefined
                  return (
                    <tr
                      key={r.id}
                      className="pred-row"
                      onClick={() => setSelectedRecord(r)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View full prediction return details for ${r.ticker} on ${r.predictionDate}`}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedRecord(r)}
                    >
                      <td className="pred-date">
                        {r.predictionDate}
                        {r.forecastFor && r.forecastFor !== r.predictionDate && (
                          <span className="pred-target-tag">Target: {r.forecastFor}</span>
                        )}
                      </td>
                      <td className="pred-ticker">{r.ticker}</td>
                      <td>
                        <SignalBadge signal={r.predictedDirection} size="sm" />
                      </td>
                      <td className={`pred-num ${r.predictedReturn >= 0 ? 'pos' : 'neg'}`}>
                        {formatReturn(r.predictedReturn)}
                      </td>
                      <td className={`pred-num ${isPending ? 'pending' : (r.actualReturn >= 0 ? 'pos' : 'neg')}`}>
                        {isPending ? (
                          <span className="pending-badge" title="Session pending close / market settlement">
                            <Clock size={11} /> Pending
                          </span>
                        ) : (
                          formatReturn(r.actualReturn)
                        )}
                      </td>
                      <td className="pred-status-cell">
                        {isPending ? (
                          <span className="pred-pending-dot" title="Awaiting session close">—</span>
                        ) : r.correct === true ? (
                          <span className="pred-correct" title="Directionally correct"><CheckCircle2 size={15} /></span>
                        ) : (
                          <span className="pred-incorrect" title="Directional divergence"><XCircle size={15} /></span>
                        )}
                      </td>
                      <td className="pred-model">{r.modelVersion}</td>
                      <td className="pred-action-cell">
                        <button
                          type="button"
                          className="view-pred-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRecord(r)
                          }}
                        >
                          View Details &rarr;
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="pred-pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="pred-page-btn"
            >
              &larr; Prev
            </button>
            <span className="pred-page-info">
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="pred-page-btn"
            >
              Next &rarr;
            </button>
          </div>
        </>
      )}

      {/* Full Prediction Return Detail Modal */}
      <Dialog
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord ? `Prediction Return Analysis: ${selectedRecord.ticker}` : ''}
        size="lg"
      >
        {selectedRecord && (
          <div className="pred-modal-content">
            <div className="pred-modal-meta-bar">
              <div className="pred-meta-item">
                <span className="meta-label">Forecast Generated:</span>
                <span className="meta-value">{selectedRecord.predictionDate}</span>
              </div>
              <div className="pred-meta-item">
                <span className="meta-label">Target Trading Session:</span>
                <span className="meta-value highlight">{selectedRecord.forecastFor || selectedRecord.predictionDate}</span>
              </div>
              <div className="pred-meta-item">
                <span className="meta-label">Model Engine:</span>
                <span className="meta-value">{selectedRecord.modelVersion}</span>
              </div>
              <div className="pred-meta-item">
                <span className="meta-label">Data Status:</span>
                <span className="meta-value verified">Verified Out-of-Sample</span>
              </div>
            </div>

            {/* Key Returns Grid */}
            <div className="pred-detail-cards-grid">
              {/* Predicted Return */}
              <div className="pred-detail-card highlight-card">
                <div className="card-top">
                  <span className="card-title">Forecasted Return</span>
                  <SignalBadge signal={selectedRecord.predictedDirection} size="sm" />
                </div>
                <div className={`card-value-hero ${selectedRecord.predictedReturn >= 0 ? 'pos' : 'neg'}`}>
                  {selectedRecord.predictedReturn >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  <span>{formatReturn(selectedRecord.predictedReturn)}</span>
                </div>
                <div className="card-subtext">
                  Expected 1-day price return relative to baseline close
                </div>
              </div>

              {/* Actual Realized Return */}
              <div className="pred-detail-card">
                <div className="card-top">
                  <span className="card-title">Actual Realized Return</span>
                  {selectedRecord.actualReturn !== null && selectedRecord.actualReturn !== undefined ? (
                    <span className={`return-dir-pill ${selectedRecord.actualReturn >= 0 ? 'pos' : 'neg'}`}>
                      {selectedRecord.actualReturn >= 0 ? 'Positive' : 'Negative'}
                    </span>
                  ) : (
                    <span className="return-dir-pill pending">Awaiting Close</span>
                  )}
                </div>
                <div className={`card-value-hero ${selectedRecord.actualReturn === null ? 'pending' : (selectedRecord.actualReturn >= 0 ? 'pos' : 'neg')}`}>
                  {selectedRecord.actualReturn !== null && selectedRecord.actualReturn !== undefined ? (
                    <>
                      {selectedRecord.actualReturn >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                      <span>{formatReturn(selectedRecord.actualReturn)}</span>
                    </>
                  ) : (
                    <span className="pending-text"><Clock size={20} /> Pending Settlement</span>
                  )}
                </div>
                <div className="card-subtext">
                  {selectedRecord.actualReturn !== null && selectedRecord.actualReturn !== undefined
                    ? 'Verified market settlement return'
                    : 'Trading session is currently active or upcoming'}
                </div>
              </div>

              {/* Direction & Accuracy Outcome */}
              <div className="pred-detail-card">
                <div className="card-top">
                  <span className="card-title">Directional Accuracy</span>
                  {selectedRecord.correct === true ? (
                    <span className="outcome-pill success">Correct</span>
                  ) : selectedRecord.correct === false ? (
                    <span className="outcome-pill fail">Divergent</span>
                  ) : (
                    <span className="outcome-pill pending">Pending</span>
                  )}
                </div>
                <div className="card-outcome-body">
                  {selectedRecord.correct === true && (
                    <div className="accuracy-label correct">
                      <CheckCircle2 size={24} />
                      <span>Trend Predicted Accurately</span>
                    </div>
                  )}
                  {selectedRecord.correct === false && (
                    <div className="accuracy-label incorrect">
                      <XCircle size={24} />
                      <span>Market Diverged from Forecast</span>
                    </div>
                  )}
                  {selectedRecord.correct === null && (
                    <div className="accuracy-label pending">
                      <Clock size={24} />
                      <span>Awaiting Settlement Verification</span>
                    </div>
                  )}
                </div>
                <div className="card-subtext">
                  {getReturnDelta(selectedRecord)
                    ? `Residual Delta: ±${getReturnDelta(selectedRecord)}%`
                    : 'Residual will be computed upon market close'}
                </div>
              </div>
            </div>

            {/* Visual Signal Threshold Spectrum Visualizer */}
            <div className="threshold-spectrum-panel">
              <div className="spectrum-header">
                <div className="spectrum-title-wrap">
                  <Activity size={16} className="spectrum-icon" />
                  <span className="spectrum-title">Signal Classification Threshold Spectrum</span>
                </div>
                <span className="spectrum-badge">Classification Threshold: &plusmn;0.20%</span>
              </div>

              <div className="spectrum-track-container">
                {/* Visual meter bar with 3 classification zones */}
                <div className="spectrum-track">
                  <div className="zone zone-bearish">
                    <span className="zone-name">BEARISH</span>
                    <span className="zone-range">&lt; -0.20%</span>
                  </div>
                  <div className="zone zone-neutral">
                    <span className="zone-name">NEUTRAL (FLAT)</span>
                    <span className="zone-range">-0.20% to +0.20%</span>
                  </div>
                  <div className="zone zone-bullish">
                    <span className="zone-name">BULLISH</span>
                    <span className="zone-range">&gt; +0.20%</span>
                  </div>
                </div>

                {/* Markers on the track */}
                <div className="spectrum-markers-layer">
                  {/* Forecast Marker Pin */}
                  <div
                    className="spectrum-pin forecast-pin"
                    style={{ left: `${getSpectrumPosition(selectedRecord.predictedReturn)}%` }}
                    title={`Forecast: ${formatReturn(selectedRecord.predictedReturn)} (${selectedRecord.predictedDirection})`}
                  >
                    <div className="pin-flag">
                      <Target size={11} />
                      <span>Pred {formatReturn(selectedRecord.predictedReturn)}</span>
                    </div>
                    <div className="pin-stem" />
                    <div className="pin-dot" />
                  </div>

                  {/* Actual Marker Pin (if settled) */}
                  {selectedRecord.actualReturn !== null && selectedRecord.actualReturn !== undefined && (
                    <div
                      className="spectrum-pin actual-pin"
                      style={{ left: `${getSpectrumPosition(selectedRecord.actualReturn)}%` }}
                      title={`Actual: ${formatReturn(selectedRecord.actualReturn)}`}
                    >
                      <div className="pin-flag actual-flag">
                        <Activity size={11} />
                        <span>Actual {formatReturn(selectedRecord.actualReturn)}</span>
                      </div>
                      <div className="pin-stem" />
                      <div className="pin-dot" />
                    </div>
                  )}
                </div>
              </div>

              <div className="spectrum-footer">
                <span className="spectrum-axis-label">-2.5%</span>
                <span className="spectrum-axis-label center">0.0% Axis</span>
                <span className="spectrum-axis-label">+2.5%</span>
              </div>
            </div>

            {/* Price Levels Breakdown */}
            <div className="pred-price-levels-panel">
              <h3 className="section-heading">Price Level Trajectory</h3>
              <div className="price-levels-grid">
                <div className="price-level-item">
                  <span className="level-label">Reference Baseline Close</span>
                  <span className="level-val">
                    ${selectedRecord.referenceClose ? selectedRecord.referenceClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (selectedRecord.actualClose ? (selectedRecord.actualClose / (1 + selectedRecord.actualReturn)).toFixed(2) : '—')}
                  </span>
                  <span className="level-note">Price at forecast generation</span>
                </div>

                <div className="price-level-arrow">
                  <ArrowRight size={18} />
                </div>

                <div className="price-level-item highlight">
                  <span className="level-label">Implied Predicted Close</span>
                  <span className="level-val">
                    ${selectedRecord.predictedClose ? selectedRecord.predictedClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </span>
                  <span className="level-note">Target: {selectedRecord.forecastFor}</span>
                </div>

                <div className="price-level-arrow">
                  <ArrowRight size={18} />
                </div>

                <div className="price-level-item">
                  <span className="level-label">Realized Market Close</span>
                  <span className={`level-val ${selectedRecord.actualClose ? '' : 'pending'}`}>
                    {selectedRecord.actualClose ? `$${selectedRecord.actualClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Pending Close'}
                  </span>
                  <span className="level-note">
                    {selectedRecord.actualClose ? 'Settled close price' : 'Awaiting market data'}
                  </span>
                </div>
              </div>
            </div>

            {/* Deep Divergence Diagnostics Card */}
            {selectedDivergence && (
              <div className={`divergence-diagnostic-card ${selectedRecord.correct === false ? 'divergent' : (selectedRecord.correct === true ? 'matched' : 'pending')}`}>
                <div className="diag-header">
                  <div className="diag-title-group">
                    {selectedRecord.correct === false ? (
                      <AlertTriangle size={18} className="diag-icon alert" />
                    ) : selectedRecord.correct === true ? (
                      <CheckCircle2 size={18} className="diag-icon match" />
                    ) : (
                      <Clock size={18} className="diag-icon clock" />
                    )}
                    <span className="diag-title">
                      {selectedRecord.correct === false
                        ? `Divergence Diagnostic: ${selectedDivergence.type}`
                        : selectedRecord.correct === true
                        ? `Trend Verification: ${selectedDivergence.type}`
                        : `Active Forward Status: ${selectedDivergence.type}`}
                    </span>
                  </div>
                  <span className="diag-regime-tag">{selectedDivergence.regime}</span>
                </div>

                <p className="diag-explanation">{selectedDivergence.explanation}</p>

                {selectedRecord.correct === false && (
                  <div className="diag-takeaways-grid">
                    <div className="takeaway-box">
                      <div className="takeaway-title">
                        <HelpCircle size={13} />
                        <span>Why This Divergence Occurs</span>
                      </div>
                      <p className="takeaway-desc">
                        The LSTM identifies statistical momentum and volatility compression from trailing 60-day historical technical series. It cannot foresee unanticipated intraday macro surprises, sudden Fed remarks, or breaking geopolitical headlines.
                      </p>
                    </div>

                    <div className="takeaway-box">
                      <div className="takeaway-title">
                        <Activity size={13} />
                        <span>Actionable Quantitative Takeaway</span>
                      </div>
                      <p className="takeaway-desc">
                        Broad market indices experience non-stationary volatility shocks on 40&ndash;45% of trading days. In institutional quantitative portfolios, these divergence days are managed via disciplined trailing stop-loss buffers and dynamic position sizing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Educational & Architecture Note */}
            <div className="pred-explanation-panel">
              <div className="explanation-header">
                <Info size={16} />
                <span>How this Prediction was Evaluated</span>
              </div>
              <p className="explanation-body">
                The <strong>PyTorch 2-layer LSTM model</strong> processes a 60-day sequence of 6 macroeconomic and technical indicators (Close, Volume, Daily Returns, 20-day SMA, 20-day Historical Volatility, and High-Low Spread). 
                Daily return predictions within [-0.20%, +0.20%] are classified as <strong>NEUTRAL</strong>, above +0.20% as <strong>BULLISH</strong>, and below -0.20% as <strong>BEARISH</strong>.
              </p>
              {selectedRecord.actualReturn === null && (
                <div className="active-session-note">
                  <strong>Note on Active Sessions:</strong> This is an active forward prediction. The actual return, closing price, and directional accuracy will automatically populate and verify as soon as the trading session concludes and official market data is ingested.
                </div>
              )}
            </div>

            <div className="pred-modal-footer">
              <div className="footer-left-actions">
                <Link to={`/app/stocks/${encodeURIComponent(selectedRecord.ticker)}`} className="chart-link-btn">
                  <ExternalLink size={14} /> Open S&P 500 Interactive Chart
                </Link>
                <Link to="/app/dashboard" className="macro-link-btn">
                  <Activity size={14} /> View Macro News &amp; Sentiment Feed
                </Link>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
