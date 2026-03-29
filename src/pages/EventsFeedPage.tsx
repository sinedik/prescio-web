import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import PaywallModal from '../components/PaywallModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventMarket {
  id: string
  question: string
  price: number          // 0-100
  edge_score?: number    // pp, Alpha only
}

interface FeedEvent {
  id: string
  title: string
  summary: string
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'active' | 'resolved'
  updated_at: string
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  uncertainty_level?: 'LOW' | 'MEDIUM' | 'HIGH'
  markets_count: number
  total_volume: number
  markets: EventMarket[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['ALL', 'GEOPOLITICS', 'ELECTIONS', 'CRYPTO', 'POLICY', 'AI & TECH', 'ECONOMICS']

const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:      { label: 'LOW',      cls: 'text-text-muted border-bg-border' },
  MEDIUM:   { label: 'MEDIUM',   cls: 'text-watch border-watch/30' },
  HIGH:     { label: 'HIGH',     cls: 'text-danger border-danger/40' },
  CRITICAL: { label: 'CRITICAL', cls: 'text-danger border-danger/60' },
}

const SENTIMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  BULLISH: { label: 'BULLISH', cls: 'text-accent bg-accent/10 border-accent/30' },
  BEARISH: { label: 'BEARISH', cls: 'text-danger bg-danger/10 border-danger/30' },
  NEUTRAL: { label: 'NEUTRAL', cls: 'text-text-muted bg-bg-elevated border-bg-border' },
}

const UNCERTAINTY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:    { label: 'LOW uncertainty',    cls: 'text-accent/80 bg-accent/5 border-accent/20' },
  MEDIUM: { label: 'MED uncertainty', cls: 'text-watch bg-watch/10 border-watch/30' },
  HIGH:   { label: 'HIGH uncertainty',   cls: 'text-danger bg-danger/5 border-danger/25' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

function formatUpdated(dateStr: string): string {
  const mins = minutesAgo(dateStr)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v}`
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({
  event,
  isPro,
  isAlpha,
  onUpgradePro,
  onUpgradeAlpha,
  onClick,
}: {
  event: FeedEvent
  isPro: boolean
  isAlpha: boolean
  onUpgradePro: () => void
  onUpgradeAlpha: () => void
  onClick: () => void
}) {
  const sevCfg = SEVERITY_CONFIG[event.severity] ?? SEVERITY_CONFIG.MEDIUM
  const sentCfg = event.sentiment ? SENTIMENT_CONFIG[event.sentiment] : null
  const uncertCfg = event.uncertainty_level ? UNCERTAINTY_CONFIG[event.uncertainty_level] : null

  return (
    <div
      className="bg-bg-surface border border-bg-border rounded-xl p-5 cursor-pointer hover:border-text-muted/30 transition-colors"
      onClick={onClick}
    >
      {/* Top row: badges + time */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-bg-border bg-bg-elevated text-text-muted uppercase tracking-wider">
          {event.category}
        </span>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${sevCfg.cls}`}>
          {sevCfg.label}
        </span>
        <span className="ml-auto text-[10px] font-mono text-text-muted">
          updated {formatUpdated(event.updated_at)}
        </span>
      </div>

      {/* Title + summary */}
      <h3 className="text-[15px] font-mono font-bold text-text-primary leading-snug mb-1.5">
        {event.title}
      </h3>
      <p className="text-xs font-mono text-text-muted leading-relaxed mb-3 line-clamp-2">
        {event.summary}
      </p>

      {/* Pro: sentiment + uncertainty */}
      {isPro && (sentCfg || uncertCfg) && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {sentCfg && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sentCfg.cls}`}>
              {sentCfg.label}
            </span>
          )}
          {uncertCfg && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${uncertCfg.cls}`}>
              {uncertCfg.label}
            </span>
          )}
        </div>
      )}
      {!isPro && (event.sentiment || event.uncertainty_level) && (
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-20 bg-bg-elevated rounded blur-[2px] opacity-50" />
          <div className="h-4 w-28 bg-bg-elevated rounded blur-[2px] opacity-50" />
        </div>
      )}

      {/* Volume + markets count */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-mono text-text-muted">
          {event.markets_count} market{event.markets_count !== 1 ? 's' : ''}
        </span>
        {event.total_volume > 0 && (
          <>
            <span className="text-text-muted/30">·</span>
            <span className="text-[11px] font-mono text-text-muted">
              {formatVolume(event.total_volume)} volume
            </span>
          </>
        )}
      </div>

      {/* Markets list */}
      {event.markets && event.markets.length > 0 && (
        <div className="border-t border-bg-border pt-3 flex flex-col gap-1.5">
          {event.markets.slice(0, 4).map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="text-text-muted/40 text-[10px] font-mono shrink-0">▸</span>
              <span className="flex-1 text-[12px] font-mono text-text-secondary truncate">{m.question}</span>
              <span className="text-[12px] font-mono font-bold text-text-primary shrink-0">
                {m.price.toFixed(0)}%
              </span>
              {isAlpha && m.edge_score !== undefined ? (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  m.edge_score >= 10 ? 'text-accent border-accent/40 bg-accent/10' :
                  m.edge_score >= 5  ? 'text-watch border-watch/30 bg-watch/5' :
                  'text-text-muted border-bg-border'
                }`}>
                  {m.edge_score >= 0 ? '+' : ''}{m.edge_score}pp
                </span>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpgradeAlpha() }}
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-bg-border text-text-muted/50 hover:text-text-muted hover:border-text-muted/30 transition-colors shrink-0"
                  title="Alpha only"
                >
                  EDGE
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View analysis link */}
      <div className="mt-3 pt-2">
        <span className="text-[11px] font-mono text-accent/70 hover:text-accent transition-colors">
          View full analysis →
        </span>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ index }: { index: number }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-xl p-5 animate-pulse" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-20 bg-bg-elevated rounded" />
        <div className="h-4 w-16 bg-bg-elevated rounded" />
        <div className="h-3 w-14 bg-bg-elevated rounded ml-auto" />
      </div>
      <div className="h-4 w-3/4 bg-bg-elevated rounded mb-2" />
      <div className="h-3 w-full bg-bg-elevated rounded mb-1" />
      <div className="h-3 w-2/3 bg-bg-elevated rounded mb-3" />
      <div className="h-3 w-24 bg-bg-elevated rounded mb-3" />
      <div className="border-t border-bg-border pt-3 space-y-1.5">
        <div className="h-3 w-full bg-bg-elevated rounded" />
        <div className="h-3 w-5/6 bg-bg-elevated rounded" />
        <div className="h-3 w-4/5 bg-bg-elevated rounded" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsFeedPage() {
  const navigate = useNavigate()
  const { isPro, isAlpha } = useAuthContext()
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [paywallVariant, setPaywallVariant] = useState<'pro' | 'alpha' | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(val), 300)
  }, [])

  const { data, loading, lastUpdated } = usePolling<{ events?: FeedEvent[]; items?: unknown[] }>(
    () => api.getFeed() as Promise<{ events?: FeedEvent[]; items?: unknown[] }>,
    5 * 60 * 1000,
  )

  const events: FeedEvent[] = useMemo(() => {
    if (!data) return []
    const raw = (data as { events?: FeedEvent[] }).events ?? []
    return raw
  }, [data])

  const filtered = useMemo(() => {
    let result = events
    if (activeCategory !== 'ALL') {
      result = result.filter((e) =>
        e.category.toUpperCase() === activeCategory.replace(' & ', '_').toUpperCase() ||
        e.category.toUpperCase() === activeCategory.toUpperCase()
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q) ||
        e.markets?.some((m) => m.question.toLowerCase().includes(q))
      )
    }
    return result
  }, [events, activeCategory, search])

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null
    const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
    if (mins < 1) return 'Updated just now'
    return `Updated ${mins}m ago`
  }, [lastUpdated])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">FEED</h1>
          {updatedLabel && (
            <p className="text-[10px] font-mono text-text-muted mt-0.5">{updatedLabel}</p>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded border whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-bg-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Search events and markets..."
          className="w-full bg-bg-surface border border-bg-border rounded pl-9 pr-3 py-2 text-sm font-mono
            text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); setSearch('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm font-mono text-text-muted">NO EVENTS FOUND</p>
          {activeCategory !== 'ALL' && (
            <button
              onClick={() => setActiveCategory('ALL')}
              className="mt-3 text-xs font-mono text-accent hover:text-accent/80 transition-colors"
            >
              Show all categories
            </button>
          )}
        </div>
      )}

      {/* Events list */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-4">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isPro={isPro}
              isAlpha={isAlpha}
              onUpgradePro={() => setPaywallVariant('pro')}
              onUpgradeAlpha={() => setPaywallVariant('alpha')}
              onClick={() => navigate(`/events/${event.id}`)}
            />
          ))}
        </div>
      )}

      {paywallVariant && (
        <PaywallModal
          variant={paywallVariant}
          onClose={() => setPaywallVariant(null)}
        />
      )}
    </div>
  )
}
