import { useState } from 'react'
import { motion } from 'framer-motion'
import './Tabs.css'

/**
 * Accessible tab component with animated indicator.
 *
 * @param {object} props
 * @param {{ id: string, label: string }[]} props.tabs
 * @param {string} [props.defaultTab] - id of the default active tab
 * @param {Function} [props.onChange] - called with tab id on change
 * @param {React.ReactNode} props.children - TabPanel components
 */
export function Tabs({ tabs, defaultTab, onChange, children }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)

  const handleSelect = (id) => {
    setActive(id)
    onChange?.(id)
  }

  return (
    <div className="tabs">
      <div className="tabs-list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`tabs-trigger ${active === tab.id ? 'tabs-trigger-active' : ''}`}
            onClick={() => handleSelect(tab.id)}
            tabIndex={active === tab.id ? 0 : -1}
            onKeyDown={(e) => {
              const idx = tabs.findIndex(t => t.id === active)
              if (e.key === 'ArrowRight') handleSelect(tabs[(idx + 1) % tabs.length].id)
              if (e.key === 'ArrowLeft')  handleSelect(tabs[(idx - 1 + tabs.length) % tabs.length].id)
            }}
          >
            {tab.label}
            {active === tab.id && (
              <motion.span
                className="tabs-indicator"
                layoutId="tabs-indicator"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {/* Render children, show only active panel */}
        {Array.isArray(children)
          ? children.map((child) => {
              if (!child || child.props?.tabId !== active) return null
              return child
            })
          : children}
      </div>
    </div>
  )
}

/**
 * Individual tab panel.
 * @param {object} props
 * @param {string} props.tabId - must match the tab id
 */
export function TabPanel({ tabId, children }) {
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className="tab-panel"
    >
      {children}
    </div>
  )
}
