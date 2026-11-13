import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import './ThemeToggle.css'

/**
 * Premium animated Theme Toggle button
 * Supports both standalone icon mode and compact labeled pill mode.
 */
export function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'} ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="theme-toggle-icon-wrap">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="sun"
              className="theme-icon sun-icon"
              initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Sun size={16} strokeWidth={2.2} />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              className="theme-icon moon-icon"
              initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Moon size={16} strokeWidth={2.2} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {showLabel && (
        <span className="theme-toggle-label">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  )
}
