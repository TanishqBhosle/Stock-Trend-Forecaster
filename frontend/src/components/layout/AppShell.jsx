import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileDrawer } from './MobileDrawer'
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette'
import { useAuth } from '@/hooks/useAuth'
import './AppShell.css'

/**
 * Shared authenticated application shell.
 * Keeps sidebar and topnav mounted across internal route changes.
 *
 * @param {'user'|'scientist'} [props.workspace='user']
 * @param {string[]} [props.breadcrumbs]
 */
export function AppShell({ workspace = 'user', breadcrumbs }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { open: cmdOpen, openPalette, closePalette } = useCommandPalette()
  const location = useLocation()
  const { user, updateRole } = useAuth()

  // Ensure user.role automatically matches the active workspace
  useEffect(() => {
    if (user && user.role !== workspace) {
      updateRole(workspace)
    }
  }, [user, workspace, updateRole])

  // Generate breadcrumbs from path if not provided
  const crumbs = breadcrumbs ?? generateBreadcrumbs(location.pathname)

  return (
    <div className={`app-shell app-shell-${workspace}`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <Sidebar workspace={workspace} />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        workspace={workspace}
      />

      <CommandPalette open={cmdOpen} onClose={closePalette} />

      <div className="app-shell-content">
        <TopNav
          breadcrumbs={crumbs}
          onOpenSearch={openPalette}
          onOpenDrawer={() => setDrawerOpen(true)}
          workspace={workspace}
        />
        <main id="main-content" className="app-main" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

/**
 * Generate human-readable breadcrumbs from pathname.
 * @param {string} pathname
 * @returns {string[]}
 */
function generateBreadcrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const labels = {
    app: null,
    scientist: 'Scientist',
    dashboard: 'Dashboard',
    stocks: 'Stocks',
    watchlist: 'Watchlist',
    portfolio: 'Portfolio',
    predictions: 'Predictions',
    backtest: 'Backtesting',
    forecast: 'Forecast',
    'model-card': 'Model Card',
    settings: 'Settings',
    performance: 'Performance',
    models: 'Models',
    experiments: 'Experiments',
    dataset: 'Dataset',
  }

  return parts
    .map((p) => {
      if (labels[p] === null) return null
      if (labels[p]) return labels[p]
      // Uppercase tickers / IDs
      return p.toUpperCase()
    })
    .filter(Boolean)
}
