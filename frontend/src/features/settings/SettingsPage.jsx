import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Trash2, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import './SettingsPage.css'

const NOTIF_KEY = 'stf-notification-prefs'
const DEFAULT_NOTIFS = {
  dailyDigest: true,
  signalAlerts: true,
  artifactAlerts: false,
}

function loadNotificationPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? { ...DEFAULT_NOTIFS, ...JSON.parse(raw) } : DEFAULT_NOTIFS
  } catch {
    return DEFAULT_NOTIFS
  }
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, logout, updateRole } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [defaultTicker, setDefaultTicker] = useState('^GSPC')
  const [defaultRange, setDefaultRange] = useState('1Y')
  const [notifs, setNotifs] = useState(loadNotificationPrefs)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const toggleNotif = (key) => {
    setNotifs(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      localStorage.setItem(NOTIF_KEY, JSON.stringify(updated))
      addToast('Notification preferences updated', { type: 'success' })
      return updated
    })
  }

  const confirmClearData = () => {
    localStorage.removeItem('stf-watchlist')
    localStorage.removeItem(NOTIF_KEY)
    setNotifs(DEFAULT_NOTIFS)
    setDefaultTicker('^GSPC')
    setDefaultRange('1Y')
    setResetDialogOpen(false)
    addToast('Local demo preferences & watchlist reset', { type: 'success' })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings &amp; Preferences</h1>
          <p className="page-subtitle">Client configuration, local storage, and demo profile</p>
        </div>
        <DataProvenanceLabel type="demo">Local storage only</DataProvenanceLabel>
      </div>

      <div className="settings-layout">
        <section className="settings-section">
          <h2 className="settings-section-title">Demo Profile</h2>
          <div className="settings-row">
            <span className="settings-label">Name</span>
            <span className="settings-value">{user?.name ?? '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value font-data">{user?.email ?? '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Workspace Mode</span>
            <Select
              id="role"
              value={user?.role ?? 'user'}
              onChange={e => { updateRole(e.target.value); addToast('Workspace role updated', { type: 'success' }) }}
              fullWidth={false}
            >
              <option value="user">Investor / Analyst</option>
              <option value="scientist">Data Scientist</option>
            </Select>
          </div>
          <div className="settings-row">
            <span className="settings-label">Authentication Status</span>
            <span className="settings-value settings-demo-note">
              <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Client Demo Session — No sensitive data collected
            </span>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-row">
            <span className="settings-label">Theme</span>
            <div className="theme-toggle-group" role="group" aria-label="Select theme">
              <button
                className={`theme-choice ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                <Sun size={14} /> Light Editorial
              </button>
              <button
                className={`theme-choice ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                <Moon size={14} /> Dark Slate
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Workspace Preferences</h2>
          <div className="settings-row">
            <span className="settings-label">Default instrument</span>
            <Select id="defaultTicker" value={defaultTicker} onChange={e => { setDefaultTicker(e.target.value); addToast('Default instrument saved', { type: 'info' }) }} fullWidth={false}>
              {['^GSPC (Primary Index)', 'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'SPY'].map(t => {
                const val = t.split(' ')[0]
                return <option key={val} value={val}>{t}</option>
              })}
            </Select>
          </div>
          <div className="settings-row">
            <span className="settings-label">Default chart horizon</span>
            <Select id="defaultRange" value={defaultRange} onChange={e => { setDefaultRange(e.target.value); addToast('Chart range saved', { type: 'info' }) }} fullWidth={false}>
              {['1M','3M','6M','1Y','MAX'].map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
        </section>

        {/* Local Notification Preferences */}
        <section className="settings-section">
          <h2 className="settings-section-title">Local Notification Simulation</h2>
          <p className="settings-desc">Configured locally in browser; simulated alerts for market forecasts.</p>
          <div className="settings-toggle-list">
            <label className="settings-toggle-row">
              <div className="st-info">
                <span className="st-title">Daily S&amp;P 500 Market Briefing</span>
                <span className="st-sub">Receive simulated next-day close forecast notifications.</span>
              </div>
              <input
                type="checkbox"
                checked={notifs.dailyDigest}
                onChange={() => toggleNotif('dailyDigest')}
                className="st-checkbox"
              />
            </label>
            <label className="settings-toggle-row">
              <div className="st-info">
                <span className="st-title">Trend Boundary Alerts (&gt;±0.5%)</span>
                <span className="st-sub">Alert when forecast returns breach bullish/bearish thresholds.</span>
              </div>
              <input
                type="checkbox"
                checked={notifs.signalAlerts}
                onChange={() => toggleNotif('signalAlerts')}
                className="st-checkbox"
              />
            </label>
            <label className="settings-toggle-row">
              <div className="st-info">
                <span className="st-title">Research Artifact Generation Alerts</span>
                <span className="st-sub">Notify when new model weights or metrics.json are verified.</span>
              </div>
              <input
                type="checkbox"
                checked={notifs.artifactAlerts}
                onChange={() => toggleNotif('artifactAlerts')}
                className="st-checkbox"
              />
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Data Source &amp; Backend Connectivity</h2>
          <div className="settings-row">
            <span className="settings-label">Frontend Mock Layer</span>
            <span className="settings-value settings-status-active">Active (VITE_USE_MOCKS=true)</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">FastAPI Backend Service</span>
            <span className="settings-value settings-status-inactive">Disconnected (Frontend-only mode)</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Model Weights (models/lstm_model.pt)</span>
            <span className="settings-value settings-status-inactive">Pending training notebook execution</span>
          </div>
        </section>

        <section className="settings-section settings-danger-zone">
          <h2 className="settings-section-title settings-danger-title">Demo Maintenance &amp; Session</h2>
          <div className="settings-danger-actions">
            <div className="settings-danger-item">
              <div>
                <p className="settings-danger-label">Reset local demo state</p>
                <p className="settings-danger-desc">Clears your saved watchlist and client preferences from browser localStorage.</p>
              </div>
              <Button variant="secondary" size="sm" iconLeft={<Trash2 size={14} />} onClick={() => setResetDialogOpen(true)}>
                Reset data…
              </Button>
            </div>
            <div className="settings-danger-item">
              <div>
                <p className="settings-danger-label">Sign out</p>
                <p className="settings-danger-desc">End the current client demo session and return to public landing.</p>
              </div>
              <Button variant="danger" size="sm" iconLeft={<LogOut size={14} />} onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        title="Reset Local Demo Data?"
        description="This action will clear your local watchlist and restore default preferences. It does not affect any remote server."
      >
        <div className="reset-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => setResetDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmClearData}>
            Confirm Reset
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
