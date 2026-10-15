import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, LayoutDashboard, TrendingUp, Star, BarChart2, FileText, FlaskConical, BookOpen, Settings, Activity, Database } from 'lucide-react'
import { ArthNexLogo } from '@/components/ui/ArthNexLogo'
import './MobileDrawer.css'

const USER_ITEMS = [
  { to: '/app/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/stocks',      icon: TrendingUp,      label: 'Stocks' },
  { to: '/app/watchlist',   icon: Star,            label: 'Watchlist' },
  { to: '/app/portfolio',   icon: BarChart2,       label: 'Portfolio' },
  { to: '/app/predictions', icon: FileText,        label: 'Predictions' },
  { to: '/app/backtest',    icon: FlaskConical,    label: 'Backtesting' },
  { to: '/app/model-card',  icon: BookOpen,        label: 'Model Card' },
  { to: '/app/settings',    icon: Settings,        label: 'Settings' },
]

const SCIENTIST_ITEMS = [
  { to: '/scientist/performance', icon: Activity,      label: 'Performance' },
  { to: '/scientist/models',      icon: BarChart2,     label: 'Models' },
  { to: '/scientist/experiments', icon: FlaskConical,  label: 'Experiments' },
  { to: '/scientist/dataset',     icon: Database,      label: 'Dataset' },
  { to: '/scientist/model-card',  icon: BookOpen,      label: 'Model Card' },
  { to: '/app/settings',          icon: Settings,      label: 'Settings' },
]

/**
 * Mobile navigation drawer.
 */
export function MobileDrawer({ open, onClose, workspace = 'user' }) {
  const items = workspace === 'scientist' ? SCIENTIST_ITEMS : USER_ITEMS

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="drawer-root" role="presentation">
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.nav
            className={`drawer drawer-${workspace}`}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Mobile navigation"
          >
            <div className="drawer-header">
              <div onClick={onClose}>
                <ArthNexLogo size="sm" link={true} />
              </div>
              <button className="drawer-close" onClick={onClose} aria-label="Close navigation">
                <X size={18} />
              </button>
            </div>

            <div className="drawer-items">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `drawer-item ${isActive ? 'drawer-item-active' : ''}`
                    }
                    onClick={onClose}
                  >
                    <Icon size={18} className="drawer-icon" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>

            <div className="drawer-footer">
              <span className="drawer-demo-notice">
                {workspace === 'scientist' ? 'Data Scientist Workspace' : 'Investor Workspace'}
              </span>
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  )
}
