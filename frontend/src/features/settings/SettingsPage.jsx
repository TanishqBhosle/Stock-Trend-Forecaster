import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, Trash2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import './SettingsPage.css'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, logout, updateRole } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [defaultTicker, setDefaultTicker] = useState('AAPL')
  const [defaultRange, setDefaultRange] = useState('1Y')

  const clearData = () => {
    localStorage.removeItem('stf-watchlist')
    addToast('Local demo data cleared', { type: 'success' })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Demo profile and workspace preferences</p>
        </div>
        <DataProvenanceLabel type="demo" />
      </div>

      <div className="settings-layout">
        <section className="settings-section">
          <h2 className="settings-section-title">Demo profile</h2>
          <div className="settings-row">
            <span className="settings-label">Name</span>
            <span className="settings-value">{user?.name ?? '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value font-data">{user?.email ?? '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Role</span>
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
            <span className="settings-label">Auth status</span>
            <span className="settings-value settings-demo-note">Demo session — not production secure</span>
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
                <Sun size={14} /> Light
              </button>
              <button
                className={`theme-choice ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                <Moon size={14} /> Dark
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Workspace preferences</h2>
          <div className="settings-row">
            <span className="settings-label">Default ticker</span>
            <Select id="defaultTicker" value={defaultTicker} onChange={e => setDefaultTicker(e.target.value)} fullWidth={false}>
              {['AAPL','MSFT','GOOGL','NVDA','SPY'].map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="settings-row">
            <span className="settings-label">Default chart range</span>
            <Select id="defaultRange" value={defaultRange} onChange={e => setDefaultRange(e.target.value)} fullWidth={false}>
              {['1M','3M','6M','1Y','MAX'].map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Data source status</h2>
          <div className="settings-row">
            <span className="settings-label">Mock data</span>
            <span className="settings-value settings-status-active">Active</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Real API</span>
            <span className="settings-value settings-status-inactive">Not connected</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Model artifacts</span>
            <span className="settings-value settings-status-inactive">Not available</span>
          </div>
        </section>

        <section className="settings-section settings-danger-zone">
          <h2 className="settings-section-title settings-danger-title">Danger zone</h2>
          <div className="settings-danger-actions">
            <div className="settings-danger-item">
              <div>
                <p className="settings-danger-label">Clear local demo data</p>
                <p className="settings-danger-desc">Resets watchlist and local preferences. Does not affect demo session.</p>
              </div>
              <Button variant="secondary" size="sm" iconLeft={<Trash2 size={14} />} onClick={clearData}>
                Clear data
              </Button>
            </div>
            <div className="settings-danger-item">
              <div>
                <p className="settings-danger-label">Sign out</p>
                <p className="settings-danger-desc">End the current demo session.</p>
              </div>
              <Button variant="danger" size="sm" iconLeft={<LogOut size={14} />} onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
