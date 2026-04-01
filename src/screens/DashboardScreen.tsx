'use client'
import { useRouter } from 'next/navigation'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePolling } from '../hooks/usePolling'
import { useAuthContext } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { feedApi, api } from '../lib/api'
import { getCategoryLabel } from '../lib/categories'
import type { UnifiedEvent, SubscriptionPlan, TopCategory } from '../types/index'

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function edgeColor(edge: number): string {
  if (edge > 10) return 'rgb(var(--accent))'
  if (edge > 5) return 'rgb(220 180 80)'
  if (edge < -5) return 'rgb(220 80 80)'
  return 'rgb(var(--text-muted))'
}

function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  const label = plan === 'alpha' ? 'ALPHA' : plan === 'pro' ? 'PRO' : 'FREE'
  const bg = plan === 'alpha' ? 'rgb(var(--accent) / 0.15)' : plan === 'pro' ? 'rgb(var(--accent) / 0.08)' : 'rgb(var(--bg-elevated))'
  const color = plan === 'free' ? 'rgb(var(--text-muted))' : 'rgb(var(--accent))'
  return (
    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: bg, color }}>
      {label}
    </span>
  )
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-mono text-[11px] font-bold tracking-widest uppercase" style={{ color: 'rgb(var(--text-muted))' }}>
        {title}
      </h2>
      {action && (
        <button onClick={onAction} className="font-mono text-[10px] transition-opacity hover:opacity-70" style={{ color: 'rgb(var(--accent))' }}>
          {action} →
        </button>
      )}
    </div>
  )
}

function SkeletonRow() {
  return <div className="h-[52px] rounded-lg animate-pulse" style={{ background: 'rgb(var(--bg-elevated))' }} />
}

// ── Top Edge Events ───────────────────────────────────────────────────────────

function EdgeEventRow({ event }: { event: UnifiedEvent }) {
  const router = useRouter()
  const analysis = event.event_analyses?.[0]
  const edge = analysis?.edge_score ?? 0
  const prob = analysis?.probability?.yes

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
      style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}
      onClick={() => router.push(`/events/${event.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-text-primary font-medium truncate">{event.title}</p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
          {getCategoryLabel(event.category)}
          {event.source_name && ` · ${event.source_name}`}
        </p>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        {prob != null && (
          <span className="font-mono text-[11px] font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
            {Math.round(prob * 100)}%
          </span>
        )}
        {edge !== 0 && (
          <span className="font-mono text-[10px] font-bold" style={{ color: edgeColor(edge) }}>
            {edge > 0 ? '+' : ''}{edge.toFixed(1)}pp
          </span>
        )}
      </div>
    </div>
  )
}

function TopEdgeSection() {
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const { data, loading } = usePolling(() => feedApi.getEvents({ sort: 'score' }, 5), 5 * 60_000)
  const events: UnifiedEvent[] = (data as { events?: UnifiedEvent[] } | null)?.events ?? []

  return (
    <div>
      <SectionHeader title={tr('dashboard.top_edge')} action={tr('common.see_all')} onAction={() => router.push('/feed')} />
      <div className="flex flex-col gap-2">
        {loading && events.length === 0 && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        {!loading && events.length === 0 && (
          <p className="text-[12px] font-mono py-4 text-center" style={{ color: 'rgb(var(--text-muted))' }}>
            {tr('dashboard.no_edge')}
          </p>
        )}
        {events.map(e => <EdgeEventRow key={e.id} event={e} />)}
      </div>
    </div>
  )
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

interface WatchlistItem {
  id: string
  watchlist_id: string
  type: 'event' | 'market'
  title: string
  updated_at: string
  price?: number
  edge?: number
  category?: string
}

function WatchlistRow({ item }: { item: WatchlistItem }) {
  const router = useRouter()
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
      style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}
      onClick={() => router.push(item.type === 'event' ? `/events/${item.id}` : `/market/${item.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-text-primary font-medium truncate">{item.title}</p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
          {item.category ? getCategoryLabel(item.category as TopCategory) : item.type} · {timeAgo(item.updated_at)}
        </p>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        {item.price != null && (
          <span className="font-mono text-[11px] font-bold text-text-primary">{Math.round(item.price)}%</span>
        )}
        {item.edge != null && item.edge !== 0 && (
          <span className="font-mono text-[10px] font-bold" style={{ color: edgeColor(item.edge) }}>
            {item.edge > 0 ? '+' : ''}{item.edge.toFixed(1)}pp
          </span>
        )}
      </div>
    </div>
  )
}

function WatchlistSection() {
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const { data, loading } = usePolling(() => api.getWatchlist(), 5 * 60_000)
  const items: WatchlistItem[] = (data as { items?: WatchlistItem[] } | null)?.items ?? []

  return (
    <div>
      <SectionHeader title={tr('dashboard.watchlist')} action={tr('dashboard.watchlist_manage')} onAction={() => router.push('/watchlist')} />
      <div className="flex flex-col gap-2">
        {loading && items.length === 0 && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
        {!loading && items.length === 0 && (
          <div className="px-3 py-5 rounded-lg text-center" style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}>
            <p className="text-[12px] font-mono mb-2" style={{ color: 'rgb(var(--text-muted))' }}>{tr('dashboard.no_watchlist')}</p>
            <button onClick={() => router.push('/feed')} className="font-mono text-[11px] transition-opacity hover:opacity-70" style={{ color: 'rgb(var(--accent))' }}>
              {tr('dashboard.browse_feed')}
            </button>
          </div>
        )}
        {items.slice(0, 5).map(item => <WatchlistRow key={item.watchlist_id} item={item} />)}
      </div>
    </div>
  )
}

// ── Recent Analyses ───────────────────────────────────────────────────────────

interface AnalysisItem {
  id: string
  event_id?: string
  market_id?: string
  title?: string
  edge_score?: number
  created_at: string
  status: 'pending' | 'done' | 'failed'
}

function AnalysisRow({ item }: { item: AnalysisItem }) {
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
      style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}
      onClick={() => item.event_id && router.push(`/events/${item.event_id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-text-primary font-medium truncate">
          {item.title ?? (item.event_id ? `Event ${item.event_id.slice(0, 8)}` : `Market ${item.market_id?.slice(0, 8)}`)}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{timeAgo(item.created_at)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.status === 'pending' && (
          <span className="font-mono text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>{tr('event.analysis_pending')}</span>
        )}
        {item.edge_score != null && item.edge_score !== 0 && (
          <span className="font-mono text-[10px] font-bold" style={{ color: edgeColor(item.edge_score) }}>
            {item.edge_score > 0 ? '+' : ''}{item.edge_score.toFixed(1)}pp
          </span>
        )}
      </div>
    </div>
  )
}

function RecentAnalysesSection({ plan }: { plan: SubscriptionPlan }) {
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const { data, loading } = usePolling(() => api.getUserAnalyses({ status: 'done', limit: 5 }), 5 * 60_000)
  const analyses: AnalysisItem[] = (data as { analyses?: AnalysisItem[] } | null)?.analyses ?? []

  if (plan === 'free' && analyses.length === 0 && !loading) {
    return (
      <div>
        <SectionHeader title={tr('dashboard.recent_analyses')} />
        <div className="px-3 py-5 rounded-lg text-center" style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}>
          <p className="text-[12px] font-mono mb-2" style={{ color: 'rgb(var(--text-muted))' }}>{tr('dashboard.first_analysis')}</p>
          <button onClick={() => router.push('/feed')} className="font-mono text-[11px] transition-opacity hover:opacity-70" style={{ color: 'rgb(var(--accent))' }}>
            {tr('dashboard.browse_feed')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title={tr('dashboard.recent_analyses')} action={tr('dashboard.history')} onAction={() => router.push('/feed')} />
      <div className="flex flex-col gap-2">
        {loading && analyses.length === 0 && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
        {!loading && analyses.length === 0 && (
          <p className="text-[12px] font-mono py-4 text-center" style={{ color: 'rgb(var(--text-muted))' }}>{tr('dashboard.no_analyses')}</p>
        )}
        {analyses.map(a => <AnalysisRow key={a.id} item={a} />)}
      </div>
    </div>
  )
}

// ── Usage Bar ─────────────────────────────────────────────────────────────────

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const color = pct > 80 ? 'rgb(220 80 80)' : pct > 50 ? 'rgb(220 180 80)' : 'rgb(var(--accent))'
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>{label}</span>
        <span className="font-mono text-[10px]" style={{ color: 'rgb(var(--text-secondary))' }}>{used}/{total}</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'rgb(var(--bg-border))' }}>
        <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function DashboardScreen() {
  usePageTitle('Dashboard')
  const router = useRouter()
  const { profile } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const plan: SubscriptionPlan = (profile?.plan as SubscriptionPlan) ?? 'free'

  const analysisLimit = plan === 'alpha' ? 50 : plan === 'pro' ? 20 : 3
  const searchLimit = plan === 'alpha' ? 30 : plan === 'pro' ? 10 : 0
  const analysesUsed = profile?.analyses_today ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between py-5 border-b border-bg-border mb-6">
        <div>
          <h1 className="font-mono text-lg font-bold text-text-primary">{tr('dashboard.title')}</h1>
          {profile?.email && (
            <p className="font-mono text-[11px] mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{profile.email}</p>
          )}
        </div>
        <PlanBadge plan={plan} />
      </div>

      {/* Usage (pro/alpha) */}
      {plan !== 'free' && (
        <div className="rounded-lg px-4 py-3 mb-6 flex flex-col gap-3" style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}>
          <UsageBar used={analysesUsed} total={analysisLimit} label={tr('dashboard.analyses_today')} />
          {searchLimit > 0 && (
            <UsageBar used={0} total={searchLimit} label={tr('dashboard.searches_today')} />
          )}
        </div>
      )}

      {/* Free upgrade prompt */}
      {plan === 'free' && (
        <div
          className="rounded-lg px-4 py-3 mb-6 flex items-center justify-between"
          style={{ background: 'rgb(var(--accent) / 0.05)', border: '1px solid rgb(var(--accent) / 0.2)' }}
        >
          <div>
            <p className="font-mono text-[12px] font-bold text-text-primary">
              {analysesUsed}/{analysisLimit} {tr('dashboard.analyses_today').toLowerCase()}
            </p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
              {tr('dashboard.upgrade_desc')}
            </p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="font-mono text-[11px] font-bold px-3 py-1.5 rounded-md shrink-0 transition-opacity hover:opacity-80"
            style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }}
          >
            {tr('common.upgrade')}
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopEdgeSection />
        <WatchlistSection />
        <RecentAnalysesSection plan={plan} />
      </div>
    </div>
  )
}
