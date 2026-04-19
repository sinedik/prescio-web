'use client'
import { useState, useEffect, useRef, ReactNode } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { usePaddle } from '../hooks/usePaddle'
import { activateProAction, getPaddlePortalAction } from '../actions/paddle'
import PaywallModal from '../components/PaywallModal'
import EditProfileModal from '../components/EditProfileModal'
import DeleteAccountModal from '../components/DeleteAccountModal'
import ChangePasswordModal from '../components/ChangePasswordModal'
import ChangeEmailModal from '../components/ChangeEmailModal'
import LinkedIdentities from '../components/LinkedIdentities'
import TwoFactorSection from '../components/TwoFactorSection'
import { authApi } from '../lib/api'
import { supabase } from '../lib/supabase/client'
import { SearchHistoryScreen } from './SearchHistoryScreen'
import { IconCheck, IconFlame, IconMoon, IconSun, IconMapPin } from '../components/icons'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

const INTEREST_IDS = ['politics', 'sport', 'esports', 'crypto', 'economics', 'science_tech'] as const

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

function getAvatarColor(): string {
  return 'rgb(var(--accent))'
}

function formatMemberSince(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch { return '—' }
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconLock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
      <rect x="3" y="8" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8V5.5a2.5 2.5 0 015 0V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconPencil({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', flexShrink: 0 }}>
      <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[9px] font-mono rounded whitespace-nowrap z-20 pointer-events-none"
          style={{
            background: 'rgb(var(--bg-elevated))',
            color: 'rgb(var(--text-muted))',
            border: '0.5px solid rgb(var(--bg-border))',
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}

// ── Section layout ────────────────────────────────────────────────────────────

function ProfileSection({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="max-w-[640px]">
      <div className="mb-3">
        <span
          className="font-mono tracking-[0.1em]"
          style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}
        >
          {number} / {title}
        </span>
      </div>
      <div
        className="rounded-xl p-5 sm:p-6"
        style={{
          border: '0.5px solid rgb(var(--bg-border))',
          background: 'rgb(var(--bg-surface) / 0.4)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

// ── SubSection ────────────────────────────────────────────────────────────────

function SubSection({
  label,
  children,
  last,
  first,
}: {
  label: string
  children: ReactNode
  last?: boolean
  first?: boolean
}) {
  return (
    <div
      style={{
        paddingTop: first ? undefined : '16px',
        borderTop: first ? undefined : '0.5px solid rgb(var(--bg-border))',
        paddingBottom: last ? undefined : '0',
        marginBottom: last ? undefined : '0',
      }}
    >
      <p
        className="font-mono uppercase tracking-[0.12em] mb-3"
        style={{
          fontSize: '9px',
          color: 'rgb(var(--text-muted))',
          paddingBottom: '8px',
          borderBottom: '0.5px solid rgb(var(--bg-border))',
        }}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

// ── Segmented control ─────────────────────────────────────────────────────────

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: ReactNode }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      className="flex w-fit rounded-md"
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '0.5px solid rgb(var(--bg-border))',
        padding: '2px',
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="transition-colors rounded-[5px]"
            style={{
              padding: '5px 14px',
              fontSize: '10px',
              fontFamily: 'monospace',
              background: isActive ? 'rgb(var(--bg-elevated))' : 'transparent',
              color: isActive ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function SidebarNav({
  items,
  active,
  onSelect,
}: {
  items: { id: string; number: string; label: string; sidebarLabel?: string }[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <nav className="sticky top-24 flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="group flex items-baseline gap-2 px-3 py-2 rounded transition-colors text-left"
            style={{
              background: isActive ? 'rgb(var(--accent) / 0.12)' : 'transparent',
              color: isActive ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))',
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgb(var(--bg-surface))'
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] shrink-0">{item.number}</span>
            <span className="text-[11px] font-mono tracking-wider leading-tight">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ── Mobile horizontal tabs ────────────────────────────────────────────────────

function MobileTabs({
  items,
  active,
  onSelect,
}: {
  items: { id: string; number: string; label: string }[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="lg:hidden -mx-4 sm:-mx-6 mb-6 overflow-x-auto" style={{ borderBottom: '1px solid rgb(var(--bg-border))' }}>
      <div className="flex gap-1 px-4 sm:px-6 min-w-max">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="px-3 py-2.5 text-[10px] font-mono font-bold tracking-[0.1em] transition-colors whitespace-nowrap"
              style={{
                color: isActive ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))',
                borderBottom: isActive ? '2px solid rgb(var(--accent))' : '2px solid transparent',
              }}
            >
              {item.number} · {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  usePageTitle('Profile')
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const { user, profile, loading: authLoading, signOut, refreshProfile, updateProfile } = useAuthContext()
  const { theme, setTheme } = useTheme()
  const { openCheckout } = usePaddle(async (transactionId) => {
    try { await activateProAction(transactionId) } catch { /* webhook may have handled it */ }
    await refreshProfile()
  })

  const [activeTab, setActiveTab] = useState<'profile' | 'research'>('profile')
  const [activeSection, setActiveSection] = useState<string>('sec-profile')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests ?? [])
  const [interestsDirty, setInterestsDirty] = useState(false)
  const [savingInterests, setSavingInterests] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [signingOutOthers, setSigningOutOthers] = useState(false)
  const [othersSignedOut, setOthersSignedOut] = useState(false)

  async function handleSignOutOthers() {
    setSigningOutOthers(true)
    try {
      await supabase.auth.signOut({ scope: 'others' })
      setOthersSignedOut(true)
      setTimeout(() => setOthersSignedOut(false), 4000)
    } finally {
      setSigningOutOthers(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const data = await authApi.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prescio-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const [defaultPlatform, setDefaultPlatform] = useState(profile?.default_platform ?? 'all')
  const [language, setLanguage] = useState(profile?.language ?? 'en')
  const [timezone, setTimezone] = useState(profile?.timezone ?? '')
  const [resolutionDays, setResolutionDays] = useState(profile?.alert_resolution_days ?? 7)
  const [notifEdge, setNotifEdge] = useState(profile?.notif_email_edge ?? false)
  const [notifDigest, setNotifDigest] = useState(profile?.notif_email_digest ?? false)
  const [notifResolution, setNotifResolution] = useState(profile?.notif_resolution_reminder ?? false)

  useEffect(() => {
    if (!savedToast) return
    const t = setTimeout(() => setSavedToast(false), 2500)
    return () => clearTimeout(t)
  }, [savedToast])

  const themeHydratedRef = useRef(false)
  useEffect(() => {
    if (themeHydratedRef.current) return
    const remote = profile?.theme
    if (remote) {
      themeHydratedRef.current = true
      setTheme(remote)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.theme])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth?next=/profile')
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          {tr('profile.loading')}
        </div>
      </div>
    )
  }

  if (!user) return null

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-5">
          <p className="text-sm font-mono font-bold text-danger mb-2">{tr('profile.load_error_title')}</p>
          <p className="text-xs font-mono text-text-muted mb-4">{tr('profile.load_error_desc')}</p>
          <button
            onClick={() => refreshProfile()}
            className="text-xs font-mono text-accent border border-accent/30 px-3 py-1.5 rounded
              hover:bg-accent/5 transition-colors"
          >
            {tr('profile.retry')}
          </button>
        </div>
      </div>
    )
  }

  const email = user.email ?? ''
  const initials = (profile.display_name || email).slice(0, 2).toUpperCase()
  const avatarColor = getAvatarColor()
  const plan = profile.plan ?? (profile.is_pro ? 'pro' : 'free')
  const isPro = plan === 'pro' || plan === 'alpha'
  const isAlpha = plan === 'alpha'
  const subStatus = profile.subscription_status
  const subEndsAt = profile.current_period_end
  const isCanceledPending = subStatus === 'canceled' && subEndsAt && new Date(subEndsAt) > new Date()
  function formatEnds(iso: string) {
    try { return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return iso }
  }
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

  const navItems = [
    { id: 'sec-profile',      number: '01', label: tr('profile.section.profile'),      sidebarLabel: lang === 'ru' ? 'Профиль' : 'Profile' },
    { id: 'sec-subscription', number: '02', label: tr('profile.section.subscription'), sidebarLabel: lang === 'ru' ? 'Подписка' : 'Subscription' },
    { id: 'sec-stats',        number: '03', label: tr('profile.section.stats'),         sidebarLabel: lang === 'ru' ? 'Статистика' : 'Stats' },
    { id: 'sec-settings',     number: '04', label: tr('profile.section.settings'),      sidebarLabel: lang === 'ru' ? 'Настройки' : 'Settings' },
    { id: 'sec-account',      number: '05', label: tr('profile.section.account'),       sidebarLabel: lang === 'ru' ? 'Безопасность' : 'Security' },
  ]

  return (
    <div className="max-w-5xl mx-auto">

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
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">

          {/* ── SIDEBAR NAV ── */}
          <aside className="hidden lg:block">
            <SidebarNav items={navItems} active={activeSection} onSelect={setActiveSection} />
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="flex flex-col gap-8 min-w-0">

            {/* Mobile horizontal tabs */}
            <MobileTabs items={navItems} active={activeSection} onSelect={setActiveSection} />

            {/* ── 01 ПРОФИЛЬ ── */}
            {activeSection === 'sec-profile' && (
            <ProfileSection id="sec-profile" number="01" title={tr('profile.section.profile')}>
              {/* Avatar + info row */}
              <div className="flex items-start gap-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                    style={{ border: '0.5px solid rgb(var(--bg-border))' }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-mono font-bold"
                    style={{ background: avatarColor, color: 'rgb(var(--bg-base))' }}
                  >
                    {initials}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium leading-tight truncate"
                      style={{ fontSize: '16px', color: 'rgb(var(--text-primary))' }}>
                      {profile.display_name || email}
                    </p>
                    <button
                      onClick={() => setShowEdit(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: 'rgb(var(--text-muted))' }}
                      title={tr('profile.edit')}
                    >
                      <IconPencil size={14} />
                    </button>
                  </div>

                  {/* Email */}
                  {profile.display_name && (
                    <p className="font-mono mt-0.5 truncate"
                      style={{ fontSize: '11px', color: 'rgb(var(--text-muted))' }}>
                      {email}
                    </p>
                  )}

                  {/* Location · Role */}
                  {(profile.country || profile.trading_experience) && (
                    <p className="font-mono mt-0.5"
                      style={{ fontSize: '11px', color: 'rgb(var(--text-muted))' }}>
                      {profile.country && <IconMapPin size={10} />}
                      {' '}
                      {COUNTRY_LABELS[profile.country ?? ''] ?? profile.country ?? ''}
                      {profile.country && profile.trading_experience && ' · '}
                      {profile.trading_experience ? expLabel(profile.trading_experience) : ''}
                    </p>
                  )}

                  {/* Member since */}
                  <p className="font-mono mt-0.5"
                    style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                    {tr('profile.member_since')} {formatMemberSince(profile.created_at)}
                  </p>

                  {/* Edit button inline */}
                  <button
                    onClick={() => setShowEdit(true)}
                    className="mt-2 font-mono transition-colors"
                    style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgb(var(--text-secondary))')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgb(var(--text-muted))')}
                  >
                    {tr('profile.edit')}
                  </button>
                </div>
              </div>

              {/* Interests — directly below, no divider */}
              <div className="mt-5 flex flex-wrap gap-2">
                {INTEREST_IDS.map((id) => {
                  const isActive = selectedInterests.includes(id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggleInterest(id)}
                      className="rounded-full transition-all"
                      style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        padding: '4px 10px',
                        border: isActive
                          ? '0.5px solid rgb(var(--accent))'
                          : '0.5px solid rgb(var(--text-muted) / 0.5)',
                        background: isActive ? 'rgb(var(--accent) / 0.1)' : 'rgb(var(--bg-surface))',
                        color: isActive ? 'rgb(var(--accent))' : 'rgb(var(--text-secondary))',
                      }}
                    >
                      {interestLabel(id)}
                    </button>
                  )
                })}
              </div>

              {/* Save interests */}
              <div className="flex items-center gap-3 h-7 mt-3">
                {interestsDirty && (
                  <button
                    onClick={saveInterests}
                    disabled={savingInterests}
                    className="px-3 py-1.5 font-mono font-bold rounded transition-colors disabled:opacity-50"
                    style={{
                      fontSize: '11px',
                      background: 'rgb(var(--accent))',
                      color: 'rgb(var(--bg-base))',
                    }}
                  >
                    {savingInterests ? tr('profile.saving') : tr('profile.save')}
                  </button>
                )}
                {savedToast && !interestsDirty && (
                  <span className="flex items-center gap-1 font-mono animate-fade-in"
                    style={{ fontSize: '11px', color: 'rgb(var(--accent))' }}>
                    <IconCheck size={13} /> {tr('profile.saved')}
                  </span>
                )}
              </div>
            </ProfileSection>
            )}

            {/* ── 02 ПОДПИСКА ── */}
            {activeSection === 'sec-subscription' && (
            <ProfileSection id="sec-subscription" number="02" title={tr('profile.section.subscription')}>
              <div
                className="rounded-xl p-5"
                style={{
                  background: 'rgb(var(--bg-surface))',
                  border: isAlpha
                    ? '0.5px solid rgb(var(--alpha) / 0.2)'
                    : isPro
                      ? '0.5px solid rgb(var(--accent) / 0.2)'
                      : '0.5px solid rgb(var(--bg-border))',
                  borderLeft: isAlpha
                    ? '3px solid rgb(var(--alpha))'
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
                        style={{ background: 'rgb(var(--alpha) / 0.1)', border: '1px solid rgb(var(--alpha) / 0.25)', color: 'rgb(var(--alpha))' }}>
                        {tr('profile.active')}
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--alpha))' }} />
                      </span>
                    </div>
                    <p className="text-xs font-mono text-text-muted mb-2">{tr('profile.all_unlocked')}</p>
                    {subEndsAt && (
                      <p className="text-[11px] font-mono text-text-muted mb-4">
                        {isCanceledPending
                          ? tr('profile.access_ends').replace('{date}', formatEnds(subEndsAt))
                          : tr('profile.renews_on').replace('{date}', formatEnds(subEndsAt))}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                        className="text-xs font-mono border px-3 py-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                        style={{ color: 'rgb(var(--alpha))', borderColor: 'rgb(var(--alpha) / 0.3)' }}
                      >
                        {portalLoading ? tr('profile.loading') : tr('profile.manage_billing')}
                      </button>
                      {!isCanceledPending && (
                        <button
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                          className="text-xs font-mono text-text-muted hover:text-danger transition-colors"
                        >
                          {tr('profile.cancel_sub')}
                        </button>
                      )}
                    </div>
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
                    <p className="text-xs font-mono text-text-muted mb-2">{tr('profile.unlimited_analyses')}</p>
                    {subEndsAt && (
                      <p className="text-[11px] font-mono text-text-muted mb-4">
                        {isCanceledPending
                          ? tr('profile.access_ends').replace('{date}', formatEnds(subEndsAt))
                          : tr('profile.renews_on').replace('{date}', formatEnds(subEndsAt))}
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={async () => {
                          setUpgradeLoading(true)
                          try { await openCheckout(user.email, 'alpha') } catch { /* */ } finally { setUpgradeLoading(false) }
                        }}
                        disabled={upgradeLoading}
                        className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-mono font-bold rounded-lg border transition-colors disabled:opacity-50"
                        style={{ color: 'rgb(var(--alpha))', borderColor: 'rgb(var(--alpha) / 0.3)', background: 'rgb(var(--alpha) / 0.05)' }}
                      >
                        {upgradeLoading ? tr('profile.loading') : tr('profile.upgrade_alpha_cta')}
                      </button>
                      <div className="flex items-center gap-4 flex-wrap">
                        <button
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                          className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
                        >
                          {portalLoading ? tr('profile.loading') : tr('profile.manage_billing')}
                        </button>
                        {!isCanceledPending && (
                          <button
                            onClick={handleManageSubscription}
                            disabled={portalLoading}
                            className="text-xs font-mono text-text-muted hover:text-danger transition-colors disabled:opacity-50"
                          >
                            {tr('profile.cancel_sub')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─ FREE ─ */
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-mono font-bold text-text-primary">FREE PLAN</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-bg-elevated border border-bg-border text-text-muted">{tr('profile.current')}</span>
                    </div>

                    {/* Feature list */}
                    <div className="flex flex-col gap-1.5 mb-4">
                      {[
                        { ok: true,  key: 'profile.f_analyses' },
                        { ok: true,  key: 'profile.f_sports' },
                        { ok: true,  key: 'profile.f_live' },
                        { ok: false, key: 'profile.f_analyses_unlimited' },
                        { ok: false, key: 'profile.f_priority' },
                      ].map(({ ok, key }) => (
                        <div key={key} className="flex items-center gap-2">
                          {ok ? (
                            <>
                              <span className="text-[11px] font-bold text-accent">✓</span>
                              <span className="text-[11px] font-mono text-text-secondary">
                                {key === 'profile.f_analyses_unlimited' ? tr('profile.unlimited_analyses') : tr(key as Parameters<typeof tr>[0])}
                              </span>
                            </>
                          ) : (
                            <Tooltip text="Доступно в Pro">
                              <div className="flex items-center gap-2 w-full">
                                <span style={{ color: 'rgb(var(--text-muted))' }}>
                                  <IconLock size={12} />
                                </span>
                                <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                                  {key === 'profile.f_analyses_unlimited' ? tr('profile.unlimited_analyses') : tr(key as Parameters<typeof tr>[0])}
                                </span>
                                <span
                                  className="ml-1 px-1.5 py-0.5 rounded-full font-mono font-bold"
                                  style={{
                                    fontSize: '8px',
                                    background: 'rgb(var(--accent) / 0.12)',
                                    color: 'rgb(var(--accent))',
                                  }}
                                >
                                  Pro
                                </span>
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mb-1">
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
                    <p className="font-mono mb-4" style={{ fontSize: '9px', color: 'rgb(var(--text-muted))' }}>
                      Лимит обновится в полночь по UTC
                    </p>

                    {/* Value proposition */}
                    <p className="font-mono text-center mb-3" style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                      Pro: безлимитные анализы · edge alerts · приоритет AI
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={async () => {
                          setUpgradeLoading(true)
                          try { await openCheckout(user.email, 'pro') } catch { /* */ } finally { setUpgradeLoading(false) }
                        }}
                        disabled={upgradeLoading}
                        className="w-full py-2.5 font-mono font-semibold rounded-lg transition-colors disabled:opacity-50"
                        style={{
                          background: 'rgb(var(--accent))',
                          color: 'rgb(var(--bg-base))',
                          fontSize: '14px',
                        }}
                      >
                        {upgradeLoading ? tr('profile.loading') : 'Upgrade to Pro — $14.99/mo'}
                      </button>
                      <button
                        onClick={async () => {
                          setUpgradeLoading(true)
                          try { await openCheckout(user.email, 'alpha') } catch { /* */ } finally { setUpgradeLoading(false) }
                        }}
                        disabled={upgradeLoading}
                        className="w-full py-2.5 font-mono font-bold rounded-lg transition-colors disabled:opacity-50"
                        style={{
                          fontSize: '12px',
                          color: 'rgb(var(--accent))',
                          border: '0.5px solid rgb(var(--accent))',
                          background: 'transparent',
                        }}
                      >
                        {upgradeLoading ? tr('profile.loading') : 'Upgrade to Alpha — $39.99/mo'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ProfileSection>
            )}

            {/* ── 03 СТАТИСТИКА ── */}
            {activeSection === 'sec-stats' && (
            <ProfileSection id="sec-stats" number="03" title={tr('profile.section.stats')}>
              <div className="grid grid-cols-2 gap-3">

                {/* Total analyses */}
                <div className="rounded-lg p-3" style={{ background: 'rgb(var(--bg-elevated))' }}>
                  <p className="font-mono uppercase tracking-[0.1em] mb-1"
                    style={{ fontSize: '8px', color: 'rgb(var(--text-muted))' }}>
                    {tr('profile.total_analyses')}
                  </p>
                  {totalAnalyses > 0 ? (
                    <p className="font-mono font-medium" style={{ fontSize: '22px', color: 'rgb(var(--text-primary))' }}>
                      {totalAnalyses}
                    </p>
                  ) : (
                    <>
                      <p className="font-mono font-medium" style={{ fontSize: '16px', color: 'rgb(var(--text-muted))' }}>0</p>
                      <a href="/markets" className="font-mono mt-1 block" style={{ fontSize: '9px', color: 'rgb(var(--accent))' }}>
                        Начни первый анализ →
                      </a>
                    </>
                  )}
                </div>

                {/* Streak */}
                <div className="rounded-lg p-3" style={{ background: 'rgb(var(--bg-elevated))' }}>
                  <p className="font-mono uppercase tracking-[0.1em] mb-1"
                    style={{ fontSize: '8px', color: 'rgb(var(--text-muted))' }}>
                    СЕРИЯ ДНЕЙ
                  </p>
                  {streakDays > 0 ? (
                    <p className="font-mono font-medium flex items-center gap-1"
                      style={{ fontSize: '22px', color: 'rgb(var(--text-primary))' }}>
                      {streakDays} <IconFlame size={16} color="var(--watch)" />
                    </p>
                  ) : (
                    <>
                      <p className="font-mono font-medium" style={{ fontSize: '16px', color: 'rgb(var(--text-muted))' }}>—</p>
                      <p className="font-mono mt-1" style={{ fontSize: '9px', color: 'rgb(var(--text-muted))' }}>
                        Появится после 1 анализа
                      </p>
                    </>
                  )}
                </div>

                {/* Top topic */}
                <div className="rounded-lg p-3" style={{ background: 'rgb(var(--bg-elevated))' }}>
                  <p className="font-mono uppercase tracking-[0.1em] mb-1"
                    style={{ fontSize: '8px', color: 'rgb(var(--text-muted))' }}>
                    {tr('profile.top_topic')}
                  </p>
                  {profile.top_category ? (
                    <p className="font-mono font-medium capitalize"
                      style={{ fontSize: '20px', color: 'rgb(var(--text-primary))' }}>
                      {profile.top_category.replace('_', ' ').toLowerCase()}
                    </p>
                  ) : (
                    <>
                      <p className="font-mono font-medium" style={{ fontSize: '16px', color: 'rgb(var(--text-muted))' }}>—</p>
                      <p className="font-mono mt-1" style={{ fontSize: '9px', color: 'rgb(var(--text-muted))' }}>
                        Формируется автоматически
                      </p>
                    </>
                  )}
                </div>

                {/* Member since */}
                <div className="rounded-lg p-3" style={{ background: 'rgb(var(--bg-elevated))' }}>
                  <p className="font-mono uppercase tracking-[0.1em] mb-1"
                    style={{ fontSize: '8px', color: 'rgb(var(--text-muted))' }}>
                    ЧЛЕН СООБЩЕСТВА
                  </p>
                  <p className="font-mono font-medium" style={{ fontSize: '13px', color: 'rgb(var(--text-primary))' }}>
                    {formatMemberSince(profile.created_at)}
                  </p>
                  <p className="font-mono mt-1" style={{ fontSize: '9px', color: 'rgb(var(--accent))' }}>
                    Ранний участник ✓
                  </p>
                </div>

              </div>
            </ProfileSection>
            )}

            {/* ── 04 НАСТРОЙКИ ── */}
            {activeSection === 'sec-settings' && (
            <ProfileSection id="sec-settings" number="04" title={tr('profile.section.settings')}>

              {/* ОТОБРАЖЕНИЕ */}
              <SubSection label={tr('profile.settings.display')} first>
                <div className="flex flex-col gap-5">
                  {/* Theme */}
                  <div>
                    <p className="font-mono tracking-wider mb-2"
                      style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                      {tr('profile.theme')}
                    </p>
                    <SegmentedControl
                      value={theme}
                      onChange={(t) => { setTheme(t as 'dark' | 'light'); savePreference({ theme: t as 'dark' | 'light' }) }}
                      options={[
                        { value: 'dark', label: <span className="flex items-center gap-1.5"><IconMoon size={11} /> {tr('profile.dark')}</span> },
                        { value: 'light', label: <span className="flex items-center gap-1.5"><IconSun size={11} /> {tr('profile.light')}</span> },
                      ]}
                    />
                  </div>

                  {/* Language */}
                  <div>
                    <p className="font-mono tracking-wider mb-2"
                      style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                      {tr('profile.lang')}
                    </p>
                    <SegmentedControl
                      value={language}
                      onChange={(l) => { setLanguage(l); savePreference({ language: l }) }}
                      options={[
                        { value: 'en', label: 'EN' },
                        { value: 'ru', label: 'RU' },
                      ]}
                    />
                  </div>

                  {/* Timezone */}
                  <div>
                    <p className="font-mono tracking-wider mb-2"
                      style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                      {tr('profile.timezone')}
                    </p>
                    <select
                      value={timezone}
                      onChange={(e) => {
                        const v = e.target.value
                        setTimezone(v)
                        savePreference({ timezone: v || undefined })
                      }}
                      className="rounded px-2 py-1.5 text-xs font-mono text-text-primary focus:outline-none transition-colors"
                      style={{
                        background: 'rgb(var(--bg-surface))',
                        border: '0.5px solid rgb(var(--bg-border))',
                      }}
                    >
                      <option value="">{tr('profile.tz_auto')} ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                      <option value="UTC">UTC</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="Europe/Moscow">Europe/Moscow</option>
                      <option value="Asia/Almaty">Asia/Almaty</option>
                      <option value="Asia/Dubai">Asia/Dubai</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                      <option value="Asia/Singapore">Asia/Singapore</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Chicago">America/Chicago</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                    </select>
                  </div>
                </div>
              </SubSection>

              {/* ДАННЫЕ */}
              <SubSection label={tr('profile.settings.data')}>
                <div className="flex flex-col gap-5">
                  {/* Default platform */}
                  <div>
                    <p className="font-mono tracking-wider mb-2"
                      style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                      {tr('profile.default_platform')}
                    </p>
                    <SegmentedControl
                      value={defaultPlatform}
                      onChange={(p) => { setDefaultPlatform(p); savePreference({ default_platform: p }) }}
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'polymarket', label: 'Polymarket' },
                        { value: 'kalshi', label: 'Kalshi' },
                      ]}
                    />
                  </div>

                  {/* Resolution reminder */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="font-mono tracking-wider"
                        style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                        {tr('profile.resolution_reminder')}
                      </p>
                      <Tooltip text="Резолюция — закрытие рынка предсказания. Мы напомним тебе заранее.">
                        <span
                          className="flex items-center justify-center w-3.5 h-3.5 rounded-full font-mono cursor-default"
                          style={{
                            fontSize: '9px',
                            color: 'rgb(var(--text-muted))',
                            border: '0.5px solid rgb(var(--text-muted) / 0.5)',
                          }}
                        >
                          ?
                        </span>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-secondary">{tr('profile.remind_before')}</span>
                      <select
                        value={resolutionDays}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setResolutionDays(v)
                          savePreference({ alert_resolution_days: v })
                        }}
                        className="rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none transition-colors"
                        style={{
                          background: 'rgb(var(--bg-surface))',
                          border: '0.5px solid rgb(var(--bg-border))',
                        }}
                      >
                        <option value={3}>{tr('profile.days_3')}</option>
                        <option value={7}>{tr('profile.days_7')}</option>
                        <option value={0}>{tr('profile.days_both')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </SubSection>

              {/* УВЕДОМЛЕНИЯ */}
              <SubSection label={tr('profile.notifications')} last>
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '0.5px solid rgb(var(--bg-border))' }}>

                  {/* Edge alerts — Pro only */}
                  <div className="flex items-center justify-between px-4 py-3.5"
                    style={{ borderBottom: '0.5px solid rgb(var(--bg-border))' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono" style={{ fontSize: '11px', color: 'rgb(var(--text-secondary))' }}>
                          {tr('profile.edge_alerts')}
                        </p>
                        {!isPro && (
                          <span
                            className="px-1.5 py-0.5 rounded-full font-mono font-bold"
                            style={{
                              fontSize: '8px',
                              background: 'rgb(var(--watch) / 0.15)',
                              color: 'rgb(var(--watch))',
                            }}
                          >
                            Только Pro
                          </span>
                        )}
                      </div>
                      <p className="font-mono mt-0.5" style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                        {tr('profile.edge_alerts_desc')}
                      </p>
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
                  <div className="flex items-center justify-between px-4 py-3.5"
                    style={{ borderBottom: '0.5px solid rgb(var(--bg-border))' }}>
                    <div>
                      <p className="font-mono" style={{ fontSize: '11px', color: 'rgb(var(--text-secondary))' }}>
                        {tr('profile.resolution_reminders')}
                      </p>
                      <p className="font-mono mt-0.5" style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                        {tr('profile.resolution_reminders_desc')}
                      </p>
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
                      <p className="font-mono" style={{ fontSize: '11px', color: 'rgb(var(--text-secondary))' }}>
                        {tr('profile.weekly_digest')}
                      </p>
                      <p className="font-mono mt-0.5" style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                        {tr('profile.weekly_digest_desc')}
                      </p>
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
              </SubSection>
            </ProfileSection>
            )}

            {/* ── 05 АККАУНТ И БЕЗОПАСНОСТЬ ── */}
            {activeSection === 'sec-account' && (
            <div id="sec-account" className="max-w-[640px] flex flex-col gap-4">
              {/* Section header */}
              <div>
                <span className="font-mono tracking-[0.1em]"
                  style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                  05 / {tr('profile.section.account')}
                </span>
              </div>

              {/* Main security card */}
              <div className="rounded-xl p-5 sm:p-6"
                style={{
                  border: '0.5px solid rgb(var(--bg-border))',
                  background: 'rgb(var(--bg-surface) / 0.4)',
                }}>

                {/* Subsection 1: ВХОД И ДОСТУП */}
                <SubSection label={tr('profile.account.login')} first>
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: '0.5px solid rgb(var(--bg-border))' }}>
                    <AccountRow
                      label={tr('profile.change_email')}
                      hint={email}
                      onClick={() => setShowEmail(true)}
                    />
                    <AccountRow
                      label={tr('profile.change_password')}
                      onClick={() => setShowPassword(true)}
                    />
                  </div>
                </SubSection>

                {/* Subsection 2: ДВУХФАКТОРНАЯ АУТЕНТИФИКАЦИЯ */}
                <SubSection label="ДВУХФАКТОРНАЯ АУТЕНТИФИКАЦИЯ">
                  <TwoFactorSection />
                </SubSection>

                {/* Subsection 3: ПРИВЯЗАННЫЕ АККАУНТЫ */}
                <SubSection label={tr('profile.linked_accounts')}>
                  <LinkedIdentities />
                </SubSection>

                {/* Subsection 4: ДАННЫЕ И ВЫХОД */}
                <SubSection label={tr('profile.account.data_exit')} last>
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: '0.5px solid rgb(var(--bg-border))' }}>
                    <AccountRow
                      label={tr('profile.export_data')}
                      onClick={handleExport}
                      disabled={exporting}
                      loading={exporting}
                    />
                    <AccountRow
                      label={tr('profile.sign_out_others')}
                      onClick={handleSignOutOthers}
                      disabled={signingOutOthers}
                      loading={signingOutOthers}
                      success={othersSignedOut ? tr('profile.signed_out_others_ok') : undefined}
                    />
                    <AccountRow
                      label={tr('profile.sign_out')}
                      onClick={handleSignOut}
                    />
                  </div>
                </SubSection>
              </div>

              {/* Danger zone — separate card */}
              <div className="rounded-xl overflow-hidden"
                style={{
                  border: '0.5px solid rgb(var(--danger) / 0.4)',
                  background: 'rgb(var(--danger) / 0.03)',
                }}>
                <div className="px-5 pt-4 pb-2">
                  <p className="font-mono uppercase tracking-[0.12em]"
                    style={{ fontSize: '9px', color: 'rgb(var(--danger))' }}>
                    ОПАСНАЯ ЗОНА
                  </p>
                </div>
                {/* TODO: Clicking "Удалить аккаунт" should require user to type their email in a confirmation modal before proceeding */}
                <AccountRow
                  label={tr('profile.delete_account')}
                  hint={tr('profile.delete_account_hint')}
                  onClick={() => setShowDelete(true)}
                  tone="danger"
                />
              </div>
            </div>
            )}

            {/* ── Legal footer ── */}
            <div className="flex gap-4 flex-wrap pt-1 px-1 max-w-[640px]">
              <a href="/privacy" className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors">
                {tr('profile.privacy')}
              </a>
              <span className="text-[11px] font-mono text-text-muted/50">·</span>
              <a href="/terms" className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors">
                {tr('profile.terms')}
              </a>
              <span className="text-[11px] font-mono text-text-muted/50">·</span>
              <a href="/support" className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors">
                {tr('profile.support')}
              </a>
            </div>
          </div>
        </div>

        {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
        {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
        {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
        {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
        {showEmail && <ChangeEmailModal onClose={() => setShowEmail(false)} />}
      </div>
      )}
    </div>
  )
}

// ── Account row ───────────────────────────────────────────────────────────────

function AccountRow({
  label,
  hint,
  onClick,
  disabled = false,
  loading = false,
  success,
  tone = 'default',
}: {
  label: string
  hint?: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  success?: string
  tone?: 'default' | 'warn' | 'danger'
}) {
  const color = tone === 'danger' ? 'rgb(var(--danger))' : 'rgb(var(--text-primary))'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group w-full flex items-center justify-between gap-3 px-4 text-left
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        hover:bg-bg-surface [&:not(:last-child)]:border-b"
      style={{
        padding: '9px 16px',
        borderColor: 'rgb(var(--bg-border))',
      }}
    >
      <div className="min-w-0">
        <p className="font-mono truncate" style={{ fontSize: '11px', color }}>{label}</p>
        {hint && (
          <p className="font-mono mt-0.5 truncate" style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>{hint}</p>
        )}
      </div>
      <span className="font-mono shrink-0" style={{ fontSize: '10px', color: success ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))' }}>
        {loading ? '…' : success ? success : '›'}
      </span>
    </button>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle, disabled = false }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && !enabled}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-accent/30 border border-accent/50' : 'bg-bg-elevated border border-bg-border'}`}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <div
        className={`absolute top-1 w-3 h-3 rounded-full transition-all ${
          enabled ? 'left-[22px] bg-accent' : 'left-1 bg-text-muted'
        }`}
      />
    </button>
  )
}
