import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { getHealth } from '../api'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'
import AppFooter from './AppFooter'
import { IconMoon, IconSun } from './icons'

interface Alert {
  id: string
  message: string
  type?: string
  created_at: string
  read?: boolean
}

function BellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

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
  { to: '/dashboard', label: 'DASHBOARD' },
  { to: '/portfolio', label: 'PORTFOLIO' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [scanStatus, setScanStatus] = useState<ScanStatus>('connecting')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [seenCount, setSeenCount] = useState(0)
  const alertsRef = useRef<HTMLDivElement>(null)
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

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts() as Alert[] | { alerts: Alert[] }
      const list = Array.isArray(data) ? data : (data as { alerts: Alert[] }).alerts ?? []
      setAlerts(list)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  useEffect(() => {
    if (!alertsOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [alertsOpen])

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

            {/* Alerts bell */}
            <div ref={alertsRef} className="relative">
              <button
                onClick={() => {
                  setAlertsOpen(o => !o)
                  setSeenCount(alerts.length)
                }}
                title="Alerts"
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors relative"
                style={{ color: 'rgb(var(--text-muted))' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgb(var(--text-secondary))' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgb(var(--text-muted))' }}
              >
                <BellIcon size={15} />
                {alerts.length > seenCount && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-mono font-bold"
                    style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }}
                  >
                    {Math.min(alerts.length - seenCount, 9)}
                  </span>
                )}
              </button>

              {alertsOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 rounded-lg overflow-hidden z-50"
                  style={{
                    background: 'rgb(var(--bg-surface))',
                    border: '1px solid rgb(var(--bg-border))',
                    boxShadow: '0 8px 24px rgb(0 0 0 / 0.25)',
                  }}
                >
                  <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--bg-border))' }}>
                    <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: 'rgb(var(--text-muted))' }}>ALERTS</span>
                    {alerts.length > 0 && (
                      <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{alerts.length} total</span>
                    )}
                  </div>

                  {alerts.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>No alerts yet</p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {alerts.slice(0, 20).map((alert) => {
                        const mins = Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000)
                        const timeLabel = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`
                        return (
                          <div
                            key={alert.id}
                            className="px-3 py-2.5 border-b last:border-0"
                            style={{ borderColor: 'rgb(var(--bg-border))' }}
                          >
                            <p className="text-xs font-mono leading-snug" style={{ color: 'rgb(var(--text-secondary))' }}>
                              {alert.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {alert.type && (
                                <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgb(var(--bg-elevated))', color: 'rgb(var(--text-muted))' }}>
                                  {alert.type}
                                </span>
                              )}
                              <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{timeLabel}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

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
