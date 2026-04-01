import { OddsList } from '../feed/OddsList'
import { SourceBadge } from '../feed/SourceBadge'
import { PaywallBanner } from '../paywall/PaywallBanner'
import { GameLogo } from '../icons/games'
import type { SportEvent, SubscriptionPlan } from '../../types/index'

export function SportCard({ event, plan }: { event: SportEvent; plan: SubscriptionPlan }) {
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
          {event.subcategory && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <GameLogo discipline={event.subcategory} size={11} className="opacity-60" />
              {event.subcategory.toUpperCase()}
            </span>
          )}
          {event.league && (
            <span className="text-[10px] text-text-muted opacity-60">{event.league}</span>
          )}
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
