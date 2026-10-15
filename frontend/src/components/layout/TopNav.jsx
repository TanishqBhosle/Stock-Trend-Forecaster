import { useState, useRef, useEffect } from 'react'
import { Search, Menu, Settings, LogOut, ArrowRightLeft } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { IconButton } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import './TopNav.css'

/**
 * Top navigation bar for authenticated workspace.
 *
 * @param {object} props
 * @param {string[]} [props.breadcrumbs] - e.g. ['Dashboard', 'AAPL']
 * @param {Function} props.onOpenSearch
 * @param {Function} [props.onOpenDrawer] - mobile drawer
 * @param {'user'|'scientist'} [props.workspace='user']
 */
export function TopNav({ breadcrumbs = [], onOpenSearch, onOpenDrawer, workspace = 'user' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className={`topnav topnav-${workspace}`} role="banner">
      {/* Mobile menu */}
      <IconButton
        label="Open navigation menu"
        className="topnav-menu-btn"
        onClick={onOpenDrawer}
      >
        <Menu size={18} />
      </IconButton>

      {/* Breadcrumbs */}
      <nav className="topnav-breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="topnav-crumb-wrap">
            {i > 0 && <span className="topnav-crumb-sep" aria-hidden="true">/</span>}
            <span
              className={`topnav-crumb ${i === breadcrumbs.length - 1 ? 'topnav-crumb-active' : ''}`}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="topnav-actions">
        {/* Search trigger */}
        <button
          className="topnav-search-btn"
          onClick={onOpenSearch}
          aria-label="Search tickers (Ctrl+K)"
        >
          <Search size={14} className="topnav-search-icon" aria-hidden="true" />
          <span className="topnav-search-text">Search tickers…</span>
          <kbd className="topnav-search-kbd">⌘K</kbd>
        </button>

        <ThemeToggle />

        {/* User menu dropdown */}
        <div className="topnav-user" ref={menuRef}>
          <button
            className="topnav-user-btn"
            aria-label="User menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="topnav-avatar" aria-hidden="true">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </button>

          {menuOpen && (
            <div className="topnav-dropdown" role="menu" aria-label="User account menu">
              <div className="topnav-dropdown-header">
                <div className="topnav-dropdown-user-info">
                  <p className="topnav-dropdown-name">{user?.name || 'Demo Analyst'}</p>
                  <p className="topnav-dropdown-email">{user?.email || 'demo@arthnex.internal'}</p>
                </div>
                <span className="topnav-dropdown-role-badge">
                  {workspace === 'scientist' ? 'Data Scientist' : 'Investor / Analyst'}
                </span>
              </div>

              <div className="topnav-dropdown-divider" />

              <div className="topnav-dropdown-items">
                {workspace === 'user' ? (
                  <Link
                    to="/scientist/performance"
                    className="topnav-dropdown-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ArrowRightLeft size={14} />
                    <span>Switch to Scientist View</span>
                  </Link>
                ) : (
                  <Link
                    to="/app/dashboard"
                    className="topnav-dropdown-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ArrowRightLeft size={14} />
                    <span>Switch to Analyst View</span>
                  </Link>
                )}

                <Link
                  to="/app/settings"
                  className="topnav-dropdown-item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings size={14} />
                  <span>Workspace Settings</span>
                </Link>
              </div>

              <div className="topnav-dropdown-divider" />

              <button
                className="topnav-dropdown-item topnav-dropdown-signout"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
