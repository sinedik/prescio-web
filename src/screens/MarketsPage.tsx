'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRouter } from 'next/navigation'
import { stashMarketNavItem } from '../lib/marketNavCache'
import MarketCard from '../components/markets/MarketCard'
import MarketSkeleton from '../components/markets/MarketSkeleton'
const PaywallModal = dynamic(() => import('../components/PaywallModal'), { ssr: false })
import { api } from '../lib/api'
import type { Market, FilterPlatform } from '../types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMarkets = api.getMarkets as (params?: Record<string, string | number>) => Promise<any>
import { useAuthContext } from '../contexts/AuthContext'
import { getAnalyzingIds, getAnalyzedIds } from '../lib/activeAnalyses'

const PLATFORM_OPTIONS: { value: FilterPlatform; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'polymarket', label: 'POLY' },
  { value: 'kalshi', label: 'KALSHI' },
  { value: 'grid', label: 'ESPORTS' },
]

const CATEGORY_OPTIONS = ['GEOPOLITICS', 'CRYPTO', 'ELECTIONS', 'US_POLITICS', 'POLICY', 'ESPORTS']

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'volume', label: 'VOLUME' },
  { value: 'resolution', label: 'RESOLVES' },
  { value: 'category', label: 'CATEGORY' },
]

const moduleCache = {
  markets: [] as Market[],
  marketsAt: 0,
  TTL: 60 * 1000,
}

export default function MarketsPage({ initialMarkets }: { initialMarkets?: Market[] } = {}) {
  usePageTitle('Markets')
  const router = useRouter()
  const { profile } = useAuthContext()
  const isPro = profile?.is_pro ?? false
  const [showPaywall, setShowPaywall] = useState(false)

  if (initialMarkets && initialMarkets.length > 0 && moduleCache.markets.length === 0) {
    moduleCache.markets = initialMarkets
    moduleCache.marketsAt = Date.now()
  }

  const [rawMarkets, setRawMarkets] = useState<Market[]>(moduleCache.markets)
  const [loading, setLoading] = useState(moduleCache.markets.length === 0)
  const [error, setError] = useState<string | null>(null)

  const [platform, setPlatform] = useState<FilterPlatform>('all')
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [sort, setSort] = useState('volume')

  const analyzingMarketIds = useState(() => getAnalyzingIds('market'))[0]
  const analyzedMarketIds  = useState(() => getAnalyzedIds('market'))[0]

  const load = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    const cached = !forceRefresh && moduleCache.markets.length > 0 && (now - moduleCache.marketsAt) < moduleCache.TTL
    if (cached) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = { limit: 50 }
      if (platform !== 'all') params.platform = platform
      if (platform === 'grid') params.sort = 'resolution'
      const markets = await getMarkets(params)
      moduleCache.markets = markets
      moduleCache.marketsAt = Date.now()
      setRawMarkets(markets)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [platform])

  useEffect(() => {
    load()
  }, [load])

  const filteredMarkets = rawMarkets
    .filter((m) => {
      if (platform !== 'all' && !m.platform?.toLowerCase().includes(platform.toLowerCase())) return false
      if (categories.length > 0 && !categories.includes((m.category ?? '').toUpperCase())) return false
      if (search && !m.question.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const aAna = analyzingMarketIds.has(a.id ?? '')
      const bAna = analyzingMarketIds.has(b.id ?? '')
      if (aAna !== bAna) return aAna ? -1 : 1
      if (sort === 'volume') return (b.volume ?? 0) - (a.volume ?? 0)
      if (sort === 'resolution') {
        const da = a.resolutionDate ? new Date(a.resolutionDate).getTime() : Infinity
        const db = b.resolutionDate ? new Date(b.resolutionDate).getTime() : Infinity
        return da - db
      }
      if (sort === 'category') return (a.category ?? '').localeCompare(b.category ?? '')
      return 0
    })

  const hasActiveFilters = platform !== 'all' || search !== '' || categories.length > 0
  const resultCount = filteredMarkets.length

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">
            MARKETS
          </h1>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            Live prediction markets · Updated every 2h
          </p>
        </div>

        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-medium text-text-secondary
            border border-bg-border rounded hover:border-text-muted hover:text-text-primary
            transition-colors disabled:opacity-40"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
          REFRESH
        </button>
      </div>

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
          {resultCount} MARKETS
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
            onClick={() => load()}
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

      {!loading && !error && filteredMarkets.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredMarkets.map((market, i) => (
            <MarketCard
              key={`${market.platform}-${market.id ?? i}`}
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
