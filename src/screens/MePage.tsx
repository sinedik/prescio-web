import { useState, useCallback } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type MeTab = 'analyses' | 'watchlist'
type AnalysisFilter = 'all' | 'pending' | 'done'

interface UserAnalysis {
  id: string
  type: 'market' | 'event'
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  title: string
  slug?: string
  market_id?: string
  event_id?: string
  category?: string
  yes_price?: number | null
  created_at: string
  analysis?: {
    recommendation?: string
    edge_score?: number | null
    confidence_score?: number | null
    overall_sentiment?: string
    analyzed_at?: string
  } | null
}

interface WatchlistItem {
  id: string
  watchlist_id: string
  type: 'event' | 'market'
  title: string
  updated_at: string
  price?: number
  category?: string
  platform?: string
}

type WatchlistTab = 'events' | 'markets'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const REC_CONFIG: Record<string, { label: string; cls: string }> = {
  strong_enter: { label: 'STRONG ENTER', cls: 'text-accent border-accent/60 bg-accent/10' },
  enter:        { label: 'ENTER',        cls: 'text-accent border-accent/40 bg-accent/10' },
  watch:        { label: 'WATCH',        cls: 'text-watch border-watch/40 bg-watch/10' },
  skip:         { label: 'SKIP',         cls: 'text-text-muted border-bg-border' },
  avoid:        { label: 'AVOID',        cls: 'text-danger border-danger/40 bg-danger/10' },
}

const SENTIMENT_CLS: Record<string, string> = {
  BULLISH: 'text-accent border-accent/30 bg-accent/10',
  BEARISH: 'text-danger border-danger/30 bg-danger/10',
  NEUTRAL: 'text-text-muted border-bg-border',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'pending' || status === 'in_progress') {
    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-watch animate-pulse" />
  }
  if (status === 'done') {
    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
  }
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger" />
}

// ─── Analyses Tab ─────────────────────────────────────────────────────────────

function AnalysesTab({ isAlpha }: { isAlpha: boolean }) {
  const router = useRouter()
  const [filter, setFilter] = useState<AnalysisFilter>('all')

  const fetcher = useCallback(() => {
    const params: { status?: 'pending' | 'done' | 'failed'; limit?: number } = { limit: 50 }
    if (filter === 'pending') params.status = 'pending'
    else if (filter === 'done') params.status = 'done'
    return api.getUserAnalyses(params) as Promise<{ items: UserAnalysis[] }>
  }, [filter])

  const { data, loading } = usePolling(fetcher, 15 * 1000, filter)
  const items = (data as { items?: UserAnalysis[] })?.items ?? []

  return (
    <div>
      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mb-5">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded border transition-colors uppercase ${
              filter === f
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'border-bg-border text-text-muted hover:text-text-secondary'
            }`}
          >
            {f === 'pending' ? 'IN PROGRESS' : f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-bg-surface border border-bg-border rounded-lg px-4 py-3.5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3/4 bg-bg-elevated rounded" />
                <div className="h-4 w-14 bg-bg-elevated rounded ml-auto" />
              </div>
              <div className="h-2.5 w-28 bg-bg-elevated rounded mt-2" />
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-10 h-10 rounded-xl bg-bg-surface border border-bg-border flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
            </svg>
          </div>
          <p className="text-sm font-mono text-text-secondary mb-1">No analyses yet.</p>
          <p className="text-xs font-mono text-text-muted">
            Open a market or event and click Analyze to get started.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isPending = item.status === 'pending' || item.status === 'in_progress'
            const targetPath = item.type === 'event'
              ? `/events/${item.event_id}`
              : `/markets/${item.slug ?? item.market_id}`

            const rec = item.analysis?.recommendation
            const recCfg = rec ? REC_CONFIG[rec] : null
            const edge = item.analysis?.edge_score
            const sentiment = item.analysis?.overall_sentiment
            const sentCls = sentiment ? SENTIMENT_CLS[sentiment.toUpperCase()] : null

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 bg-bg-surface border border-bg-border rounded-lg px-4 py-3.5 cursor-pointer hover:border-text-muted/30 transition-colors"
                onClick={() => router.push(targetPath)}
              >
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={item.status} />
                    {item.category && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-bg-border bg-bg-elevated text-text-muted uppercase shrink-0">
                        {item.category}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-text-muted uppercase shrink-0">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[13px] font-mono text-text-secondary truncate leading-snug">
                    {item.title}
                  </p>
                  <p className="text-[10px] font-mono text-text-muted mt-0.5">
                    {isPending ? 'analyzing...' : timeAgo(item.created_at)}
                  </p>
                </div>

                {/* Right: result badge */}
                {isPending ? (
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-watch animate-pulse" />
                    <span className="text-[10px] font-mono text-watch font-bold">ANALYZING</span>
                  </div>
                ) : item.type === 'market' && recCfg ? (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${recCfg.cls}`}>
                      {recCfg.label}
                    </span>
                    {isAlpha && edge != null && (
                      <span className={`text-[10px] font-mono font-bold ${edge >= 0 ? 'text-accent' : 'text-danger'}`}>
                        {edge >= 0 ? '+' : ''}{edge.toFixed(1)}pp
                      </span>
                    )}
                  </div>
                ) : item.type === 'event' && sentCls ? (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${sentCls}`}>
                    {sentiment}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Watchlist Tab ────────────────────────────────────────────────────────────

function WatchlistTab() {
  const router = useRouter()
  const [wTab, setWTab] = useState<WatchlistTab>('events')
  const [removing, setRemoving] = useState<string | null>(null)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const fetcher = useCallback(() => api.getWatchlist() as Promise<{ items: WatchlistItem[] }>, [])
  const { data, loading } = usePolling(fetcher, 5 * 60 * 1000)

  const allItems: WatchlistItem[] = ((data as { items?: WatchlistItem[] })?.items ?? []).filter(
    (item) => !removedIds.has(item.id)
  )
  const items = allItems.filter((item) => item.type === wTab.slice(0, -1) as 'event' | 'market')

  async function handleRemove(item: WatchlistItem, e: React.MouseEvent) {
    e.stopPropagation()
    setRemoving(item.id)
    setRemovedIds((prev) => new Set([...prev, item.id]))
    try {
      await api.removeFromWatchlist(item.watchlist_id)
    } catch {
      setRemovedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit mb-5">
        {(['events', 'markets'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setWTab(t)}
            className={`px-4 py-1.5 text-[11px] font-mono font-bold rounded transition-colors uppercase ${
              wTab === t
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t}
            {!loading && allItems.filter((i) => i.type === t.slice(0, -1)).length > 0 && (
              <span className="ml-1.5 opacity-50">
                {allItems.filter((i) => i.type === t.slice(0, -1)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-bg-surface border border-bg-border rounded-lg px-4 py-4 animate-pulse" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2 mr-4">
                  <div className="h-3 w-2/3 bg-bg-elevated rounded" />
                  <div className="h-2.5 w-24 bg-bg-elevated rounded" />
                </div>
                <div className="h-5 w-14 bg-bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-mono text-text-secondary mb-1">
            No {wTab} in watchlist yet.
          </p>
          <p className="text-xs font-mono text-text-muted mb-5">
            {wTab === 'events'
              ? 'Browse the feed and click Watch to add events.'
              : 'Open a market and click Watch to add it.'}
          </p>
          <button
            onClick={() => router.push(wTab === 'events' ? '/feed' : '/markets')}
            className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold rounded hover:bg-accent/20 transition-colors"
          >
            {wTab === 'events' ? 'Browse Feed' : 'Browse Markets'}
          </button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-bg-surface border border-bg-border rounded-lg px-4 py-3.5 cursor-pointer hover:border-text-muted/30 transition-colors"
              onClick={() => router.push(item.type === 'event' ? `/events/${item.id}` : `/markets/${item.id}`)}
            >
              {(item.category || item.platform) && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-bg-border bg-bg-elevated text-text-muted uppercase shrink-0">
                  {item.category ?? item.platform}
                </span>
              )}
              <p className="flex-1 text-[13px] font-mono text-text-secondary truncate min-w-0">
                {item.title}
              </p>
              <div className="flex items-center gap-3 shrink-0">
                {item.type === 'market' && item.price !== undefined && (
                  <span className="text-[12px] font-mono font-bold text-text-primary">
                    {item.price.toFixed(0)}%
                  </span>
                )}
                <button
                  onClick={(e) => handleRemove(item, e)}
                  disabled={removing === item.id}
                  className="text-text-muted/50 hover:text-danger transition-colors disabled:opacity-30"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner:    'Beginner trader',
  experienced: 'Experienced trader',
  pro:         'Full-time trader',
}

const PLAN_CONFIG: Record<string, { label: string; cls: string; desc: string }> = {
  free:  { label: 'FREE',  cls: 'text-text-muted border-bg-border',          desc: '3 analyses/day' },
  pro:   { label: 'PRO',   cls: 'text-accent border-accent/30 bg-accent/8',  desc: 'Unlimited analyses' },
  alpha: { label: 'ALPHA', cls: 'text-accent border-accent/40 bg-accent/10', desc: 'Full access + edge scoring' },
}

function SettingsTab() {
  const router = useRouter()
  const { profile } = useAuthContext()

  const plan = profile?.plan ?? 'free'
  const planCfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free
  const experience = profile?.trading_experience
  const interests: string[] = (profile?.interests as string[]) ?? []
  const streakDays = profile?.streak_days ?? 0
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-4">
      {/* Plan card */}
      <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
        <p className="text-[10px] font-mono text-text-muted tracking-widest mb-3">SUBSCRIPTION</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${planCfg.cls}`}>
              {planCfg.label}
            </span>
            <span className="text-xs font-mono text-text-muted">{planCfg.desc}</span>
          </div>
          {plan === 'free' && (
            <button
              onClick={() => router.push('/profile')}
              className="text-[10px] font-mono font-bold text-accent hover:text-accent/80 transition-colors"
            >
              Upgrade →
            </button>
          )}
          {plan === 'pro' && (
            <button
              onClick={() => router.push('/profile')}
              className="text-[10px] font-mono font-bold text-text-muted hover:text-text-secondary transition-colors"
            >
              Upgrade to Alpha →
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 text-center">
          <p className="text-2xl font-mono font-bold text-text-primary">{streakDays}</p>
          <p className="text-[10px] font-mono text-text-muted mt-0.5">DAY STREAK</p>
        </div>
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 text-center">
          <p className="text-2xl font-mono font-bold text-text-primary">
            {profile?.analyses_today ?? 0}
          </p>
          <p className="text-[10px] font-mono text-text-muted mt-0.5">ANALYSES TODAY</p>
        </div>
      </div>

      {/* Profile */}
      <div className="bg-bg-surface border border-bg-border rounded-lg p-4 space-y-3">
        <p className="text-[10px] font-mono text-text-muted tracking-widest">PROFILE</p>
        {experience && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted">Experience</span>
            <span className="text-xs font-mono text-text-secondary">
              {EXPERIENCE_LABELS[experience] ?? experience}
            </span>
          </div>
        )}
        {interests.length > 0 && (
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-mono text-text-muted shrink-0">Interests</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {interests.map((i) => (
                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-bg-border bg-bg-elevated text-text-muted uppercase">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
        {memberSince && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted">Member since</span>
            <span className="text-xs font-mono text-text-secondary">{memberSince}</span>
          </div>
        )}
      </div>

      {/* Link to full settings */}
      <button
        onClick={() => router.push('/profile')}
        className="w-full flex items-center justify-between bg-bg-surface border border-bg-border rounded-lg px-4 py-3.5 hover:border-text-muted/30 transition-colors"
      >
        <span className="text-xs font-mono text-text-secondary">Full profile & settings</span>
        <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  usePageTitle('Dashboard')
  const { isAlpha } = useAuthContext()
  const [tab, setTab] = useState<MeTab>('analyses')

  const TAB_CONFIG: { key: MeTab; label: string }[] = [
    { key: 'analyses', label: 'ANALYSES' },
    { key: 'watchlist', label: 'WATCHLIST' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <h1 className="text-base font-mono font-bold text-text-primary mb-6">DASHBOARD</h1>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit mb-6">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-[11px] font-mono font-bold rounded transition-colors ${
              tab === key
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'analyses' && <AnalysesTab isAlpha={isAlpha} />}
      {tab === 'watchlist' && <WatchlistTab />}
    </div>
  )
}
