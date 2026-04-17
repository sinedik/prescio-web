'use client'
import { useState, useEffect, useRef } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { usePaddle } from '../hooks/usePaddle'
import { activateProAction, getPaddlePortalAction } from '../actions/paddle'
import PaywallModal from '../components/PaywallModal'
import { SearchHistoryScreen } from './SearchHistoryScreen'
import { IconCheck, IconFlame, IconMoon, IconSun, IconMapPin } from '../components/icons'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

const INTEREST_IDS = ['geopolitics', 'elections', 'crypto', 'us-politics', 'policy', 'other'] as const

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
  usePageTitle('Profile')
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const { user, profile, signOut, refreshProfile, updateProfile } = useAuthContext()
  const { theme, setTheme } = useTheme()
  const { openCheckout } = usePaddle(async (transactionId) => {
    try { await activateProAction(transactionId) } catch { /* webhook may have handled it */ }
    await refreshProfile()
  })

  const [activeTab, setActiveTab] = useState<'profile' | 'research'>('profile')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests ?? [])
  const [interestsDirty, setInterestsDirty] = useState(false)
  const [savingInterests, setSavingInterests] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)

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
  const plan = profile.plan ?? (profile.is_pro ? 'pro' : 'free')
  const isPro = plan === 'pro' || plan === 'alpha'
  const isAlpha = plan === 'alpha'
  const analysesToday = profile.analyses_today ?? 0
  const streakDays = profile.streak_days ?? 0
  const totalAnalyses = profile.analyses_total ?? 0

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
    router.replace('/')
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const { url } = await getPaddlePortalAction()
      window.location.href = url
    } catch { setPortalLoading(false) }
  }

  function interestLabel(id: string): string {
    const key = `profile.int.${id.replace('-', '_')}` as Parameters<typeof tr>[0]
    return tr(key)
  }

  function expLabel(exp: string): string {
    const key = `profile.exp.${exp}` as Parameters<typeof tr>[0]
    return tr(key)
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── TABS ── */}
      <div className="flex gap-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-0 border-b" style={{ borderColor: 'rgb(var(--bg-border))' }}>
        {(['profile', 'research'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-[11px] font-mono font-bold tracking-widest transition-colors"
            style={{
              color: activeTab === tab ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))',
              borderBottom: activeTab === tab ? '2px solid rgb(var(--accent))' : '2px solid transparent',
              textTransform: 'uppercase',
            }}
          >
            {tab === 'profile' ? tr('profile.tab_profile') : tr('profile.tab_research')}
          </button>
        ))}
      </div>

      {/* ── RESEARCH TAB ── */}
      {activeTab === 'research' && <SearchHistoryScreen />}

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
      <div className="px-4 sm:px-6 py-6 sm:py-10">

      {/* ── BLOCK 1: HEADER ── */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-2xl font-mono font-bold"
          style={{ background: avatarColor, color: 'rgb(var(--bg-base))' }}
        >
          {initials}
        </div>

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
                {profile.trading_experience ? expLabel(profile.trading_experience) : ''}
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
        <SectionTitle>{tr('profile.plan')}</SectionTitle>
        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgb(var(--bg-surface))',
            border: isAlpha
              ? '1px solid rgb(34 197 94 / 0.2)'
              : isPro
                ? '1px solid rgb(var(--accent) / 0.2)'
                : '1px solid rgb(var(--bg-border))',
            borderLeft: isAlpha
              ? '3px solid rgb(34 197 94)'
              : isPro
                ? '3px solid rgb(var(--accent))'
                : '3px solid rgb(var(--bg-border))',
          }}
        >
          {isAlpha ? (
            /* ─ ALPHA ─ */
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-mono font-bold text-text-primary">ALPHA PLAN</span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgb(34 197 94 / 0.1)', border: '1px solid rgb(34 197 94 / 0.25)', color: 'rgb(34 197 94)' }}>
                  {tr('profile.active')}
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(34 197 94)' }} />
                </span>
              </div>
              <p className="text-xs font-mono text-text-muted mb-4">{tr('profile.all_unlocked')}</p>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-xs font-mono border px-3 py-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{ color: 'rgb(34 197 94)', borderColor: 'rgb(34 197 94 / 0.3)' }}
              >
                {portalLoading ? tr('profile.loading') : tr('profile.manage_sub')}
              </button>
            </div>
          ) : isPro ? (
            /* ─ PRO ─ */
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-mono font-bold text-text-primary">PRO PLAN</span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent">
                  {tr('profile.active')}
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                </span>
              </div>
              <p className="text-xs font-mono text-text-muted mb-4">{tr('profile.unlimited_analyses')}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    setUpgradeLoading(true)
                    try { await openCheckout(user.email, 'alpha') } catch { /* */ } finally { setUpgradeLoading(false) }
                  }}
                  disabled={upgradeLoading}
                  className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-mono font-bold rounded-lg border transition-colors disabled:opacity-50"
                  style={{ color: 'rgb(34 197 94)', borderColor: 'rgb(34 197 94 / 0.3)', background: 'rgb(34 197 94 / 0.05)' }}
                >
                  {upgradeLoading ? tr('profile.loading') : tr('profile.upgrade_alpha_cta')}
                </button>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors w-fit disabled:opacity-50"
                >
                  {portalLoading ? tr('profile.loading') : tr('profile.manage_sub')}
                </button>
              </div>
            </div>
          ) : (
            /* ─ FREE ─ */
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-mono font-bold text-text-primary">FREE PLAN</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-bg-elevated border border-bg-border text-text-muted">{tr('profile.current')}</span>
              </div>
              <div className="flex flex-col gap-1 mb-4">
                {[
                  { ok: true,  key: 'profile.f_analyses' },
                  { ok: true,  key: 'profile.f_sports' },
                  { ok: true,  key: 'profile.f_live' },
                  { ok: false, key: 'profile.f_analyses_unlimited' },
                  { ok: false, key: 'profile.f_priority' },
                ].map(({ ok, key }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${ok ? 'text-accent' : 'text-text-muted/40'}`}>{ok ? '✓' : '✗'}</span>
                    <span className={`text-[11px] font-mono ${ok ? 'text-text-secondary' : 'text-text-muted/50'}`}>
                      {key === 'profile.f_analyses_unlimited' ? tr('profile.unlimited_analyses') : tr(key as Parameters<typeof tr>[0])}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-text-muted">{tr('profile.today_analyses')}</span>
                  <span className="text-[10px] font-mono text-text-muted">{analysesToday} / 3</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-bg-border">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min(100, (analysesToday / 3) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    setUpgradeLoading(true)
                    try { await openCheckout(user.email, 'pro') } catch { /* */ } finally { setUpgradeLoading(false) }
                  }}
                  disabled={upgradeLoading}
                  className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
                    hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {upgradeLoading ? tr('profile.loading') : 'Upgrade to Pro — $14.99/mo'}
                </button>
                <button
                  onClick={async () => {
                    setUpgradeLoading(true)
                    try { await openCheckout(user.email, 'alpha') } catch { /* */ } finally { setUpgradeLoading(false) }
                  }}
                  disabled={upgradeLoading}
                  className="w-full py-2.5 border text-xs font-mono font-bold rounded-lg transition-colors disabled:opacity-50"
                  style={{ color: 'rgb(34 197 94)', borderColor: 'rgb(34 197 94 / 0.3)', background: 'rgb(34 197 94 / 0.05)' }}
                >
                  {upgradeLoading ? tr('profile.loading') : 'Upgrade to Alpha — $39.99/mo'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 3: STATS ── */}
      <div>
        <SectionTitle>{tr('profile.activity')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">{tr('profile.total_analyses')}</p>
            <p className="text-2xl font-mono font-bold text-text-primary">{totalAnalyses}</p>
          </div>
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">{tr('profile.current_streak')}</p>
            <p className="text-2xl font-mono font-bold text-text-primary">
              {streakDays > 0 ? <span className="flex items-center gap-1">{streakDays} <IconFlame size={16} color="var(--watch)" /></span> : '—'}
            </p>
          </div>
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">{tr('profile.top_topic')}</p>
            <p className="text-sm font-mono font-bold text-text-primary capitalize">
              {profile.top_category ? profile.top_category.replace('_', ' ').toLowerCase() : '—'}
            </p>
          </div>
          <div className="rounded-xl p-4 bg-bg-surface border border-bg-border">
            <p className="text-[9px] font-mono text-text-muted tracking-widest mb-1">{tr('profile.member_since')}</p>
            <p className="text-sm font-mono font-bold text-text-primary">{formatMemberSince(profile.created_at)}</p>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 4: INTERESTS ── */}
      <div>
        <SectionTitle>{tr('profile.interests_title')}</SectionTitle>
        <div className="flex flex-wrap gap-2 mb-3">
          {INTEREST_IDS.map((id) => {
            const isActive = selectedInterests.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleInterest(id)}
                className={`py-1.5 px-3 rounded-full border text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-bg-surface border-bg-border text-text-secondary hover:border-text-muted'
                }`}
              >
                {interestLabel(id)}
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
              {savingInterests ? tr('profile.saving') : tr('profile.save')}
            </button>
          )}
          {savedToast && !interestsDirty && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-accent animate-fade-in"><IconCheck size={13} /> {tr('profile.saved')}</span>
          )}
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 5: PREFERENCES ── */}
      <div>
        <SectionTitle>{tr('profile.preferences')}</SectionTitle>
        <div className="flex flex-col gap-5">

          {/* Default platform */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">{tr('profile.default_platform')}</p>
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
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">{tr('profile.theme')}</p>
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
                  {t === 'dark'
                    ? <span className="flex items-center gap-1.5"><IconMoon size={12} /> {tr('profile.dark')}</span>
                    : <span className="flex items-center gap-1.5"><IconSun size={12} /> {tr('profile.light')}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">{tr('profile.lang')}</p>
            <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit">
              {['en', 'ru'].map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLanguage(l)
                    savePreference({ language: l })
                  }}
                  className={`px-4 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                    language === l
                      ? 'text-accent border border-accent/30 bg-accent/5'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution reminder */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">{tr('profile.resolution_reminder')}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-secondary">{tr('profile.remind_before')}</span>
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
                <option value={3}>{tr('profile.days_3')}</option>
                <option value={7}>{tr('profile.days_7')}</option>
                <option value={0}>{tr('profile.days_both')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── BLOCK 6: NOTIFICATIONS ── */}
      <div>
        <SectionTitle>{tr('profile.notifications')}</SectionTitle>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgb(var(--bg-border))' }}
        >
          {/* Edge alerts */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgb(var(--bg-border))' }}>
            <div>
              <p className="text-sm font-mono text-text-primary">{tr('profile.edge_alerts')}</p>
              <p className="text-[10px] font-mono text-text-muted mt-0.5">{tr('profile.edge_alerts_desc')}</p>
              {!isPro && <p className="text-[10px] font-mono mt-0.5 text-accent/40">{tr('profile.pro_only')}</p>}
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
              <p className="text-sm font-mono text-text-primary">{tr('profile.resolution_reminders')}</p>
              <p className="text-[10px] font-mono text-text-muted mt-0.5">{tr('profile.resolution_reminders_desc')}</p>
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
              <p className="text-sm font-mono text-text-primary">{tr('profile.weekly_digest')}</p>
              <p className="text-[10px] font-mono text-text-muted mt-0.5">{tr('profile.weekly_digest_desc')}</p>
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
        <SectionTitle>{tr('profile.account')}</SectionTitle>
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <a href="/privacy" className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors">
              {tr('profile.privacy')}
            </a>
            <a href="/terms" className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors">
              {tr('profile.terms')}
            </a>
          </div>
          {isPro && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors w-fit disabled:opacity-50"
            >
              {portalLoading ? tr('profile.loading') : tr('profile.manage_billing')}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs font-mono text-danger hover:text-danger/80 transition-colors w-fit"
          >
            {tr('profile.sign_out')}
          </button>
        </div>
      </div>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      </div>
      )}
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
