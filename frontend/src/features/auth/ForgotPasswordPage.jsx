import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataProvenanceLabel } from '@/components/ui/Badge'
import './Auth.css'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div className="auth-root auth-root-centered">
      <div className="auth-form-col auth-form-col-full">
        <div className="auth-form-inner">
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={14} /> Back to login
          </Link>

          <div className="auth-form-header">
            <h1 className="auth-title">Reset password</h1>
            <DataProvenanceLabel type="demo">Demo — no real email sent</DataProvenanceLabel>
          </div>

          {!submitted ? (
            <>
              <p className="auth-subtitle">
                Enter your email and we'll send a reset link. (Demo: nothing will be sent.)
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button type="submit" fullWidth loading={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </>
          ) : (
            <div className="auth-success">
              <p className="auth-success-title">Check your inbox</p>
              <p className="auth-subtitle">
                If an account exists for that email, a reset link would have been sent. (Demo — no email was actually sent.)
              </p>
              <Link to="/login">
                <Button variant="secondary" fullWidth>Back to login</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
