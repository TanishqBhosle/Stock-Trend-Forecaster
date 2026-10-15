import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import { ArthNexLogo } from '@/components/ui/ArthNexLogo'
import { useAuth } from '@/hooks/useAuth'
import './Auth.css'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    login(data.email, data.name, 'user')
    setLoading(false)
    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="auth-root">
      <div className="auth-brand-col">
        <div className="auth-brand-inner">
          <ArthNexLogo size="lg" link={true} tagline={true} />
          <blockquote className="auth-brand-quote">
            "The Next Era of Market Intelligence."
          </blockquote>
          <p className="auth-brand-sub">
            Create an account to access the full research and forecasting workspace.
          </p>
        </div>
      </div>
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-title">Create account</h1>
            <DataProvenanceLabel type="demo">Demo — no real authentication</DataProvenanceLabel>
          </div>
          <p className="auth-subtitle">Start exploring market trend analysis.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
            <Input
              id="name"
              label="Full name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              error={errors.password?.message}
              hint="Minimum 8 characters"
              iconRight={
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register('password')}
            />
            <Input
              id="confirmPassword"
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" fullWidth loading={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
