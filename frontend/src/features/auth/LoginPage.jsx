import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataProvenanceLabel } from '@/components/ui/Badge'
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
  const from = location.state?.from?.pathname ?? '/app/dashboard'

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    login(data.email, '', 'user')
    setLoading(false)
    navigate(from, { replace: true })
  }

  return (
    <div className="auth-root">
      <div className="auth-brand-col">
        <div className="auth-brand-inner">
          <Link to="/" className="auth-wordmark">Stock Trend Forecaster</Link>
          <blockquote className="auth-brand-quote">
            "Examine the evidence before drawing conclusions."
          </blockquote>
          <p className="auth-brand-sub">
            A research tool for S&P 500 LSTM forecasting and trend analysis.
          </p>
        </div>
      </div>
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-title">Sign in</h1>
            <DataProvenanceLabel type="demo">Demo — no real authentication</DataProvenanceLabel>
          </div>
          <p className="auth-subtitle">Access the research platform.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="auth-switch">
            No account?{' '}
            <Link to="/signup" className="auth-link">Create one</Link>
          </p>

          <div className="auth-demo-hint">
            <p>Demo credentials — enter any valid email and a password of 6+ characters.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
