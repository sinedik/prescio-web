'use client'
import { useParams, useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { sportApi } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import { OddsList } from '../components/feed/OddsList'
import { PaywallBanner } from '../components/paywall/PaywallBanner'
import type { SportEvent, SportOdds, SubscriptionPlan } from '../types/index'

function extractH2H(odds?: SportOdds[]): { home: number; away: number; homePrice: number; awayPrice: number } | null {
  const h2h = odds?.find(o => o.market_type === 'h2h')
  if (!h2h || h2h.outcomes.length < 2) return null
  const nonDraw = h2h.outcomes.filter(o => o.name !== 'Draw' && o.name !== 'draw')
  if (nonDraw.length < 2) return null
  const raw0 = 100 / nonDraw[0].price
  const raw1 = 100 / nonDraw[1].price
  const sum = raw0 + raw1
  return {
    home: Math.round((raw0 / sum) * 100),
    away: Math.round((raw1 / sum) * 100),
    homePrice: nonDraw[0].price,
    awayPrice: nonDraw[1].price,
  }
}

function abbr(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (name ?? '--').slice(0, 2).toUpperCase()
}

export default function SportEventPage({ id: idProp, onBack }: { id?: string; onBack?: () => void }) {
  const params = useParams<{ id: string }>()
  const id = idProp ?? params?.id ?? ''
  const router = useRouter()
  const { profile } = useAuthContext()
  const plan: SubscriptionPlan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')

  const { data, loading } = usePolling(
    () => sportApi.getEvent(id),
    60_000,
    id,
  )
  const event = data as SportEvent | null

  const isLive     = event?.status === 'live'
  const isFinished = event?.status === 'finished'
  const hasScore   = event?.home_score != null && event?.away_score != null

  const h2h = extractH2H(event?.sport_odds)

  if (loading && !event) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-3 w-32 bg-bg-elevated rounded" />
        <div className="bg-bg-surface border border-bg-border rounded-xl p-6 space-y-4">
          <div className="h-3 w-24 bg-bg-elevated rounded" />
          <div className="h-8 w-3/4 bg-bg-elevated rounded" />
          <div className="h-8 w-1/2 bg-bg-elevated rounded" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-mono text-text-muted mb-4">Event not found</p>
        <button
          onClick={() => onBack ? onBack() : router.back()}
          className="text-xs font-mono text-accent hover:text-accent/80 transition-colors"
        >
          ← Go back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <button
        onClick={() => onBack ? onBack() : router.back()}
        className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors self-start"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>

      {/* Match card */}
      <div className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden"
        style={isLive ? { borderColor: 'rgba(255,50,50,0.25)' } : undefined}>

        {/* Status bar */}
        <div className={`px-5 py-2.5 flex items-center gap-2 border-b border-bg-border ${isLive ? 'bg-red-500/[0.04]' : ''}`}>
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ background: 'rgba(255,50,50,0.12)', color: '#ff5252' }}>
                LIVE
              </span>
            </div>
          )}
          {isFinished && (
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest px-1.5 py-0.5 rounded border border-bg-border">
              Finished
            </span>
          )}
          {!isLive && !isFinished && (
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest">
              Upcoming
            </span>
          )}
          {event.league && (
            <span className="text-[10px] font-mono text-text-muted/70 ml-1">{event.league}</span>
          )}
          <span className="text-[10px] font-mono text-text-muted/50 ml-auto">
            {new Date(event.starts_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        {/* Scoreboard */}
        <div className="px-6 py-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            {/* Home */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold bg-bg-elevated border border-bg-border text-text-muted">
                {abbr(event.home_team)}
              </div>
              <p className="text-sm font-semibold text-text-primary text-center leading-tight">{event.home_team}</p>
              {h2h && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[11px] font-mono text-text-muted/50">Win prob</span>
                  <span className="text-base font-mono font-bold"
                    style={{ color: h2h.home >= h2h.away ? 'var(--accent)' : undefined }}>
                    {h2h.home}%
                  </span>
                  <span className="text-[10px] font-mono text-text-muted/50">
                    {h2h.homePrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Center score / vs */}
            <div className="flex flex-col items-center justify-center gap-2 px-4">
              {hasScore ? (
                <div className="flex items-center gap-3">
                  <span className={`text-4xl font-mono font-bold ${isLive ? 'text-red-400' : 'text-text-primary'}`}>
                    {event.home_score}
                  </span>
                  <span className="text-xl font-mono text-text-muted/30">:</span>
                  <span className={`text-4xl font-mono font-bold ${isLive ? 'text-red-400' : 'text-text-primary'}`}>
                    {event.away_score}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-mono text-text-muted/40 tracking-widest">VS</span>
              )}
              {h2h && (
                <div className="w-[120px] h-[4px] rounded-full overflow-hidden bg-bg-elevated mt-1">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${h2h.home}%`, background: 'var(--accent)' }} />
                </div>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold bg-bg-elevated border border-bg-border text-text-muted">
                {abbr(event.away_team)}
              </div>
              <p className="text-sm font-semibold text-text-primary text-center leading-tight">{event.away_team}</p>
              {h2h && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[11px] font-mono text-text-muted/50">Win prob</span>
                  <span className="text-base font-mono font-bold"
                    style={{ color: h2h.away > h2h.home ? 'var(--accent)' : undefined }}>
                    {h2h.away}%
                  </span>
                  <span className="text-[10px] font-mono text-text-muted/50">
                    {h2h.awayPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Odds & AI Value */}
        <div className="border-t border-bg-border px-5 py-4">
          <p className="text-[10px] font-mono text-text-muted/50 tracking-widest mb-3">ODDS &amp; AI VALUE</p>
          {(event.sport_odds?.length ?? 0) > 0 ? (
            <PaywallBanner requiredPlan="pro" currentPlan={plan} feature="Bookmaker odds and AI value analysis">
              <OddsList odds={event.sport_odds!} plan={plan} />
            </PaywallBanner>
          ) : (
            <p className="text-[11px] font-mono text-text-muted/50">No odds available yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
