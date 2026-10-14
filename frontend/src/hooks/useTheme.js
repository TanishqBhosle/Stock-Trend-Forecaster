import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'stf-theme'

/**
 * Hook to manage light/dark theme.
 * Persists preference in localStorage and applies class to <html>.
 *
 * @returns {{ theme: 'light'|'dark', toggleTheme: Function, setTheme: Function }}
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    // Default: respect OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((value) => setThemeState(value), [])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggleTheme }
}
