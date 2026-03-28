import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import LandingPage from './LandingPage'
import AuthPage from './AuthPage'

type View = 'landing' | 'auth'
type Stage = 'idle' | 'exiting-landing' | 'exiting-auth'

// Exit durations must match CSS animation lengths
const EXIT_LANDING_MS = 280
const EXIT_AUTH_MS = 650

export default function PublicPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, profile, loading } = useAuthContext()

  const targetView: View = pathname === '/auth' ? 'auth' : 'landing'
  const [view, setView] = useState<View>(targetView)
  const [stage, setStage] = useState<Stage>('idle')
  const prevPathname = useRef(pathname)
  const isFirstView = useRef(true)

  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname

    const newView: View = pathname === '/auth' ? 'auth' : 'landing'
    if (newView === view) return

    const isGoingToAuth = newView === 'auth'
    const exitStage: Stage = isGoingToAuth ? 'exiting-landing' : 'exiting-auth'
    const exitDuration = isGoingToAuth ? EXIT_LANDING_MS : EXIT_AUTH_MS

    isFirstView.current = false
    setStage(exitStage)

    const t = setTimeout(() => {
      setView(newView)
      setStage('idle')
    }, exitDuration)

    return () => clearTimeout(t)
  }, [pathname])

  // Redirect logged-in users
  if (!loading && user) {
    return <Navigate to={profile?.onboarding_done ? '/markets' : '/onboarding'} replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
      </div>
    )
  }

  const landingClass =
    stage === 'exiting-landing'
      ? 'public-exit-landing'
      : !isFirstView.current && view === 'landing'
      ? 'public-enter-landing'
      : ''

  return (
    <div className="overflow-hidden">
      {view === 'landing' ? (
        <div className={landingClass}>
          <LandingPage />
        </div>
      ) : (
        <AuthPage exiting={stage === 'exiting-auth'} />
      )}
    </div>
  )
}
