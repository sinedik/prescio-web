'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase/client'
import Logo from './Logo'
import TurnstileWidget from './TurnstileWidget'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

interface AuthFormProps {
  initialMode?: 'signin' | 'signup'
  onClose?: () => void
}

function scorePassword(p: string): number {
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return Math.min(score, 4)
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['bg-bg-border', 'bg-danger', 'bg-watch', 'bg-accent/70', 'bg-accent']

export default function AuthForm({ initialMode = 'signin', onClose }: AuthFormProps) {
  const router = useRouter()
  const { signIn, signUp, signInWithGoogle, signInWithTwitter } = useAuthContext()
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [formKey, setFormKey] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [terms, setTerms] = useState(false)
  const [ageOk, setAgeOk] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaBusy, setMfaBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('expired') === '1') setSessionExpired(true)
  }, [])

  const pwdScore = scorePassword(password)
  const pwdTooShort = mode === 'signup' && password.length > 0 && password.length < 8
  const pwdMismatch = mode === 'signup' && confirmPassword.length > 0 && password !== confirmPassword

  function handleModeChange(newMode: 'signin' | 'signup') {
    if (newMode === mode) return
    setError(null)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setDisplayName('')
    setTerms(false)
    setAgeOk(false)
    setMode(newMode)
    setFormKey(k => k + 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'signup') {
      if (password.length < 8) { setError('Password must be at least 8 characters'); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
      if (!ageOk) { setError('You must confirm you are 18 or older'); return }
      if (!terms) { setError('Please accept the Terms and Privacy Policy'); return }
      if (TURNSTILE_SITE_KEY && !captchaToken) { setError('Please complete the captcha'); return }
    }

    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors()
          const totp = factors?.totp?.find((f) => f.status === 'verified')
          if (totp) {
            setMfaFactorId(totp.id)
            setMfaRequired(true)
            setLoading(false)
            return
          }
        }
        const next = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null
        router.replace(next && next.startsWith('/') ? next : '/markets')
      } else {
        const { needsConfirmation } = await signUp(email, password, displayName.trim() || undefined, captchaToken ?? undefined)
        if (needsConfirmation) {
          router.replace(`/auth/check-inbox?email=${encodeURIComponent(email)}`)
        } else {
          router.replace('/onboarding')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      const lower = msg.toLowerCase()
      if (mode === 'signup' && (lower.includes('already') || lower.includes('registered') || lower.includes('exists'))) {
        setError('This email is already registered. Try signing in instead.')
      } else if (lower.includes('invalid login')) {
        setError('Incorrect email or password')
      } else {
        setError(msg)
      }
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

  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaFactorId || mfaCode.length !== 6) return
    setMfaError(null)
    setMfaBusy(true)
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (chErr || !ch) throw chErr || new Error('challenge failed')
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: ch.id,
        code: mfaCode.trim(),
      })
      if (vErr) throw vErr
      const next = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next')
        : null
      router.replace(next && next.startsWith('/') ? next : '/markets')
    } catch (err: unknown) {
      setMfaError(err instanceof Error ? err.message : 'Invalid code')
      setMfaBusy(false)
    }
  }

  async function handleMfaCancel() {
    await supabase.auth.signOut()
    setMfaRequired(false)
    setMfaFactorId(null)
    setMfaCode('')
    setMfaError(null)
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return }
    if (TURNSTILE_SITE_KEY && !captchaToken) { setError('Please complete the captcha'); return }
    setError(null)
    setMagicLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/markets`,
        shouldCreateUser: false,
        captchaToken: captchaToken ?? undefined,
      },
    })
    setMagicLoading(false)
    if (error) { setError(error.message); return }
    setMagicSent(true)
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="mb-1">
            <Logo size={20} textSize={12} />
          </div>
          <p className="text-xs font-mono text-text-muted">
            {mode === 'signin' ? 'Welcome back' : 'Start for free — no card required'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary transition-colors p-1 -mt-1 -mr-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {sessionExpired && !mfaRequired && (
        <div className="text-xs font-mono text-watch bg-watch/5 border border-watch/20 rounded px-3 py-2 mb-4">
          Your session has expired. Please sign in again.
        </div>
      )}

      {mfaRequired && (
        <form onSubmit={handleMfaVerify} className="flex flex-col gap-4 auth-form-enter">
          <div>
            <p className="text-sm font-mono font-bold text-text-primary mb-1">Two-factor code</p>
            <p className="text-[11px] font-mono text-text-muted">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          <input
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000"
            className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-lg font-mono tracking-widest text-center text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
          />
          {mfaError && (
            <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
              {mfaError}
            </div>
          )}
          <button
            type="submit"
            disabled={mfaBusy || mfaCode.length !== 6}
            className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded hover:bg-accent/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            {mfaBusy ? 'VERIFYING...' : 'VERIFY →'}
          </button>
          <button
            type="button"
            onClick={handleMfaCancel}
            className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {!mfaRequired && (<>


      {/* Mode toggle */}
      <div className="flex bg-bg-surface border border-bg-border rounded-lg p-1 mb-6">
        {(['signin', 'signup'] as const).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded transition-all duration-200 ${
              mode === m
                ? 'bg-bg-elevated text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {m === 'signin' ? 'SIGN IN' : 'SIGN UP'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-4 auth-form-enter">
        {mode === 'signup' && (
          <div>
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">NAME</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoFocus
              maxLength={40}
              placeholder="Your name"
              className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
                text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50
                transition-colors"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus={mode === 'signin'}
            placeholder="you@example.com"
            className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50
              transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">PASSWORD</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={mode === 'signup' ? 8 : 6}
              className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 pr-10 text-sm font-mono
                text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50
                transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              )}
            </button>
          </div>
          {mode === 'signup' && password.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-0.5 flex-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-0.5 flex-1 rounded-full transition-colors ${i <= pwdScore ? STRENGTH_COLORS[pwdScore] : 'bg-bg-border'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-text-muted w-12 text-right">
                {pwdTooShort ? 'Short' : STRENGTH_LABELS[pwdScore]}
              </span>
            </div>
          )}
        </div>

        {mode === 'signup' && (
          <div>
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">CONFIRM PASSWORD</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
                text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50
                transition-colors"
            />
            {pwdMismatch && (
              <p className="text-[10px] font-mono text-danger mt-1">Passwords do not match</p>
            )}
          </div>
        )}

        {mode === 'signup' && (
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ageOk}
                onChange={e => setAgeOk(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-accent shrink-0"
              />
              <span className="text-[11px] font-mono text-text-muted leading-relaxed">
                I confirm I am 18 years or older.
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-accent shrink-0"
              />
              <span className="text-[11px] font-mono text-text-muted leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-text-secondary hover:text-text-primary underline underline-offset-2">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-text-secondary hover:text-text-primary underline underline-offset-2">Privacy Policy</Link>
              </span>
            </label>
          </div>
        )}

        {mode === 'signin' && (
          <div className="text-right -mt-1">
            <Link
              href="/forgot-password"
              className="text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {mode === 'signup' && TURNSTILE_SITE_KEY && (
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            onToken={(t) => setCaptchaToken(t)}
            onExpire={() => setCaptchaToken(null)}
          />
        )}

        {error && (
          <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded
            hover:bg-accent/90 active:scale-[0.98] transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'LOADING...' : mode === 'signin' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-bg-border" />
        <span className="text-[10px] font-mono text-text-muted">or</span>
        <div className="flex-1 h-px bg-bg-border" />
      </div>

      {mode === 'signin' && (
        magicSent ? (
          <div className="text-xs font-mono text-accent bg-accent/5 border border-accent/20 rounded px-3 py-2 mb-3">
            Magic link sent to {email}. Check your inbox.
          </div>
        ) : (
          <>
            {TURNSTILE_SITE_KEY && (
              <div className="mb-3">
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={(t) => setCaptchaToken(t)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicLoading || !email}
              className="w-full mb-3 py-2.5 border border-bg-border rounded text-sm font-mono text-text-secondary
                hover:border-accent/30 hover:text-text-primary transition-all disabled:opacity-50"
            >
              {magicLoading ? 'Sending...' : 'Email me a magic link'}
            </button>
          </>
        )
      )}

      {/* Social auth */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleGoogle}
          className="auth-social-btn flex items-center justify-center gap-2.5 w-full py-2.5
            bg-bg-surface border border-bg-border rounded text-sm font-mono text-text-secondary
            hover:border-accent/30 hover:text-text-primary transition-all duration-200"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={handleTwitter}
          className="auth-social-btn flex items-center justify-center gap-2.5 w-full py-2.5
            bg-bg-surface border border-bg-border rounded text-sm font-mono text-text-secondary
            hover:border-accent/30 hover:text-text-primary transition-all duration-200"
        >
          <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Continue with Twitter / X
        </button>
      </div>
      </>)}
    </div>
  )
}
