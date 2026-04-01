'use client'
import { useParams, useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { sportApi } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import { OddsList } from '../components/feed/OddsList'
import { PaywallBanner } from '../components/paywall/PaywallBanner'
import type { SportEvent, SubscriptionPlan } from '../types/index'

export default function SportEventPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuthContext()
  const plan: SubscriptionPlan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')

  const { data, loading } = usePolling(
    () => sportApi.getEvent(id),
    60_000,
    id,
  )
  const event = data as SportEvent | null

  const isLive = event?.status === 'live'
  const isFinished = event?.status === 'finished'
  const hasScore = event?.home_score != null && event?.away_score != null

  if (loading && !event) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="h-4 w-24 bg-bg-elevated rounded animate-pulse mb-6" />
        <div className="bg-bg-surface border border-bg-border rounded-xl p-6 animate-pulse space-y-4">
          <div className="h-3 w-20 bg-bg-elevated rounded" />
          <div className="h-6 w-3/4 bg-bg-elevated rounded" />
          <div className="h-6 w-1/2 bg-bg-elevated rounded" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-sm font-mono text-text-muted mb-4">Event not found</p>
        <button
          onClick={() => router.back()}
          className="text-xs font-mono text-accent hover:text-accent/80 transition-colors"
        >
          ← Go back
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors mb-6"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>

      <div className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden">
        {/* Status bar */}
        <div className={`px-5 py-2.5 flex items-center gap-2 border-b border-bg-border ${isLive ? 'bg-accent/5' : ''}`}>
          {isLive && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent text-bg-base">LIVE</span>
          )}
          {isFinished && (
            <span className="text-[9px] font-mono text-text-muted uppercase">Finished</span>
          )}
          {event.league && (
            <span className="text-[10px] font-mono text-text-muted">{event.league}</span>
          )}
          <span className="text-[10px] font-mono text-text-muted ml-auto">
            {new Date(event.starts_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        {/* Teams + score */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-medium text-text-primary truncate">{event.home_team}</span>
                {hasScore && (
                  <span className={`text-2xl font-mono font-bold shrink-0 ${isLive ? 'text-accent' : 'text-text-primary'}`}>
                    {event.home_score}
                  </span>
                )}
              </div>
              <div className="h-px bg-bg-border" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-medium text-text-primary truncate">{event.away_team}</span>
                {hasScore && (
                  <span className={`text-2xl font-mono font-bold shrink-0 ${isLive ? 'text-accent' : 'text-text-primary'}`}>
                    {event.away_score}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Odds */}
        {(event.sport_odds?.length ?? 0) > 0 && (
          <div className="px-5 pb-5 border-t border-bg-border pt-4">
            <p className="text-[10px] font-mono text-text-muted tracking-widest mb-3">ODDS & AI VALUE</p>
            <PaywallBanner requiredPlan="pro" currentPlan={plan} feature="Bookmaker odds and AI value analysis">
              <OddsList odds={event.sport_odds!} plan={plan} />
            </PaywallBanner>
          </div>
        )}

        {(event.sport_odds?.length ?? 0) === 0 && (
          <div className="px-5 pb-5 border-t border-bg-border pt-4">
            <p className="text-[10px] font-mono text-text-muted">No odds available yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
