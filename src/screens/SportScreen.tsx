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

const TABS = [
  { value: '',           label: 'All'        },
  { value: 'football',   label: 'Football'   },
  { value: 'tennis',     label: 'Tennis'     },
  { value: 'basketball', label: 'Basketball' },
  { value: 'mma',        label: 'MMA'        },
  { value: 'dota2',      label: 'Dota 2'     },
  { value: 'cs2',        label: 'CS2'        },
  { value: 'lol',        label: 'LoL'        },
]

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
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-bg-border bg-bg-base">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <h1 className="text-base font-semibold text-text-primary mb-3">Sport & Esports</h1>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                  tab === t.value
                    ? 'bg-accent text-bg-base border-accent font-semibold'
                    : 'bg-bg-elevated text-text-secondary border-bg-border hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dota 2 tab — full Dota screen */}
      {tab === 'dota2' ? (
        <DotaScreen />
      ) : (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-3 px-6 py-5">
          {loading && events.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg animate-pulse h-[100px] bg-bg-elevated" />
            ))
          }
          {!loading && events.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm text-text-muted">No events found</p>
              <p className="text-xs text-text-muted opacity-60 mt-1">Try a different category or check back later</p>
            </div>
          )}
          {events.map(event => <SportCard key={event.id} event={event} plan={plan} />)}
        </div>
      )}
    </div>
  )
}

function SportCard({ event, plan }: { event: SportEvent; plan: SubscriptionPlan }) {
  const isLive = event.status === 'live'
  const hasScore = event.home_score != null && event.away_score != null

  return (
    <div className={`rounded-lg p-4 bg-bg-surface border-l-[3px] ${
      isLive ? 'border border-accent/40 border-l-accent' : 'border border-bg-border border-l-watch'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SourceBadge source={event.source} />
          {event.league && <span className="text-[10px] text-text-muted">{event.league}</span>}
          {isLive && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent text-bg-base">
              LIVE
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-muted">
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
