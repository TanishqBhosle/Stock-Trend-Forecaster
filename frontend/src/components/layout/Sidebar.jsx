import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, Star, BarChart2,
  FileText, FlaskConical, Activity, Database,
  BookOpen, Settings
} from 'lucide-react'
import { ArthNexLogo } from '@/components/ui/ArthNexLogo'
import './Sidebar.css'

const USER_NAV = [
  { group: 'Workspace', items: [
    { to: '/app/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/stocks',      icon: TrendingUp,      label: 'Stocks' },
    { to: '/app/watchlist',   icon: Star,            label: 'Watchlist' },
    { to: '/app/portfolio',   icon: BarChart2,       label: 'Portfolio' },
  ]},
  { group: 'Analysis', items: [
    { to: '/app/predictions', icon: FileText,  label: 'Predictions' },
    { to: '/app/backtest',    icon: FlaskConical, label: 'Backtesting' },
  ]},
  { group: 'Model & Account', items: [
    { to: '/app/model-card',  icon: BookOpen,  label: 'Model Card' },
    { to: '/app/settings',    icon: Settings,  label: 'Settings' },
  ]},
]

const SCIENTIST_NAV = [
  { group: 'Evaluation', items: [
    { to: '/scientist/performance', icon: Activity,   label: 'Performance' },
    { to: '/scientist/models',      icon: BarChart2,  label: 'Models' },
    { to: '/scientist/experiments', icon: FlaskConical, label: 'Experiments' },
  ]},
  { group: 'Data', items: [
    { to: '/scientist/dataset',    icon: Database,  label: 'Dataset' },
    { to: '/scientist/model-card', icon: BookOpen,  label: 'Model Card' },
  ]},
  { group: 'Account', items: [
    { to: '/app/settings', icon: Settings, label: 'Settings' },
  ]},
]

/**
 * Desktop sidebar navigation.
 * @param {'user'|'scientist'} [props.workspace='user']
 */
export function Sidebar({ workspace = 'user' }) {
  const nav = workspace === 'scientist' ? SCIENTIST_NAV : USER_NAV
  const location = useLocation()

  return (
    <aside className={`sidebar sidebar-${workspace}`} aria-label="Main navigation">
      <div className="sidebar-wordmark">
        <ArthNexLogo size="sm" link={true} />
        {workspace === 'scientist' && (
          <span className="sidebar-workspace-badge">Scientist</span>
        )}
      </div>

      <nav className="sidebar-nav">
        {nav.map((section) => (
          <div key={section.group} className="sidebar-section">
            <span className="sidebar-section-label">{section.group}</span>
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to ||
                location.pathname.startsWith(item.to + '/')
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive: ia }) =>
                    `sidebar-item ${isActive || ia ? 'sidebar-item-active' : ''}`
                  }
                  end={item.to === '/app/dashboard'}
                >
                  {(isActive) && (
                    <motion.span
                      className="sidebar-active-indicator"
                      layoutId={`sidebar-active-${workspace}`}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <Icon size={16} className="sidebar-icon" />
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-role-indicator">
          <span className="sidebar-role-label">Active Role</span>
          <span className="sidebar-role-value">
            {workspace === 'scientist' ? 'Data Scientist' : 'Investor / Analyst'}
          </span>
        </div>
      </div>
    </aside>
  )
}
