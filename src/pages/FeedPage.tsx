import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import EdgeCard from '../components/EdgeCard'
import MarketCard from '../components/MarketCard'
import PaywallModal from '../components/PaywallModal'
import { getFeed, getMarkets } from '../api'
import type { Market, MarketOpportunity, FilterPlatform, SortField } from '../types'
import { useAuthContext } from '../contexts/AuthContext'
import { IconBolt } from '../components/icons'

const POLL_INTERVAL = 15_000

// 'markets' = raw market data, no Claude. 'ai' = Claude-analyzed edge feed.
type ViewMode = 'markets' | 'ai'

const PLATFORM_OPTIONS: { value: FilterPlatform; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'polymarket', label: 'POLY' },
  { value: 'kalshi', label: 'KALSHI' },
]

const CATEGORY_OPTIONS = ['GEOPOLITICS', 'CRYPTO', 'ELECTIONS', 'US_POLITICS', 'POLICY']

const HORIZON_OPTIONS: { value: string; label: string }[] = [
  { value: 'any', label: 'ANY' },
  { value: 'TODAY', label: 'TODAY' },
  { value: 'WEEK', label: 'WEEK' },
  { value: 'MONTH', label: 'MONTH' },
]

const MARKETS_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'volume', label: 'VOLUME' },
  { value: 'resolution', label: 'RESOLVES' },
  { value: 'category', label: 'CATEGORY' },
]

const EDGE_SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'edge', label: 'EDGE' },
  { value: 'volume', label: 'VOL' },
  { value: 'confidence', label: 'CONF' },
  { value: 'resolution', label: 'RESOLVES' },
]

// Module-level cache — survives component unmount/remount (tab switching)
const moduleCache = {
  markets: [] as Market[],
  edgeItems: [] as MarketOpportunity[],
  marketsAt: 0,
  edgeAt: 0,
  TTL: 5 * 60 * 1000, // 5 min before background refresh
}

export default function FeedPage() {
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const isPro = profile?.is_pro ?? false
  const [showPaywall, setShowPaywall] = useState(false)

  // Mode
  const [viewMode, setViewMode] = useState<ViewMode>('markets')

  // Data — initialise from module cache so there's no blank flash on remount
  const [rawMarkets, setRawMarkets] = useState<Market[]>(moduleCache.markets)
  const [edgeItems, setEdgeItems] = useState<MarketOpportunity[]>(moduleCache.edgeItems)
  // Start in non-loading state if we already have cached data for the default view (markets)
  const [loading, setLoading] = useState(moduleCache.markets.length === 0)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // Shared filters
  const [platform, setPlatform] = useState<FilterPlatform>('all')
  const [search, setSearch] = useState('')

  // Markets-mode filters
  const [marketsSort, setMarketsSort] = useState('volume')

  // Edge-mode filters
  const [categories, setCategories] = useState<string[]>([])
  const [horizon, setHorizon] = useState('any')
  const [highConfOnly, setHighConfOnly] = useState(false)
  const [edgeSort, setEdgeSort] = useState<SortField>('edge')
  const [showSkipped, setShowSkipped] = useState(false)

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  const load = useCallback(async (isPolling = false) => {
    const now = Date.now()
    const cached = viewMode === 'markets'
      ? moduleCache.markets.length > 0 && (now - moduleCache.marketsAt) < moduleCache.TTL
      : moduleCache.edgeItems.length > 0 && (now - moduleCache.edgeAt) < moduleCache.TTL

    // Show cached data instantly, skip full loading state
    if (!isPolling && cached) {
      setLoading(false)
    } else if (!isPolling) {
      setLoading(true)
      stopPolling()
    }
    setError(null)

    try {
      if (viewMode === 'markets') {
        const markets = await getMarkets({ limit: 50 })
        moduleCache.markets = markets
        moduleCache.marketsAt = Date.now()
        setRawMarkets(markets)
        setScanning(false)
        setLastUpdated(new Date())
        stopPolling()
      } else {
        const { items, scanning: s } = await getFeed()
        moduleCache.edgeItems = items
        moduleCache.edgeAt = Date.now()
        setEdgeItems(items)
        setScanning(s)
        setLastUpdated(new Date())

        if (s && items.length === 0) {
          setPollCount((c) => c + 1)
          pollTimer.current = setTimeout(() => load(true), POLL_INTERVAL)
        } else {
          stopPolling()
          setPollCount(0)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
      stopPolling()
    } finally {
      if (!isPolling) setLoading(false)
    }
  }, [viewMode, stopPolling])

  useEffect(() => {
    load()
    return stopPolling
  }, [load, stopPolling])

  // ---- Derived: filtered & sorted raw markets ----
  const filteredMarkets = rawMarkets
    .filter((m) => {
      if (platform !== 'all' && !m.platform?.toLowerCase().includes(platform.toLowerCase())) return false
      if (categories.length > 0 && !categories.includes(m.category ?? '')) return false
      if (search && !m.question.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (marketsSort === 'volume') return (b.volume ?? 0) - (a.volume ?? 0)
      if (marketsSort === 'resolution') {
        const da = a.resolutionDate ? new Date(a.resolutionDate).getTime() : Infinity
        const db = b.resolutionDate ? new Date(b.resolutionDate).getTime() : Infinity
        return da - db
      }
      const pa = a.yesPrice > 1 ? a.yesPrice : a.yesPrice * 100
      const pb = b.yesPrice > 1 ? b.yesPrice : b.yesPrice * 100
      if (marketsSort === 'category') {
        return (a.category ?? '').localeCompare(b.category ?? '')
      }
      return 0
    })

  // ---- Derived: filtered & sorted edge items ----
  function isSkip(action: string) {
    const a = action?.toUpperCase() ?? ''
    return a === 'SKIP' || a.includes('PASS') || a.includes('AVOID') || a === 'NO_ACTION'
  }

  function getConfScore(item: MarketOpportunity) {
    if (typeof item.analysis.confidenceScore === 'number') return item.analysis.confidenceScore
    if (item.analysis.confidence === 'high') return 75
    if (item.analysis.confidence === 'medium') return 50
    return 25
  }

  const allEdgeFiltered = edgeItems
    .filter((item) => {
      if (platform !== 'all' && !item.market.platform?.toLowerCase().includes(platform.toLowerCase())) return false
      if (categories.length > 0 && !categories.includes(item.analysis.category ?? '')) return false
      if (horizon !== 'any' && item.analysis.horizon?.toUpperCase() !== horizon) return false
      if (highConfOnly && getConfScore(item) < 70) return false
      if (search && !item.market.question.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (edgeSort === 'edge') return Math.abs(b.analysis.edge) - Math.abs(a.analysis.edge)
      if (edgeSort === 'volume') return (b.market.volume ?? 0) - (a.market.volume ?? 0)
      if (edgeSort === 'confidence') return getConfScore(b) - getConfScore(a)
      if (edgeSort === 'resolution') {
        const da = a.market.resolutionDate ? new Date(a.market.resolutionDate).getTime() : Infinity
        const db = b.market.resolutionDate ? new Date(b.market.resolutionDate).getTime() : Infinity
        return da - db
      }
      return 0
    })

  const skippedCount = allEdgeFiltered.filter((item) => isSkip(item.analysis.action)).length
  const filteredEdge = showSkipped ? allEdgeFiltered : allEdgeFiltered.filter((item) => !isSkip(item.analysis.action))

  const hasActiveFilters = platform !== 'all' || search !== '' || categories.length > 0 ||
    (viewMode === 'ai' && (horizon !== 'any' || highConfOnly))

  const resultCount = viewMode === 'markets' ? filteredMarkets.length : filteredEdge.length

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">
            MARKETS
          </h1>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            {viewMode === 'ai' && scanning && edgeItems.length === 0
              ? `SCANNING... poll #${pollCount}`
              : 'Live prediction markets · Updated every 2h'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium text-text-secondary
              border border-bg-border rounded hover:border-text-muted hover:text-text-primary
              transition-colors disabled:opacity-40"
          >
            <RefreshIcon className={loading || scanning ? 'animate-spin' : ''} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Mode toggle: ALL MARKETS | AI ANALYSIS ⚡ Pro */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1">
          <button
            onClick={() => setViewMode('markets')}
            className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded transition-colors ${
              viewMode === 'markets'
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            ALL MARKETS
          </button>
          <button
            onClick={() => setViewMode('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold rounded transition-colors ${
              viewMode === 'ai'
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <IconBolt size={12} /> AI ANALYSIS
            {!isPro && (
              <span className="ml-0.5 text-[9px] px-1 py-0.5 bg-accent/10 text-accent/70 rounded font-bold tracking-wider">PRO</span>
            )}
          </button>
        </div>

        {viewMode === 'ai' && isPro && (
          <span className="text-[10px] font-mono text-text-muted/60">
            AI-powered · Claude
          </span>
        )}
      </div>

      {/* Search + Platform filter — shared */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-bg-surface border border-bg-border rounded pl-9 pr-3 py-2 text-sm font-mono
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40
              transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Platform */}
        <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1">
          {PLATFORM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPlatform(opt.value)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                platform === opt.value
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* MARKETS mode filters: category pills + sort */}
      {viewMode === 'markets' && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-colors ${
                  categories.includes(cat)
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-bg-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
            {categories.length > 0 && (
              <button onClick={() => setCategories([])} className="text-[10px] font-mono text-text-muted hover:text-text-secondary">
                CLEAR
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-[10px] font-mono text-text-muted">SORT:</span>
            {MARKETS_SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMarketsSort(opt.value)}
                className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                  marketsSort === opt.value
                    ? 'text-accent border border-accent/30 bg-accent/5'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* EDGE mode filters */}
      {viewMode === 'ai' && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-colors ${
                  categories.includes(cat)
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-bg-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
            {categories.length > 0 && (
              <button onClick={() => setCategories([])} className="text-[10px] font-mono text-text-muted hover:text-text-secondary">
                CLEAR
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-text-muted">HORIZON:</span>
              <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-0.5">
                {HORIZON_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setHorizon(opt.value)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-colors ${
                      horizon === opt.value
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-text-muted">SORT:</span>
              {EDGE_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEdgeSort(opt.value)}
                  className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                    edgeSort === opt.value
                      ? 'text-accent border border-accent/30 bg-accent/5'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setHighConfOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono font-bold transition-colors ${
                highConfOnly
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-bg-border text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${highConfOnly ? 'bg-accent' : 'bg-text-muted'}`} />
              HIGH CONF
            </button>
          </div>
        </>
      )}

      {/* Count row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {viewMode === 'ai' && skippedCount > 0 && (
            <button
              onClick={() => setShowSkipped((v) => !v)}
              className={`text-[10px] font-mono transition-colors ${
                showSkipped ? 'text-text-secondary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {showSkipped ? `HIDE SKIP (${skippedCount})` : `+${skippedCount} SKIP`}
            </button>
          )}
        </div>
        <span className="text-xs font-mono text-text-muted">
          {resultCount} {viewMode === 'markets' ? 'MARKETS' : 'RESULTS'}
          {hasActiveFilters && <span className="text-accent/60"> · filtered</span>}
        </span>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      )}

      {/* Edge scanning indicator */}
      {!loading && viewMode === 'ai' && scanning && edgeItems.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-watch/5 border border-watch/20 rounded-lg">
          <RefreshIcon className="animate-spin text-watch w-3 h-3 shrink-0" />
          <span className="text-xs font-mono text-watch">
            SCANNING — refreshing in 15s (poll #{pollCount})
          </span>
        </div>
      )}

      {!loading && viewMode === 'ai' && scanning && edgeItems.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-bg-surface border border-bg-border rounded-lg">
            <RefreshIcon className="animate-spin w-4 h-4 text-accent" />
            <span className="text-sm font-mono text-text-secondary">SCANNING MARKETS — next check in 15s</span>
          </div>
          <p className="text-xs font-mono text-text-muted mt-3">poll #{pollCount}</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg p-6 text-center">
          <p className="text-sm font-mono text-danger mb-2">CONNECTION ERROR</p>
          <p className="text-xs font-mono text-text-muted mb-4">{error}</p>
          <button
            onClick={() => load(false)}
            className="mt-2 px-4 py-2 text-xs font-mono border border-danger/30 text-danger rounded hover:bg-danger/10 transition-colors"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Empty state — don't show for Free on AI tab (locked state renders instead) */}
      {!loading && !error && resultCount === 0 && !(viewMode === 'ai' && scanning) && !(viewMode === 'ai' && !isPro) && (
        <div className="text-center py-16">
          <p className="text-sm font-mono text-text-muted">
            {viewMode === 'markets' ? 'NO MARKETS FOUND' : 'NO OPPORTUNITIES FOUND'}
          </p>
          {hasActiveFilters && (
            <p className="text-xs font-mono text-text-muted mt-2">Try removing filters</p>
          )}
        </div>
      )}

      {/* MARKETS list */}
      {!loading && !error && viewMode === 'markets' && filteredMarkets.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredMarkets.map((market, i) => (
            <MarketCard
              key={`${market.platform}-${market.id ?? i}`}
              market={market}
              rank={i}
              isPro={isPro}
              onClick={() => navigate(`/market/${slugify(market.question)}`, { state: { item: { market } } })}
              onAnalyze={() => {
                if (isPro) {
                  navigate(`/market/${slugify(market.question)}`, { state: { item: { market } } })
                } else {
                  setShowPaywall(true)
                }
              }}
            />
          ))}
        </div>
      )}

      {/* AI ANALYSIS tab — Free locked state */}
      {!loading && !error && viewMode === 'ai' && !isPro && (
        <div className="relative">
          {/* 3 blurred mock cards */}
          <div className="flex flex-col gap-3 pointer-events-none select-none" style={{ filter: 'blur(4px)', opacity: 0.5 }}>
            {[
              { question: 'Will the Federal Reserve cut interest rates by 50bps before September 2025?', platform: 'Polymarket', yesPrice: 0.34, volume: 2400000 },
              { question: 'Will Bitcoin exceed $120,000 before end of Q2 2025?', platform: 'Kalshi', yesPrice: 0.61, volume: 890000 },
              { question: 'Will Ukraine and Russia reach a ceasefire agreement in 2025?', platform: 'Polymarket', yesPrice: 0.28, volume: 1750000 },
            ].map((m, i) => (
              <div key={i} className="bg-bg-surface border border-bg-border rounded-lg px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent">{m.platform}</span>
                  <div className="w-16 h-3 bg-bg-elevated rounded ml-auto" />
                </div>
                <p className="text-[14px] font-medium text-text-primary leading-snug mb-2.5">{m.question}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-mono font-bold text-accent">YES {Math.round(m.yesPrice * 100)}%</span>
                  <span className="text-[11px] font-mono text-text-muted">VOL {m.volume >= 1e6 ? `$${(m.volume / 1e6).toFixed(1)}M` : `$${(m.volume / 1e3).toFixed(0)}K`}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-accent/30 text-accent ml-auto">+{(Math.random() * 20 + 5).toFixed(0)}pp EDGE</span>
                </div>
              </div>
            ))}
          </div>
          {/* Upgrade overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-base/60 rounded-lg backdrop-blur-[1px]">
            <div className="text-center px-6 py-8 bg-bg-surface border border-accent/20 rounded-xl shadow-lg max-w-sm">
              <div className="mb-3 text-accent"><IconBolt size={28} /></div>
              <h3 className="text-base font-mono font-bold text-text-primary mb-2">AI Analysis is Pro</h3>
              <p className="text-sm font-mono text-text-muted mb-5 leading-relaxed">
                See edge scores, fair value estimates, and AI-generated thesis for every market.
              </p>
              <button
                onClick={() => setShowPaywall(true)}
                className="w-full py-2.5 px-4 bg-accent text-bg-base text-sm font-mono font-bold rounded hover:bg-accent/90 transition-colors"
              >
                Upgrade to Pro →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ANALYSIS list — Pro users */}
      {!loading && !error && viewMode === 'ai' && isPro && filteredEdge.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredEdge.map((item, i) => (
            <EdgeCard
              key={`${item.market.platform}-${i}`}
              item={item}
              rank={i}
              isPro={isPro}
              onPaywall={() => setShowPaywall(true)}
            />
          ))}
        </div>
      )}

      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          analysesToday={profile?.analyses_today ?? 0}
          analysesLimit={3}
        />
      )}
    </div>
  )
}

function slugify(question: string): string {
  return question.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/(^-|-$)/g, '')
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-5 animate-pulse" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-start gap-4">
        <div className="w-6 h-3 bg-bg-elevated rounded mt-1" />
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-4 w-14 bg-bg-elevated rounded" />
            <div className="h-4 w-20 bg-bg-elevated rounded" />
          </div>
          <div className="h-[15px] w-4/5 bg-bg-elevated rounded" />
          <div className="h-[15px] w-2/3 bg-bg-elevated rounded" />
          <div className="flex gap-4 pt-0.5">
            <div className="h-3 w-16 bg-bg-elevated rounded" />
            <div className="h-3 w-24 bg-bg-elevated rounded" />
          </div>
        </div>
        <div className="w-[70px] h-[70px] bg-bg-elevated rounded-xl" />
      </div>
    </div>
  )
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-3 h-3 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
