import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import LandingPage from './LandingPage'
import AuthPage from './AuthPage'

type View = 'landing' | 'auth'
type Stage = 'idle' | 'exiting-landing' | 'exiting-auth'

// Exit durations must match CSS animation lengths
const EXIT_LANDING_MS = 280
const EXIT_AUTH_MS = 650

export default function PublicPage() {
  const pathname = usePathname()
  const router = useRouter()
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
  }, [pathname, view])

  useLayoutEffect(() => {
    if (loading || !user || !profile) return
    router.replace(profile.onboarding_done ? '/markets' : '/onboarding')
  }, [loading, user, profile, router])

  if (!loading && user) {
    if (!profile) return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
      </div>
    )
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
      </div>
    )
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
        <div className={stage === 'exiting-auth' ? 'public-exit-auth' : ''}>
          <AuthPage />
        </div>
      )}
    </div>
  )
}
