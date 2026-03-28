import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getPaddlePortal, activatePro } from '../api'
import { usePaddle } from '../hooks/usePaddle'
import PaywallModal from '../components/PaywallModal'
import { IconCheck, IconFlame, IconMoon, IconSun, IconMapPin } from '../components/icons'

const INTERESTS = [
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'elections', label: 'Elections' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'us-politics', label: 'US Politics' },
  { id: 'policy', label: 'Policy' },
  { id: 'other', label: 'Other' },
]

const COUNTRY_LABELS: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  RU: 'Russia',
  KZ: 'Kazakhstan',
  UA: 'Ukraine',
  CA: 'Canada',
  AU: 'Australia',
  OTHER: 'Other',
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner trader',
  experienced: 'Experienced trader',
  pro: 'Full-time trader',
}

const AVATAR_HUES = ['#00e676', '#00c853', '#1de9b6', '#64dd17', '#00b0ff']

function getAvatarColor(name: string): string {
  const i = (name.charCodeAt(0) || 0) % AVATAR_HUES.length
  return AVATAR_HUES[i]
}

function formatMemberSince(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch { return '—' }
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-mono uppercase tracking-[0.1em] mb-4" style={{ color: 'rgb(var(--text-muted))' }}>
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t my-6" style={{ borderColor: 'rgb(var(--bg-border))' }} />
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile, updateProfile } = useAuthContext()
  const { theme, setTheme } = useTheme()
  const { openCheckout } = usePaddle(async (transactionId) => {
    try { await activatePro(transactionId) } catch { /* webhook may have handled it */ }
    await refreshProfile()
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests ?? [])
  const [interestsDirty, setInterestsDirty] = useState(false)
  const [savingInterests, setSavingInterests] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)

  // Preferences state (mirrors profile)
  const [defaultPlatform, setDefaultPlatform] = useState(profile?.default_platform ?? 'all')
  const [language, setLanguage] = useState(profile?.language ?? 'en')
  const [resolutionDays, setResolutionDays] = useState(profile?.alert_resolution_days ?? 7)
  const [notifEdge, setNotifEdge] = useState(profile?.notif_email_edge ?? false)
  const [notifDigest, setNotifDigest] = useState(profile?.notif_email_digest ?? false)
  const [notifResolution, setNotifResolution] = useState(profile?.notif_resolution_reminder ?? false)

  useEffect(() => {
    if (!savedToast) return
    const t = setTimeout(() => setSavedToast(false), 2500)
    return () => clearTimeout(t)
  }, [savedToast])

  if (!user || !profile) return null

  const email = user.email ?? ''
  const displayName = profile.display_name || email.split('@')[0]
  const initials = (profile.display_name || email).slice(0, 2).toUpperCase()
  const avatarColor = getAvatarColor(displayName)
  const isPro = profile.is_pro
  const analysesToday = profile.analyses_today ?? 0
  const streakDays = profile.streak_days ?? 0
  const totalAnalyses = profile.analyses_total ?? 0

  // Debounced preference save
  function savePreference(data: Parameters<typeof updateProfile>[0]) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateProfile(data)
    }, 500)
  }

  function toggleInterest(id: string) {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setInterestsDirty(true)
  }

  async function saveInterests() {
    setSavingInterests(true)
    await updateProfile({ interests: selectedInterests })
    setInterestsDirty(false)
    setSavingInterests(false)
    setSavedToast(true)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const { url } = await getPaddlePortal()
      window.location.href = url
    } catch { setPortalLoading(false) }
  }

  return (
    <div
      className="mx-auto px-6 py-10"
      style={{ maxWidth: '680px' }}
    >

      {/* ── BLOCK 1: HEADER ── */}
      <div className="flex items-start gap-4 mb-8">
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-2xl font-mono font-bold"
          style={{ background: avatarColor, color: 'rgb(var(--bg-base))' }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[20px] font-mono font-bold text-text-primary leading-tight truncate">
            {profile.display_name || email}
          </p>
          {profile.display_name && (
            <p className="text-xs font-mono text-text-muted mt-0.5">{email}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {(profile.country || profile.trading_experience) && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                {profile.country && <IconMapPin size={11} />}
                {COUNTRY_LABELS[profile.country ?? ''] ?? profile.country ?? ''}
                {profile.country && profile.trading_experience && ' · '}
                {EXPERIENCE_LABELS[profile.trading_experience ?? ''] ?? profile.trading_experience ?? ''}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-text-muted mt-1">
            Member since {formatMemberSince(profile.created_at)}
          </p>
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 2: PLAN ── */}
      <div>
        <SectionTitle>PLAN</SectionTitle>
        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgb(var(--bg-surface))',
            border: `1px solid ${isPro ? 'rgb(var(--accent) / 0.2)' : 'rgb(var(--bg-border))'}`,
            borderLeft: isPro ? '3px solid rgb(var(--accent))' : undefined,
          }}
        >
          {isPro ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-mono font-bold text-text-primary">PRO PLAN</span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent">
                  ACTIVE
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                </span>
              </div>
              <p className="text-xs font-mono text-text-muted mb-3">All features unlocked</p>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-xs font-mono text-accent border border-accent/30 px-3 py-1.5 rounded
                  hover:bg-accent/10 transition-colors disabled:opacity-50"
              >
                {portalLoading ? 'LOADING...' : 'Manage subscription →'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-mono font-bold text-text-primary">FREE PLAN</span>
                <span className="text-[11px] font-mono text-text-muted">{analysesToday} / 3 today</span>
              </div>
              <div className="h-1.5 rounded-full mb-4 overflow-hidden bg-bg-border">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${Math.min(100, (analysesToday / 3) * 100)}%` }}
                />
              </div>
              <button
                onClick={async () => {
                  setUpgradeLoading(true)
                  try { await openCheckout(user.email) } catch { /* */ } finally { setUpgradeLoading(false) }
                }}
                disabled={upgradeLoading}
                className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
                  hover:bg-accent/90 transition-colors disabled:opacity-50 mb-4"
              >
                {upgradeLoading ? 'LOADING...' : 'Upgrade to Pro — $14.99/mo'}
              </button>
              <div className="flex flex-col gap-2">
                {[
                  'Edge score on every market',
                  'Full AI analysis & thesis',
                  'Kelly-optimal position sizing',
                  'Resolution arbitrage',
                  'Email alerts when edge ≥ 15%',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3 h-3 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-mono text-text-muted">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 3: STATS ── */}
      <div>
        <SectionTitle>YOUR ACTIVITY</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">TOTAL ANALYSES</p>
            <p className="text-2xl font-mono font-bold text-text-primary">{totalAnalyses}</p>
          </div>
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">CURRENT STREAK</p>
            <p className="text-2xl font-mono font-bold text-text-primary">
              {streakDays > 0 ? <span className="flex items-center gap-1">{streakDays} <IconFlame size={16} color="var(--watch)" /></span> : '—'}
            </p>
          </div>
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">TOP TOPIC</p>
            <p className="text-sm font-mono font-bold text-text-primary capitalize">
              {profile.top_category ? profile.top_category.replace('_', ' ').toLowerCase() : '—'}
            </p>
          </div>
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">MEMBER SINCE</p>
            <p className="text-sm font-mono font-bold text-text-primary">{formatMemberSince(profile.created_at)}</p>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 4: INTERESTS ── */}
      <div>
        <SectionTitle>MARKET INTERESTS</SectionTitle>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {INTERESTS.map((interest) => {
            const isActive = selectedInterests.includes(interest.id)
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-bg-surface border-bg-border text-text-secondary hover:border-text-muted'
                }`}
              >
                {interest.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-3 h-7">
          {interestsDirty && (
            <button
              onClick={saveInterests}
              disabled={savingInterests}
              className="px-3 py-1.5 bg-accent text-bg-base text-[11px] font-mono font-bold rounded
                hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {savingInterests ? 'Saving...' : 'Save'}
            </button>
          )}
          {savedToast && !interestsDirty && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-accent animate-fade-in"><IconCheck size={13} /> Saved</span>
          )}
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 5: PREFERENCES ── */}
      <div>
        <SectionTitle>PREFERENCES</SectionTitle>
        <div className="flex flex-col gap-5">

          {/* Default platform */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">DEFAULT PLATFORM</p>
            <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit">
              {['all', 'polymarket', 'kalshi'].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setDefaultPlatform(p)
                    savePreference({ default_platform: p })
                  }}
                  className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                    defaultPlatform === p
                      ? 'text-accent border border-accent/30 bg-accent/5'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {p === 'all' ? 'All' : p === 'polymarket' ? 'Polymarket' : 'Kalshi'}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">THEME</p>
            <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                    theme === t
                      ? 'text-accent border border-accent/30 bg-accent/5'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t === 'dark' ? <span className="flex items-center gap-1.5"><IconMoon size={12} /> Dark</span> : <span className="flex items-center gap-1.5"><IconSun size={12} /> Light</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">LANGUAGE</p>
            <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit">
              {['en', 'ru'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang)
                    savePreference({ language: lang })
                  }}
                  className={`px-4 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                    language === lang
                      ? 'text-accent border border-accent/30 bg-accent/5'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution reminder */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">RESOLUTION REMINDER</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-secondary">Remind me before resolution</span>
              <select
                value={resolutionDays}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setResolutionDays(v)
                  savePreference({ alert_resolution_days: v })
                }}
                className="bg-bg-surface border border-bg-border rounded px-2 py-1 text-xs font-mono
                  text-text-primary focus:outline-none focus:border-accent/40 transition-colors"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={0}>Both</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 6: NOTIFICATIONS ── */}
      <div>
        <SectionTitle>NOTIFICATIONS</SectionTitle>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgb(var(--bg-border))' }}
        >
          {/* Edge alerts */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgb(var(--bg-border))' }}>
            <div>
              <p className="text-sm font-mono text-text-primary">Edge alerts</p>
              <p className="text-[10px] font-mono text-text-muted mt-0.5">Email when edge ≥ 15% found</p>
              {!isPro && <p className="text-[10px] font-mono mt-0.5 text-accent/40">Pro only</p>}
            </div>
            <Toggle
              enabled={notifEdge && isPro}
              disabled={!isPro}
              onToggle={() => {
                if (!isPro) { setShowPaywall(true); return }
                const next = !notifEdge
                setNotifEdge(next)
                savePreference({ notif_email_edge: next })
              }}
            />
          </div>

          {/* Resolution reminders */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgb(var(--bg-border))' }}>
            <div>
              <p className="text-sm font-mono text-text-primary">Resolution reminders</p>
              <p className="text-[10px] font-mono text-text-muted mt-0.5">Alert N days before market closes</p>
            </div>
            <Toggle
              enabled={notifResolution}
              onToggle={() => {
                const next = !notifResolution
                setNotifResolution(next)
                savePreference({ notif_resolution_reminder: next })
              }}
            />
          </div>

          {/* Weekly digest */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-mono text-text-primary">Weekly digest</p>
              <p className="text-[10px] font-mono text-text-muted mt-0.5">Top opportunities every Monday</p>
            </div>
            <Toggle
              enabled={notifDigest}
              onToggle={() => {
                const next = !notifDigest
                setNotifDigest(next)
                savePreference({ notif_email_digest: next })
              }}
            />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 7: ACCOUNT ── */}
      <div>
        <SectionTitle>ACCOUNT</SectionTitle>
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <a href="/privacy" className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors">
              Terms of Service
            </a>
          </div>
          {isPro && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors w-fit disabled:opacity-50"
            >
              {portalLoading ? 'LOADING...' : 'Manage billing →'}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs font-mono text-danger hover:text-danger/80 transition-colors w-fit"
          >
            Sign out
          </button>
        </div>
      </div>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
    </div>
  )
}

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle, disabled = false }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && !enabled}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-accent/30 border border-accent/50' : 'bg-bg-elevated border border-bg-border'}`}
    >
      <div
        className={`absolute top-1 w-3 h-3 rounded-full transition-all ${
          enabled ? 'left-[22px] bg-accent' : 'left-1 bg-text-muted'
        }`}
      />
    </button>
  )
}
