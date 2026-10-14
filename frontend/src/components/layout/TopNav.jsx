import { Search, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

  const handleLogout = () => {
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

        {/* User menu */}
        <div className="topnav-user">
          <button className="topnav-user-btn" aria-label="User menu" onClick={handleLogout}>
            <span className="topnav-avatar" aria-hidden="true">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
