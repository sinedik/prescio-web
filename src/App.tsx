import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import FeedPage from './pages/FeedPage'
import MarketDetailPage from './pages/MarketDetailPage'
import PortfolioPage from './pages/PortfolioPage'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage from './pages/ProfilePage'
import ProSuccessPage from './pages/ProSuccessPage'
import WatchlistPage from './pages/WatchlistPage'

function Loader() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
    </div>
  )
}

// Layout wrapper that also enforces onboarding
function ProtectedLayout() {
  const { user, profile, loading } = useAuthContext()

  // Only block with loader on initial cold start (no user resolved yet).
  // Subsequent loading states (TOKEN_REFRESHED, refreshProfile) are silent
  // so we never unmount Layout and cause a visible "reload".
  if (loading && !user) return <Loader />
  if (!user) return <Navigate to="/" replace />
  // New user hasn't done onboarding yet — only redirect when profile is loaded
  if (profile && !profile.onboarding_done) return <Navigate to="/onboarding" replace />
  return <Layout />
}

export default function App() {
  return (
    <ThemeProvider>
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected standalone (no Layout) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pro-success"
        element={
          <ProtectedRoute>
            <ProSuccessPage />
          </ProtectedRoute>
        }
      />

      {/* Protected routes with Layout + onboarding gate */}
      <Route element={<ProtectedLayout />}>
        <Route path="/markets" element={<FeedPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/market/:slug" element={<MarketDetailPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
    </ThemeProvider>
  )
}
