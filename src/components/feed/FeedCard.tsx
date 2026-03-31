'use client'
import { useRouter } from 'next/navigation'
import type { UnifiedEvent, SubscriptionPlan } from '../../types/index'
import { SourceBadge } from './SourceBadge'
import { OddsList } from './OddsList'
import { getCategoryLabel } from '../../lib/categories'

interface Props { event: UnifiedEvent; plan: SubscriptionPlan }

export function FeedCard({ event, plan }: Props) {
  const router = useRouter()
  const isSport = event.source_type === 'sport'
  const analysis = event.event_analyses?.[0]
  const isLive = event.status === 'live'

  return (
    <div
      onClick={() => router.push(isSport ? `/sport/${event.source_id ?? event.id}` : `/events/${event.id}`)}
      className="rounded-lg p-4 cursor-pointer transition-opacity hover:opacity-90"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isLive ? 'var(--accent)' : 'var(--border)'}`,
        borderLeft: `3px solid ${isSport ? 'var(--watch)' : 'var(--poly)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SourceBadge source={event.source_name} />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {getCategoryLabel(event.category)}
              {event.subcategory && ` · ${event.subcategory}`}
            </span>
            {isLive && (
              <span style={{ fontSize: '9px', color: 'var(--bg-base)', background: 'var(--accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                LIVE
              </span>
            )}
          </div>
          <h3 className="truncate" style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
            {event.title}
          </h3>
        </div>

        {/* Edge score — Pro+ */}
        {plan !== 'free' && analysis?.edge_score != null && (
          <div className="flex-shrink-0 flex flex-col items-center rounded-md px-2 py-1" style={{ background: 'var(--bg-elevated)', minWidth: '44px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>edge</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: analysis.edge_score > 0.5 ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {(analysis.edge_score * 100).toFixed(0)}
            </span>
          </div>
        )}
      </div>

      {/* Prediction: yes/no */}
      {!isSport && analysis?.probability && (
        <div className="flex gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: `rgba(var(--accent-rgb), 0.1)` }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>YES</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
              {(analysis.probability.yes * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: 'var(--bg-elevated)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>NO</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {(analysis.probability.no * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Sport: кэфы */}
      {isSport && (event.sport_odds?.length ?? 0) > 0 && (
        <div className="mb-3" onClick={e => e.stopPropagation()}>
          <OddsList odds={event.sport_odds!} plan={plan} />
        </div>
      )}

      {/* AI summary — Pro+ */}
      {plan !== 'free' && analysis?.summary && (
        <p className="line-clamp-2" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
          {analysis.summary}
        </p>
      )}

      {/* Free hint */}
      {plan === 'free' && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Upgrade to Pro for AI analysis
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {event.starts_at && (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {new Date(event.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>→</span>
      </div>
    </div>
  )
}
