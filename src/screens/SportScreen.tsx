'use client'
import { useState } from 'react'
import { usePolling } from '../hooks/usePolling'
import { sportApi } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import { OddsList } from '../components/feed/OddsList'
import { SourceBadge } from '../components/feed/SourceBadge'
import { PaywallBanner } from '../components/paywall/PaywallBanner'
import DotaScreen from './DotaScreen'
import type { SportEvent, SubscriptionPlan } from '../types/index'

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconFootball() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 6.5 2.5L14 9H10L5.5 4.5A10 10 0 0 1 12 2Z" />
      <path d="M2 12h4l2 5-3.5 3A10 10 0 0 1 2 12Z" />
      <path d="M22 12a10 10 0 0 1-2.5 6.5L16 17l2-5h4Z" />
      <path d="M12 22a10 10 0 0 1-5-1.4L9 17h6l2 3.6A10 10 0 0 1 12 22Z" />
    </svg>
  )
}

function IconBasketball() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93C7 7 8 9.5 8 12s-1 5-3.07 7.07" />
      <path d="M19.07 4.93C17 7 16 9.5 16 12s1 5 3.07 7.07" />
      <path d="M2 12h20" />
    </svg>
  )
}

function IconTennis() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M5.5 5.5C7.5 7.5 8.5 10 8.5 12S7.5 16.5 5.5 18.5" />
      <path d="M18.5 5.5C16.5 7.5 15.5 10 15.5 12s1 4.5 3 6.5" />
    </svg>
  )
}

function IconMMA() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12a6 6 0 0 1 6-6" />
      <path d="M18 12a6 6 0 0 1-6 6" />
      <rect x="2" y="9" width="8" height="7" rx="2" />
      <rect x="14" y="8" width="8" height="7" rx="2" />
      <path d="M10 12.5h4" />
    </svg>
  )
}

function IconGamepad() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="12" rx="4" />
      <path d="M8 11v4M6 13h4" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="14" r="1" fill="currentColor" />
    </svg>
  )
}

function IconCrosshair() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="6" />
      <line x1="12" y1="2" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function IconSword() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M2 2l5.5 5.5" />
      <path d="M17 17l2.5 2.5" />
    </svg>
  )
}

function IconDiamond() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 9l10 13L22 9Z" />
      <path d="M2 9h20" />
    </svg>
  )
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const SPORT_TABS = [
  { value: 'football',   label: 'Football',   icon: <IconFootball />   },
  { value: 'basketball', label: 'Basketball', icon: <IconBasketball /> },
  { value: 'tennis',     label: 'Tennis',     icon: <IconTennis />     },
  { value: 'mma',        label: 'MMA',        icon: <IconMMA />        },
]

const ESPORT_TABS = [
  { value: 'dota2',    label: 'Dota 2',   icon: <IconGamepad />   },
  { value: 'cs2',      label: 'CS2',      icon: <IconCrosshair /> },
  { value: 'lol',      label: 'LoL',      icon: <IconSword />     },
  { value: 'valorant', label: 'Valorant', icon: <IconDiamond />   },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function SportScreen() {
  const { profile } = useAuthContext()
  const plan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const [tab, setTab] = useState('')

  const { data, loading } = usePolling(
    () => sportApi.getEvents({ subcategory: tab || undefined, status: 'scheduled', limit: 30 }),
    120_000,
    tab,
  )

  const events: SportEvent[] = (data as { events?: SportEvent[] } | null)?.events ?? []

  return (
    <div className="flex flex-col">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 border-b border-bg-border bg-bg-base">
        <div className="max-w-5xl mx-auto px-6 py-3 flex flex-col gap-2">
          <h1 className="text-base font-semibold text-text-primary">Sport & Esports</h1>

          {/* Sport tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold text-text-muted tracking-widest uppercase shrink-0 w-12">SPORT</span>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
              <TabBtn value="" active={tab === ''} onClick={() => setTab('')}>All</TabBtn>
              {SPORT_TABS.map(t => (
                <TabBtn key={t.value} value={t.value} active={tab === t.value} onClick={() => setTab(t.value)} icon={t.icon}>
                  {t.label}
                </TabBtn>
              ))}
            </div>
          </div>

          {/* Esports tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold text-text-muted tracking-widest uppercase shrink-0 w-12">ESPORTS</span>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
              {ESPORT_TABS.map(t => (
                <TabBtn key={t.value} value={t.value} active={tab === t.value} onClick={() => setTab(t.value)} icon={t.icon}>
                  {t.label}
                </TabBtn>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {tab === 'dota2' ? (
        <DotaScreen />
      ) : (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-3 px-6 py-5">
          {loading && events.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full rounded-lg animate-pulse h-[100px] bg-bg-elevated" />
            ))
          }
          {!loading && events.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm text-text-muted">No events found</p>
              <p className="text-xs text-text-muted opacity-60 mt-1">
                {tab ? 'Data syncing — check back shortly' : 'Try a specific category'}
              </p>
            </div>
          )}
          {events.map(event => <SportCard key={event.id} event={event} plan={plan} />)}
        </div>
      )}
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({ value: _v, active, onClick, icon, children }: {
  value: string; active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all border ${
        active
          ? 'bg-accent text-bg-base border-accent font-semibold'
          : 'bg-bg-elevated text-text-secondary border-bg-border hover:text-text-primary hover:border-text-muted'
      }`}
    >
      {icon && <span className={active ? 'opacity-90' : 'opacity-50'}>{icon}</span>}
      {children}
    </button>
  )
}

// ─── Sport event card ─────────────────────────────────────────────────────────

function SportCard({ event, plan }: { event: SportEvent; plan: SubscriptionPlan }) {
  const isLive = event.status === 'live'
  const hasScore = event.home_score != null && event.away_score != null

  return (
    <div className={`w-full rounded-lg p-4 bg-bg-surface border-l-[3px] ${
      isLive ? 'border border-accent/40 border-l-accent' : 'border border-bg-border border-l-watch'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SourceBadge source={event.source} />
          {event.league && <span className="text-[10px] text-text-muted">{event.league}</span>}
          {isLive && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent text-bg-base">LIVE</span>
          )}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">
          {new Date(event.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Teams + score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-text-primary font-medium">{event.home_team}</span>
          <span className="text-sm text-text-primary font-medium">{event.away_team}</span>
        </div>
        {hasScore && (
          <div className="flex flex-col items-end gap-1">
            <span className={`text-lg font-bold ${isLive ? 'text-accent' : 'text-text-primary'}`}>{event.home_score}</span>
            <span className={`text-lg font-bold ${isLive ? 'text-accent' : 'text-text-primary'}`}>{event.away_score}</span>
          </div>
        )}
      </div>

      {/* Odds */}
      {(event.sport_odds?.length ?? 0) > 0 && (
        <PaywallBanner requiredPlan="pro" currentPlan={plan} feature="Bookmaker odds and AI value analysis">
          <OddsList odds={event.sport_odds!} plan={plan} />
        </PaywallBanner>
      )}
    </div>
  )
}
