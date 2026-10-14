import { createContext, useContext, useState, useCallback, useEffect, createElement } from 'react'

const AUTH_KEY = 'stf-demo-session'

/** @typedef {'user'|'scientist'} WorkspaceRole */

/**
 * @typedef {object} DemoUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {WorkspaceRole} role
 * @property {number} createdAt - unix ms
 */

export const AuthContext = createContext(null)

/**
 * Auth provider — wraps the app.
 * This is a DEMO authentication flow, not production-secure.
 * Uses createElement to avoid JSX in a .js file.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const login = useCallback((email, name = '', role = 'user') => {
    const demoUser = {
      id: `demo-${Date.now()}`,
      name: name || email.split('@')[0],
      email,
      role,
      createdAt: Date.now(),
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(demoUser))
    setUser(demoUser)
    return demoUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }, [])

  const updateRole = useCallback((role) => {
    setUser((u) => {
      if (!u) return u
      const updated = { ...u, role }
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Session expiration: 7 days
  // Use a ref-based check to avoid calling setState directly inside the effect body
  useEffect(() => {
    if (!user) return
    const age = Date.now() - user.createdAt
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if (age > sevenDays) {
      // Schedule the state update outside the synchronous effect body
      const timer = setTimeout(() => logout(), 0)
      return () => clearTimeout(timer)
    }
  }, [user, logout])

  return createElement(
    AuthContext.Provider,
    { value: { user, login, logout, updateRole, isAuthenticated: !!user } },
    children
  )
}

/**
 * Hook to access authentication state and actions.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
