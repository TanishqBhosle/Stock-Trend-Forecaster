import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute'
import { PageSkeleton } from '@/components/ui/LoadingSkeleton'

// ── Eager-loaded (small, critical path) ─────────────────────────────────────
import LandingPage from '@/features/landing/LandingPage'

// ── Lazy-loaded routes ────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('@/features/auth/LoginPage'))
const SignupPage         = lazy(() => import('@/features/auth/SignupPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const OnboardingPage     = lazy(() => import('@/features/auth/OnboardingPage'))

const DashboardPage      = lazy(() => import('@/features/dashboard/DashboardPage'))
const StocksPage         = lazy(() => import('@/features/stocks/StocksPage'))
const StockDetailPage    = lazy(() => import('@/features/stocks/StockDetailPage'))
const ForecastPage       = lazy(() => import('@/features/forecasts/ForecastPage'))
const WatchlistPage      = lazy(() => import('@/features/watchlist/WatchlistPage'))
const PortfolioPage      = lazy(() => import('@/features/portfolio/PortfolioPage'))
const PredictionsPage    = lazy(() => import('@/features/predictions/PredictionsPage'))
const BacktestPage       = lazy(() => import('@/features/backtest/BacktestPage'))
const ModelCardPage      = lazy(() => import('@/features/model-card/ModelCardPage'))
const SettingsPage       = lazy(() => import('@/features/settings/SettingsPage'))

const SciPerfPage        = lazy(() => import('@/features/scientist/PerformancePage'))
const SciModelsPage      = lazy(() => import('@/features/scientist/ModelsPage'))
const SciExperimentsPage = lazy(() => import('@/features/scientist/ExperimentsPage'))
const SciExperimentDetail= lazy(() => import('@/features/scientist/ExperimentDetailPage'))
const SciDatasetPage     = lazy(() => import('@/features/scientist/DatasetPage'))
const SciModelCardPage   = lazy(() => import('@/features/scientist/SciModelCardPage'))

function FallbackPage() {
  return <PageSkeleton />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<FallbackPage />}>
            <Routes>
              {/* ── Public landing ──────────────────────────────────── */}
              <Route path="/" element={<LandingPage />} />

              {/* ── Auth pages (redirect if already logged in) ──────── */}
              <Route path="/login"           element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
              <Route path="/signup"          element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/onboarding"      element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

              {/* ── User workspace ─────────────────────────────────── */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute requiredRole="user">
                    <AppShell workspace="user" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard"         element={<DashboardPage />} />
                <Route path="stocks"            element={<StocksPage />} />
                <Route path="stocks/:ticker"    element={<StockDetailPage />} />
                <Route path="forecast/:ticker"  element={<ForecastPage />} />
                <Route path="watchlist"         element={<WatchlistPage />} />
                <Route path="portfolio"         element={<PortfolioPage />} />
                <Route path="predictions"       element={<PredictionsPage />} />
                <Route path="backtest"          element={<BacktestPage />} />
                <Route path="model-card"        element={<ModelCardPage />} />
                <Route path="settings"          element={<SettingsPage />} />
              </Route>

              {/* ── Data Scientist workspace ───────────────────────── */}
              <Route
                path="/scientist"
                element={
                  <ProtectedRoute requiredRole="scientist">
                    <AppShell workspace="scientist" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/scientist/performance" replace />} />
                <Route path="performance"           element={<SciPerfPage />} />
                <Route path="models"                element={<SciModelsPage />} />
                <Route path="experiments"           element={<SciExperimentsPage />} />
                <Route path="experiments/:id"       element={<SciExperimentDetail />} />
                <Route path="dataset"               element={<SciDatasetPage />} />
                <Route path="model-card"            element={<SciModelCardPage />} />
              </Route>

              {/* ── 404 ────────────────────────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
