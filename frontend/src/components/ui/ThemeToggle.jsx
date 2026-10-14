import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { IconButton } from './Button'
import './ThemeToggle.css'

/**
 * Theme toggle button — switches between light and dark mode.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <IconButton
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className="theme-toggle"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  )
}
