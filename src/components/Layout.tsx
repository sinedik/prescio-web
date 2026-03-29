import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { getHealth } from '../api'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'
import AppFooter from './AppFooter'
import { IconMoon, IconSun } from './icons'

type ScanStatus = 'connecting' | 'live' | 'updating' | 'stale' | 'offline'

const STATUS_CONFIG: Record<ScanStatus, { dotClass: string; textClass: string; label: string }> = {
  connecting: { dotClass: 'bg-text-muted animate-pulse',      textClass: 'text-text-muted',      label: 'CONNECTING' },
  live:       { dotClass: 'bg-accent animate-pulse',          textClass: 'text-accent',           label: 'LIVE' },
  updating:   { dotClass: 'bg-watch animate-pulse',           textClass: 'text-watch',            label: 'UPDATING' },
  stale:      { dotClass: 'bg-text-muted',                    textClass: 'text-text-muted',       label: 'STALE' },
  offline:    { dotClass: 'bg-danger animate-pulse',          textClass: 'text-danger',           label: 'OFFLINE' },
}

const NAV_LINKS = [
  { to: '/feed',      label: 'FEED' },
  { to: '/markets',   label: 'MARKETS' },
  { to: '/watchlist', label: 'WATCHLIST' },
  { to: '/portfolio', label: 'PORTFOLIO' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [scanStatus, setScanStatus] = useState<ScanStatus>('connecting')
  const { user, profile } = useAuthContext()

  const checkHealth = useCallback(async () => {
    try {
      const data = await getHealth()
      if (!data.lastScannedAt) { setScanStatus('connecting'); return }
      const mins = (Date.now() - new Date(data.lastScannedAt).getTime()) / 60000
      setScanStatus(mins < 30 ? 'live' : mins < 120 ? 'updating' : 'stale')
    } catch {
      setScanStatus('offline')
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const email = user?.email ?? ''
  const initials = email.slice(0, 2).toUpperCase()
  const plan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const { dotClass, textClass, label } = STATUS_CONFIG[scanStatus]

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b"
        style={{
          height: '52px',
          background: 'rgb(var(--bg-surface))',
          borderColor: 'rgb(var(--bg-border))',
        }}
      >
        <div className="h-full flex items-center px-5 gap-0">

          {/* Logo */}
          <div className="flex items-center gap-2 mr-6 shrink-0">
            <Logo size={32} textSize={15} />
          </div>

          {/* Nav — centred absolutely so right panel doesn't shift it */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
            {NAV_LINKS.map(({ to, label: navLabel }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-[11px] font-mono tracking-widest rounded-md transition-colors ${
                    isActive
                      ? 'text-accent font-bold'
                      : 'text-text-muted font-medium hover:text-text-secondary'
                  }`
                }
              >
                {navLabel}
              </NavLink>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-3">

            {/* Live status */}
            <div className="hidden sm:flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
              <span className={`text-[10px] font-mono font-bold tracking-widest ${textClass}`}>{label}</span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-4" style={{ background: 'rgb(var(--bg-border))' }} />

            {/* Theme toggle */}
            <div
              className="flex items-center rounded-md p-0.5 gap-0.5"
              style={{
                background: 'rgb(var(--bg-elevated))',
                border: '1px solid rgb(var(--bg-border))',
              }}
            >
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={t === 'dark' ? 'Dark mode' : 'Light mode'}
                  className="w-6 h-6 flex items-center justify-center rounded text-[13px] transition-all duration-150"
                  style={{
                    background: theme === t ? 'rgb(var(--bg-border))' : 'transparent',
                    boxShadow: theme === t ? '0 1px 2px rgb(0 0 0 / 0.15)' : 'none',
                  }}
                >
                  {t === 'dark' ? <IconMoon size={14} /> : <IconSun size={14} />}
                </button>
              ))}
            </div>

            {/* Plan badge */}
            {plan === 'alpha' && (
              <span className="hidden sm:inline text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  color: 'rgb(var(--accent-green, 34 197 94))',
                  background: 'rgb(var(--accent-green, 34 197 94) / 0.08)',
                  border: '1px solid rgb(var(--accent-green, 34 197 94) / 0.25)',
                }}>
                ALPHA
              </span>
            )}
            {plan === 'pro' && (
              <span className="hidden sm:inline text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  color: 'rgb(var(--accent))',
                  background: 'rgb(var(--accent) / 0.08)',
                  border: '1px solid rgb(var(--accent) / 0.2)',
                }}>
                PRO
              </span>
            )}

            {/* Avatar */}
            <button
              onClick={() => navigate('/profile')}
              title={email}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-150"
              style={{
                background: 'rgb(var(--accent) / 0.1)',
                border: '1px solid rgb(var(--bg-border))',
                color: 'rgb(var(--accent))',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgb(var(--accent) / 0.4)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgb(var(--bg-border))' }}
            >
              {initials || 'U'}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  )
}
