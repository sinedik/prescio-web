'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRouter } from 'next/navigation'
import { stashMarketNavItem } from '../lib/marketNavCache'
import MarketCard from '../components/markets/MarketCard'
import EventCard from '../components/markets/EventCard'
import MarketSkeleton from '../components/markets/MarketSkeleton'
const PaywallModal = dynamic(() => import('../components/PaywallModal'), { ssr: false })
import { api } from '../lib/api'
import type { Market, FilterPlatform } from '../types'
type MarketsResponse = Market[] | { data?: Market[]; markets?: Market[]; pagination?: { page: number; limit: number; total: number } }
const getMarkets = api.getMarkets as (params?: Record<string, string | number>) => Promise<MarketsResponse>
import { useAuthContext } from '../contexts/AuthContext'
import { getAnalyzingIds, getAnalyzedIds } from '../lib/activeAnalyses'

const PAGE_SIZE = 50

function unwrap(res: MarketsResponse): { data: Market[]; total: number } {
  if (Array.isArray(res)) return { data: res, total: res.length }
  const data = res.data ?? res.markets ?? []
  return { data, total: res.pagination?.total ?? data.length }
}

const PLATFORM_OPTIONS: { value: FilterPlatform; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'polymarket', label: 'POLY' },
  { value: 'kalshi', label: 'KALSHI' },
]

const CATEGORY_OPTIONS = ['POLITICS', 'SPORT', 'CRYPTO', 'ESPORTS', 'ECONOMICS', 'SCIENCE_TECH']

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'volume', label: 'VOLUME' },
  { value: 'resolution', label: 'RESOLVES' },
]

type HorizonFilter = 'any' | '24h' | '7d' | '30d'
const HORIZON_OPTIONS: { value: HorizonFilter; label: string }[] = [
  { value: 'any', label: 'ANY' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
]

export default function MarketsPage({ initialMarkets }: { initialMarkets?: Market[] } = {}) {
  usePageTitle('Markets')
  const router = useRouter()
  const { profile } = useAuthContext()
  const isPro = profile?.is_pro ?? false
  const [showPaywall, setShowPaywall] = useState(false)

  const [rawMarkets, setRawMarkets] = useState<Market[]>(initialMarkets ?? [])
  const [loading, setLoading] = useState((initialMarkets?.length ?? 0) === 0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [platform, setPlatform] = useState<FilterPlatform>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState('volume')
  const [horizon, setHorizon] = useState<HorizonFilter>('any')

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialMarkets?.length ?? 0)

  const analyzingMarketIds = useState(() => getAnalyzingIds('market'))[0]
  const analyzedMarketIds  = useState(() => getAnalyzedIds('market'))[0]

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const filterKey = `${platform}|${category ?? ''}|${horizon}|${sort}|${debouncedSearch}`
  const lastFilterKey = useRef(filterKey)

  const buildParams = useCallback((targetPage: number) => {
    const params: Record<string, string | number> = { limit: PAGE_SIZE, page: targetPage, sort }
    if (platform !== 'all') params.platform = platform
    if (category) params.category = category.toLowerCase()
    if (horizon !== 'any') params.horizon = horizon
    if (debouncedSearch) params.q = debouncedSearch
    return params
  }, [platform, category, horizon, sort, debouncedSearch])

  const load = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else if (rawMarkets.length === 0) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const res = await getMarkets(buildParams(targetPage))
      const { data, total } = unwrap(res)
      setRawMarkets(prev => append ? [...prev, ...data] : data)
      setTotal(total)
      setPage(targetPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [buildParams, rawMarkets.length])

  useEffect(() => {
    if (lastFilterKey.current !== filterKey) {
      lastFilterKey.current = filterKey
    }
    load(1, false)
  }, [filterKey, load])

  type Group = { key: string; eventId: string | null; markets: Market[] }
  const groups: Group[] = []
  const eventIndex = new Map<string, number>()
  for (const m of rawMarkets) {
    const evId = m.event?.id ?? null
    if (evId) {
      const existing = eventIndex.get(evId)
      if (existing !== undefined) {
        groups[existing].markets.push(m)
        continue
      }
      eventIndex.set(evId, groups.length)
      groups.push({ key: `ev-${evId}`, eventId: evId, markets: [m] })
    } else {
      groups.push({ key: `m-${m.id ?? m.question}`, eventId: null, markets: [m] })
    }
  }

  // Keep original order from server (already sorted there); only bubble analyzing to top.
  const sortedGroups = groups.sort((a, b) => {
    const aAny = a.markets.some(m => analyzingMarketIds.has(m.id ?? ''))
    const bAny = b.markets.some(m => analyzingMarketIds.has(m.id ?? ''))
    if (aAny !== bAny) return aAny ? -1 : 1
    return 0
  })

  const hasActiveFilters = platform !== 'all' || search !== '' || category !== null || horizon !== 'any'
  const resultCount = sortedGroups.length
  const hasMore = rawMarkets.length < total

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">
            MARKETS
          </h1>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            Live prediction markets · Prices every 5m
          </p>
        </div>

        <button
          onClick={() => load(1, false)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium text-text-secondary
            border border-bg-border rounded hover:border-text-muted hover:text-text-primary
            transition-colors disabled:opacity-40"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">REFRESH</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
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

        <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 overflow-x-auto scrollbar-hide">
          {PLATFORM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPlatform(opt.value)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-colors shrink-0 ${
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

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(prev => prev === cat ? null : cat)}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-colors ${
              category === cat
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-bg-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
        {category && (
          <button onClick={() => setCategory(null)} className="text-[10px] font-mono text-text-muted hover:text-text-secondary">
            CLEAR
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted">RESOLVES:</span>
        {HORIZON_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setHorizon(opt.value)}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
              horizon === opt.value
                ? 'text-accent border border-accent/30 bg-accent/5'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted">SORT:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
              sort === opt.value
                ? 'text-accent border border-accent/30 bg-accent/5'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end mb-5">
        <span className="text-xs font-mono text-text-muted">
          {resultCount} {resultCount === 1 ? 'GROUP' : 'GROUPS'} · {total} MARKETS
          {hasActiveFilters && <span className="text-accent/60"> · filtered</span>}
        </span>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <MarketSkeleton key={i} index={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg p-6 text-center">
          <p className="text-sm font-mono text-danger mb-2">CONNECTION ERROR</p>
          <p className="text-xs font-mono text-text-muted mb-4">{error}</p>
          <button
            onClick={() => load(1, false)}
            className="mt-2 px-4 py-2 text-xs font-mono border border-danger/30 text-danger rounded hover:bg-danger/10 transition-colors"
          >
            RETRY
          </button>
        </div>
      )}

      {!loading && !error && resultCount === 0 && (
        <div className="text-center py-16">
          <p className="text-sm font-mono text-text-muted">NO MARKETS FOUND</p>
          {hasActiveFilters && (
            <p className="text-xs font-mono text-text-muted mt-2">Try removing filters</p>
          )}
        </div>
      )}

      {!loading && !error && sortedGroups.length > 0 && (
        <>
        <div className="flex flex-col gap-3">
          {sortedGroups.map((g, i) => {
            if (g.markets.length > 1 && g.eventId) {
              return (
                <EventCard
                  key={g.key}
                  markets={g.markets}
                  rank={i}
                  onClick={() => router.push(`/events/${g.eventId}`)}
                />
              )
            }
            const market = g.markets[0]
            return (
              <MarketCard
                key={g.key}
                market={market}
                rank={i}
                isPro={isPro}
                analyzing={analyzingMarketIds.has(market.id ?? '')}
                analyzed={analyzedMarketIds.has(market.id ?? '')}
                onClick={() => {
                  const s = slugify(market.question)
                  stashMarketNavItem(s, { market })
                  router.push(`/market/${s}`)
                }}
                onAnalyze={() => {
                  if (isPro) {
                    const s = slugify(market.question)
                    stashMarketNavItem(s, { market })
                    router.push(`/market/${s}`)
                  } else {
                    setShowPaywall(true)
                  }
                }}
              />
            )
          })}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => load(page + 1, true)}
              disabled={loadingMore}
              className="px-6 py-2 text-xs font-mono font-bold text-text-secondary border border-bg-border rounded
                hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-40"
            >
              {loadingMore ? 'LOADING…' : `LOAD MORE (${total - rawMarkets.length} left)`}
            </button>
          </div>
        )}
        </>
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
