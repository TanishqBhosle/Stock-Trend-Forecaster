import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart2, FlaskConical, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ArthNexLogo } from '@/components/ui/ArthNexLogo'
import { useAuth } from '@/hooks/useAuth'
import './Auth.css'

const ROLES = [
  {
    id: 'user',
    icon: BarChart2,
    title: 'Investor / Analyst',
    description: 'Explore stocks, view forecasts, manage a watchlist, compare portfolios, and run backtests.',
    destination: '/app/dashboard',
  },
  {
    id: 'scientist',
    icon: FlaskConical,
    title: 'Data Scientist',
    description: 'Inspect model performance, compare architectures, review experiments, and explore the dataset.',
    destination: '/scientist/performance',
  },
]

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const { updateRole } = useAuth()
  const navigate = useNavigate()

  const handleContinue = async () => {
    if (!selectedRole) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    const role = ROLES.find(r => r.id === selectedRole)
    updateRole(selectedRole)
    setLoading(false)
    navigate(role.destination, { replace: true })
  }

  return (
    <div className="auth-root auth-root-centered">
      <div className="onboarding-inner">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <ArthNexLogo size="lg" link={false} tagline={true} />
          </div>
          <h1 className="onboarding-title">Select Account Credential Role</h1>
          <p className="onboarding-subtitle">
            Choose your credential type. Accounts are role-restricted: to switch between Investor and Data Scientist panels, you must sign out and authenticate with the corresponding credentials.
          </p>

          <div className="onboarding-roles">
            {ROLES.map((role) => {
              const Icon = role.icon
              return (
                <motion.button
                  key={role.id}
                  className={`role-card ${selectedRole === role.id ? 'role-card-selected' : ''}`}
                  onClick={() => setSelectedRole(role.id)}
                  aria-pressed={selectedRole === role.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="role-card-icon">
                    <Icon size={24} />
                  </div>
                  <div className="role-card-text">
                    <h2 className="role-card-title">{role.title}</h2>
                    <p className="role-card-desc">{role.description}</p>
                  </div>
                  {selectedRole === role.id && (
                    <span className="role-card-check" aria-hidden="true">✓</span>
                  )}
                </motion.button>
              )
            })}
          </div>

          <Button
            fullWidth
            size="lg"
            disabled={!selectedRole}
            loading={loading}
            iconRight={<ArrowRight size={18} />}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
