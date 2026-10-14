import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/**
 * Redirect unauthenticated users to /login.
 * Preserves the intended destination for post-login redirect.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

/**
 * Redirect authenticated users away from auth pages.
 * @param {'user'|'scientist'} [defaultRole='user']
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated) {
    const dest = user?.role === 'scientist' ? '/scientist/performance' : '/app/dashboard'
    return <Navigate to={dest} replace />
  }

  return children
}
