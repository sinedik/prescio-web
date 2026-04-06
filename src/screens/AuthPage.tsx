'use client'
import { useState, useEffect } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import Logo from '../components/Logo'
import { api } from '../lib/api'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { IconMoon, IconSun } from '../components/icons'
import { useTheme } from '../contexts/ThemeContext'

// ── Back arrow ────────────────────────────────────────────────────────────────
function BackArrow({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] font-mono transition-colors"
      style={{ color: 'rgb(var(--text-muted))' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgb(var(--text-secondary))' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgb(var(--text-muted))' }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M8 1L3 6L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </button>
  )
}

// ── Google SVG ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// ── Twitter/X SVG ─────────────────────────────────────────────────────────────
function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" style={{ color: 'rgb(var(--text-secondary))' }}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({
  label, type, value, onChange, placeholder, minLength, required = true,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  minLength?: number
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono font-bold tracking-widest" style={{ color: 'rgb(var(--text-muted))' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-lg px-3 py-2.5 text-sm font-mono transition-all outline-none"
        style={{
          background: 'rgb(var(--bg-base))',
          border: '1px solid rgb(var(--bg-border))',
          color: 'rgb(var(--text-primary))',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgb(var(--accent) / 0.5)' }}
        onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgb(var(--bg-border))' }}
      />
    </div>
  )
}

// ── Social button ─────────────────────────────────────────────────────────────
function SocialBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-lg text-sm font-mono transition-all duration-150"
      style={{
        background: 'rgb(var(--bg-base))',
        border: '1px solid rgb(var(--bg-border))',
        color: 'rgb(var(--text-secondary))',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = 'rgb(var(--accent) / 0.3)'
        el.style.color = 'rgb(var(--text-primary))'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = 'rgb(var(--bg-border))'
        el.style.color = 'rgb(var(--text-secondary))'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  usePageTitle('Sign In')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signIn, signUp, signInWithGoogle, signInWithTwitter } = useAuthContext()
  const { lang, setLang } = useLang()
  const tr = useT(lang)
  const { theme, setTheme } = useTheme()

  const FEATURES = [
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M4.5 7l1.8 1.8L9.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: tr('auth.f1'),
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2C4.24 2 2 4.24 2 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <path d="M5 7.5l1.5 1.5L9 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: tr('auth.f2'),
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="4" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
          <path d="M5 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="7" cy="7.5" r="1" fill="currentColor"/>
        </svg>
      ),
      text: tr('auth.f3'),
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 10l3-3 2 2 3-4 2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: tr('auth.f4'),
    },
  ]

  const initialMode = searchParams?.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [formKey, setFormKey] = useState(0)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [mounted, setMounted] = useState(false)
  const [analysesCount, setAnalysesCount] = useState<number | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    api.getAccuracy()
      .then(data => { if (data.total > 0) setAnalysesCount(data.total) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user) router.replace('/markets')
  }, [user, router])

  function handleModeChange(m: 'signin' | 'signup') {
    if (m === mode) return
    setError(null); setEmail(''); setPassword(''); setConfirm('')
    setMode(m); setFormKey((k) => k + 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match'); return
    }
    setError(null); setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        router.replace('/markets')
      } else {
        await signUp(email, password)
        router.replace('/onboarding')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setLoading(false)
    }
  }

  async function handleGoogle() {
    try { await signInWithGoogle() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Google auth failed') }
  }

  async function handleTwitter() {
    try { await signInWithTwitter() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Twitter auth failed') }
  }

  const panelStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'none' : `translateX(${side === 'left' ? '-16px' : '16px'})`,
    transition: 'opacity 350ms ease, transform 350ms ease',
  })

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'rgb(var(--bg-base))' }}>

      {/* ── LEFT PANEL — branding ─────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col w-1/2 relative overflow-hidden"
        style={{
          ...panelStyle('left'),
          background: 'rgb(var(--bg-surface))',
          borderRight: '1px solid transparent',
          padding: '40px 48px',
        }}
      >
        {/* Back */}
        <div className="mb-10">
          <BackArrow onClick={() => router.push('/')} label={tr('auth.back')} />
        </div>

        {/* Logo + tagline */}
        <div className="mb-2">
          <Logo size={32} textSize={20} />
        </div>
        <p className="font-mono text-xs tracking-wider mb-8" style={{ color: 'rgb(var(--text-muted))' }}>
          {tr('auth.subtitle')}
        </p>

        {/* Headline */}
        <h1
          className="font-mono font-bold leading-tight mb-3"
          style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', color: 'rgb(var(--text-primary))' }}
        >
          {tr('auth.headline1')}<br />
          <span style={{ color: 'rgb(var(--accent))' }}>{tr('auth.headline2')}</span>
        </h1>
        <p className="text-sm mb-10" style={{ color: 'rgb(var(--text-secondary))', lineHeight: 1.7 }}>
          {tr('auth.desc')}
        </p>

        {/* Feature bullets */}
        <div className="flex flex-col gap-3 mb-auto">
          {FEATURES.map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div
                className="shrink-0 flex items-center justify-center rounded-md mt-0.5"
                style={{
                  width: '26px', height: '26px',
                  background: 'rgb(var(--accent) / 0.1)',
                  border: '1px solid rgb(var(--accent) / 0.2)',
                  color: 'rgb(var(--accent))',
                }}
              >
                {icon}
              </div>
              <span className="text-xs font-mono leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Stats strip */}
        <div
          className="mt-10 pt-5 grid grid-cols-3 text-center"
          style={{ borderTop: '1px solid rgb(var(--bg-border))' }}
        >
          {[
            { value: '4', label: tr('auth.stat_assets') },
            { value: String(analysesCount ?? '—'), label: tr('auth.stat_analyses') },
            { value: '$500M+', label: tr('auth.stat_volume') },
          ].map(({ value, label }, i) => (
            <div key={label} className="relative">
              {i > 0 && (
                <div
                  className="absolute left-0 top-1 bottom-1 w-px"
                  style={{ background: 'rgb(var(--bg-border))' }}
                />
              )}
              <p className="font-mono font-bold text-sm" style={{ color: 'rgb(var(--accent))' }}>{value}</p>
              <p className="font-mono text-[9px] mt-0.5 uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accent divider */}
      <div
        className="hidden lg:block absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: 'calc(50% - 0.5px)',
          width: '1px',
          zIndex: 10,
          background: 'linear-gradient(to bottom, transparent 0%, rgb(var(--accent) / 0.27) 20%, rgb(var(--accent)) 50%, rgb(var(--accent) / 0.27) 80%, transparent 100%)',
          boxShadow: '0 0 15px 3px rgb(var(--accent) / 0.2), 0 0 30px 8px rgb(var(--accent) / 0.07)',
        }}
      />

      {/* ── RIGHT PANEL — form ────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative"
        style={panelStyle('right')}
      >
        {/* Theme + Language toggles */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
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
            className="flex items-center rounded-md p-0.5 gap-0.5"
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
        </div>
        {/* Mobile: back + logo */}
        <div className="lg:hidden absolute top-5 left-5">
          <BackArrow onClick={() => router.push('/')} label={tr('auth.back')} />
        </div>
        <div className="lg:hidden mb-8">
          <Logo size={28} textSize={18} />
        </div>

        <div className="w-full max-w-[360px]">

          {/* Small label */}
          <p
            className="font-mono text-[10px] font-bold tracking-widest mb-4"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            {mode === 'signin' ? tr('auth.welcome_back') : tr('auth.create_account')}
          </p>

          {/* Mode tabs */}
          <div
            className="flex rounded-lg p-1 mb-7 gap-1"
            style={{
              background: 'rgb(var(--bg-elevated))',
              border: '1px solid rgb(var(--bg-border))',
            }}
          >
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className="flex-1 py-2 text-xs font-mono font-bold rounded-md transition-all duration-200"
                style={
                  mode === m
                    ? {
                        background: 'rgb(var(--bg-surface))',
                        color: 'rgb(var(--text-primary))',
                        boxShadow: '0 1px 3px rgb(0 0 0 / 0.18)',
                      }
                    : {
                        background: 'transparent',
                        color: 'rgb(var(--text-muted))',
                      }
                }
              >
                {m === 'signin' ? tr('auth.sign_in_tab') : tr('auth.sign_up_tab')}
              </button>
            ))}
          </div>

          {/* Form */}
          <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label={tr('auth.email_label')}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono font-bold tracking-widest" style={{ color: 'rgb(var(--text-muted))' }}>
                  {tr('auth.password_label')}
                </label>
                {mode === 'signin' && (
                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-mono transition-colors"
                    style={{ color: 'rgb(var(--text-muted))' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgb(var(--text-secondary))' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgb(var(--text-muted))' }}
                  >
                    {tr('auth.forgot_password')}
                  </Link>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg px-3 py-2.5 text-sm font-mono transition-all outline-none"
                style={{
                  background: 'rgb(var(--bg-base))',
                  border: '1px solid rgb(var(--bg-border))',
                  color: 'rgb(var(--text-primary))',
                }}
                onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgb(var(--accent) / 0.5)' }}
                onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgb(var(--bg-border))' }}
              />
            </div>

            {mode === 'signup' && (
              <Field
                label={tr('auth.confirm_password')}
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="••••••••"
                minLength={6}
              />
            )}

            {error && (
              <div
                className="text-xs font-mono px-3 py-2 rounded-lg"
                style={{
                  color: 'rgb(var(--danger))',
                  background: 'rgb(var(--danger) / 0.06)',
                  border: '1px solid rgb(var(--danger) / 0.2)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-mono font-bold rounded-lg transition-all duration-150 active:scale-[0.98]"
              style={{
                background: 'rgb(var(--accent))',
                color: 'rgb(var(--bg-base))',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgb(var(--accent-hover))' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgb(var(--accent))' }}
            >
              {loading ? tr('auth.btn_loading') : mode === 'signin' ? tr('auth.btn_sign_in') : tr('auth.btn_create')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgb(var(--bg-border))' }} />
            <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{tr('auth.or')}</span>
            <div className="flex-1 h-px" style={{ background: 'rgb(var(--bg-border))' }} />
          </div>

          {/* Social */}
          <div className="flex flex-col gap-2.5">
            <SocialBtn icon={<GoogleIcon />} label={tr('auth.google')} onClick={handleGoogle} />
            <SocialBtn icon={<XIcon />} label={tr('auth.twitter')} onClick={handleTwitter} />
          </div>

          {/* Switch mode link */}
          <p className="mt-6 text-center text-[11px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
            {mode === 'signin' ? (
              <>{tr('auth.no_account')}{' '}
                <button
                  onClick={() => handleModeChange('signup')}
                  className="font-bold transition-colors"
                  style={{ color: 'rgb(var(--accent))' }}
                >
                  {tr('auth.sign_up_link')}
                </button>
              </>
            ) : (
              <>{tr('auth.has_account')}{' '}
                <button
                  onClick={() => handleModeChange('signin')}
                  className="font-bold transition-colors"
                  style={{ color: 'rgb(var(--accent))' }}
                >
                  {tr('auth.sign_in_link')}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
