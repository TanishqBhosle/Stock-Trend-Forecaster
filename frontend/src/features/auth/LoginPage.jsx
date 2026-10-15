import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LayoutDashboard, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { ArthNexLogo } from '@/components/ui/ArthNexLogo'
import { useAuth } from '@/hooks/useAuth'
import './Auth.css'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const initialRole = location.state?.initialRole ||
    (location.state?.from?.pathname?.startsWith('/scientist') ? 'scientist' : 'user')
  const [accountRole, setAccountRole] = useState(initialRole)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    login(data.email, '', accountRole)
    setLoading(false)
    const destination = accountRole === 'scientist'
      ? (location.state?.from?.pathname?.startsWith('/scientist') ? location.state.from.pathname : '/scientist/performance')
      : (location.state?.from?.pathname?.startsWith('/app') ? location.state.from.pathname : '/app/dashboard')
    navigate(destination, { replace: true })
  }

  return (
    <div className="auth-root">
      <div className="auth-brand-col">
        <div className="auth-brand-inner">
          <ArthNexLogo size="lg" link={true} tagline={true} />
          <blockquote className="auth-brand-quote">
            "Examine the evidence before drawing conclusions."
          </blockquote>
          <p className="auth-brand-sub">
            The Next Era of Market Intelligence — LSTM forecasting and deep trend analytics.
          </p>
        </div>
      </div>
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-title">Sign in</h1>
            <DataProvenanceLabel type="demo">Demo — no real authentication</DataProvenanceLabel>
          </div>
          <p className="auth-subtitle">
            {accountRole === 'scientist'
              ? 'Enter Data Scientist credentials for model diagnostics and technical research.'
              : 'Enter Investor / Analyst credentials for market forecasting and analysis.'}
          </p>

          {/* Account Role Selector */}
          <div className="auth-role-tabs" role="tablist" aria-label="Select Account Role">
            <button
              type="button"
              className={`auth-role-tab ${accountRole === 'user' ? 'auth-role-tab--active' : ''}`}
              onClick={() => setAccountRole('user')}
              role="tab"
              aria-selected={accountRole === 'user'}
            >
              <LayoutDashboard size={14} />
              <span>Investor / Analyst</span>
            </button>
            <button
              type="button"
              className={`auth-role-tab ${accountRole === 'scientist' ? 'auth-role-tab--active' : ''}`}
              onClick={() => setAccountRole('scientist')}
              role="tab"
              aria-selected={accountRole === 'scientist'}
            >
              <FlaskConical size={14} />
              <span>Data Scientist</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder={accountRole === 'scientist' ? 'scientist@arthnex.internal' : 'you@example.com'}
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="auth-password-field">
              <Input
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
                error={errors.password?.message}
                iconRight={
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                {...register('password')}
              />
            </div>
            <div className="auth-form-row">
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>
            <Button type="submit" fullWidth loading={loading}>
              {loading ? 'Signing in…' : `Sign in as ${accountRole === 'scientist' ? 'Data Scientist' : 'Investor'}`}
            </Button>
          </form>

          <p className="auth-switch">
            No account?{' '}
            <Link to="/signup" state={{ initialRole: accountRole }} className="auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
