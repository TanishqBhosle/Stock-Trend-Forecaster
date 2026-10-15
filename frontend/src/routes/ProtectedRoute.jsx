import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ArthNexLogo } from '@/components/ui/ArthNexLogo'
import { useAuth } from '@/hooks/useAuth'

/**
 * Redirect unauthenticated users to /login.
 * Restricts access based on account role.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'user'|'scientist'} [props.requiredRole]
 */
export function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Strict role check: User cannot see data scientist panel without scientist credentials
  if (requiredRole && user?.role !== requiredRole) {
    const isTryingScientist = requiredRole === 'scientist'

    const handleSwitchAccount = () => {
      logout()
      navigate('/login', { state: { initialRole: requiredRole } })
    }

    const handleGoBack = () => {
      if (user?.role === 'scientist') {
        navigate('/scientist/performance', { replace: true })
      } else {
        navigate('/app/dashboard', { replace: true })
      }
    }

    return (
      <div className="auth-root auth-root-centered" style={{ minHeight: '100vh', padding: 'var(--space-6)' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <ArthNexLogo size="md" link={false} />
          </div>
          <div style={{ display: 'inline-flex', padding: 'var(--space-3)', background: 'rgba(181, 72, 58, 0.1)', color: 'var(--bearish)', borderRadius: '50%', marginBottom: 'var(--space-3)' }}>
            <ShieldAlert size={28} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            {isTryingScientist ? 'Data Scientist Credentials Required' : 'Investor Credentials Required'}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-4)' }}>
            {isTryingScientist
              ? `You are currently signed in as an Investor / Analyst (${user?.email}). The Data Scientist panel contains research-grade diagnostics and requires separate Data Scientist credentials. To access this workspace, please log out and sign in with a Data Scientist account.`
              : `You are currently signed in as a Data Scientist (${user?.email}). The Investor workspace requires separate Investor credentials. To access this workspace, please log out and sign in with an Investor account.`}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Button
              variant="primary"
              fullWidth
              iconLeft={<LogOut size={16} />}
              onClick={handleSwitchAccount}
            >
              Log Out &amp; Sign In as {isTryingScientist ? 'Data Scientist' : 'Investor'}
            </Button>
            <Button
              variant="outline"
              fullWidth
              iconLeft={<ArrowLeft size={16} />}
              onClick={handleGoBack}
            >
              Return to {user?.role === 'scientist' ? 'Scientist Panel' : 'Investor Dashboard'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return children
}

/**
 * Redirect authenticated users away from auth pages.
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated) {
    const dest = user?.role === 'scientist' ? '/scientist/performance' : '/app/dashboard'
    return <Navigate to={dest} replace />
  }

  return children
}
