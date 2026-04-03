'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef, useTransition } from 'react'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'
import AppFooter from './AppFooter'
import { IconMoon, IconSun } from './icons'
import { SearchOverlay } from './search/SearchOverlay'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

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

const STATUS_CONFIG: Record<ScanStatus, { dotClass: string; textClass: string; labelKey: 'status.connecting' | 'status.live' | 'status.updating' | 'status.stale' | 'status.offline' }> = {
  connecting: { dotClass: 'bg-text-muted animate-pulse',      textClass: 'text-text-muted',      labelKey: 'status.connecting' },
  live:       { dotClass: 'bg-accent animate-pulse',          textClass: 'text-accent',           labelKey: 'status.live' },
  updating:   { dotClass: 'bg-watch animate-pulse',           textClass: 'text-watch',            labelKey: 'status.updating' },
  stale:      { dotClass: 'bg-text-muted',                    textClass: 'text-text-muted',       labelKey: 'status.stale' },
  offline:    { dotClass: 'bg-danger animate-pulse',          textClass: 'text-danger',           labelKey: 'status.offline' },
}

const NAV_BASES = [
  { to: '/feed',       key: 'nav.feed'    },
  { to: '/markets',    key: 'nav.markets' },
  { to: '/sport',      key: 'nav.sport'   },
  { to: '/cybersport', key: 'nav.esports' },
] as const

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { lang, setLang } = useLang()
  const tr = useT(lang)
  const [scanStatus, setScanStatus] = useState<ScanStatus>('connecting')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [seenCount, setSeenCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const alertsRef = useRef<HTMLDivElement>(null)
  const { user, profile } = useAuthContext()
  const planForSearch = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const [isNavPending, startNavTransition] = useTransition()

  const checkHealth = useCallback(async () => {
    try {
      const data = await api.getHealth()
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

  const [lastSportPath, setLastSportPath] = useState('/sport/football')
  const [lastCybersportPath, setLastCybersportPath] = useState('/cybersport/cs2')

  useEffect(() => {
    setLastSportPath(localStorage.getItem('lastSportPath') ?? '/sport/football')
    setLastCybersportPath(localStorage.getItem('lastCybersportPath') ?? '/cybersport/cs2')
  }, [])

  useEffect(() => {
    const path = pathname ?? ''
    if (path.startsWith('/sport/')) {
      setLastSportPath(path)
      localStorage.setItem('lastSportPath', path)
    } else if (path.startsWith('/cybersport/')) {
      setLastCybersportPath(path)
      localStorage.setItem('lastCybersportPath', path)
    }
  }, [pathname])

  const email = user?.email ?? ''
  const initials = email.slice(0, 2).toUpperCase()
  const plan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const { dotClass, textClass, labelKey } = STATUS_CONFIG[scanStatus]

  const LIVE_ACCENTS: Record<string, string> = {
    '/sport/football':   '232 192 50',
    '/sport/basketball': '230 100 20',
    '/sport/tennis':     '200 230 60',
    '/sport/mma':        '224 32 32',
    '/cybersport/dota2': '192 57 43',
    '/cybersport/cs2':   '230 100 20',
    '/cybersport':       '230 100 20',
    '/sport':            '232 192 50',
  }
  const liveAccentRgb = Object.entries(LIVE_ACCENTS).find(([prefix]) =>
    (pathname ?? '').startsWith(prefix)
  )?.[1] ?? null

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b"
        style={{ position: 'relative',
          height: '52px',
          background: 'rgb(var(--bg-surface))',
          borderColor: 'rgb(var(--bg-border))',
          ...(liveAccentRgb ? { '--accent': liveAccentRgb } as React.CSSProperties : {}),
        }}
      >
        <div className="h-full flex items-center px-5 gap-0">

          {/* Logo */}
          <div className="flex items-center gap-2 mr-6 shrink-0">
            <Logo size={32} textSize={15} />
          </div>

          {/* Nav — centred absolutely so right panel doesn't shift it */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
            {NAV_BASES.map(({ to, key }) => {
              const path = pathname ?? ''
              const isActive = path === to || path.startsWith(`${to}/`)
              const href = to === '/sport' ? lastSportPath : to === '/cybersport' ? lastCybersportPath : to
              const isSectionSwitch = (to === '/sport' && path.startsWith('/cybersport')) || (to === '/cybersport' && path.startsWith('/sport'))
              if (isSectionSwitch) {
                return (
                  <button
                    key={to}
                    onClick={() => startNavTransition(() => router.push(href))}
                    className={`px-3 py-1.5 text-[11px] font-mono tracking-widest rounded-md transition-colors text-text-muted font-medium hover:text-text-secondary`}
                  >
                    {tr(key)}
                  </button>
                )
              }
              return (
                <Link
                  key={to}
                  href={href}
                  className={
                    `px-3 py-1.5 text-[11px] font-mono tracking-widest rounded-md transition-colors ${
                      isActive
                        ? 'text-accent font-bold'
                        : 'text-text-muted font-medium hover:text-text-secondary'
                    }`
                  }
                >
                  {tr(key)}
                </Link>
              )
            })}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-3">

            {/* Live status */}
            <div className="hidden sm:flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
              <span className={`text-[10px] font-mono font-bold tracking-widest ${textClass}`}>{tr(labelKey)}</span>
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

            {/* Language toggle */}
            <div
              className="hidden sm:flex items-center rounded-md p-0.5 gap-0.5"
              style={{
                background: 'rgb(var(--bg-elevated))',
                border: '1px solid rgb(var(--bg-border))',
              }}
            >
              {(['en', 'ru'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-2 h-6 font-mono text-[10px] font-bold rounded transition-all duration-150"
                  style={{
                    background: lang === l ? 'rgb(var(--bg-border))' : 'transparent',
                    color: lang === l ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
                    boxShadow: lang === l ? '0 1px 2px rgb(0 0 0 / 0.15)' : 'none',
                  }}
                >
                  {l.toUpperCase()}
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

            {/* AI Search */}
            <button
              onClick={() => setSearchOpen(true)}
              title="AI Search"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
              style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))', fontSize: '11px', color: 'rgb(var(--text-muted))', fontFamily: 'JetBrains Mono, monospace' }}
            >
              <span>⌕</span>
              <span>Search</span>
              {planForSearch === 'free' && (
                <span style={{ fontSize: '8px', color: 'rgb(var(--accent))', fontWeight: 700 }}>PRO</span>
              )}
            </button>

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
              onClick={() => router.push('/profile')}
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
        {/* Nav transition progress bar */}
        {isNavPending && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: '45%',
              background: `linear-gradient(90deg, transparent, rgb(${liveAccentRgb ?? '232 192 50'}), transparent)`,
              animation: 'nav-progress 1.1s ease infinite',
            }} />
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
        {!pathname.startsWith('/sport') && !pathname.startsWith('/cybersport') && (
          <AppFooter />
        )}
      </main>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} plan={planForSearch} />
    </div>
  )
}
