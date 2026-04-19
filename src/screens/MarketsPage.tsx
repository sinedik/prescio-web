'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

const SOURCE_OPTIONS: { value: FilterPlatform; label: string }[] = [
  { value: 'all', label: 'Все источники' },
  { value: 'polymarket', label: 'Polymarket' },
  { value: 'kalshi', label: 'Kalshi' },
]

const CATEGORY_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'Все' },
  { value: 'POLITICS', label: 'Политика' },
  { value: 'SPORT', label: 'Спорт' },
  { value: 'CRYPTO', label: 'Крипто' },
  { value: 'ECONOMICS', label: 'Экономика' },
  { value: 'SCIENCE_TECH', label: 'Наука' },
  { value: 'ESPORTS', label: 'Киберспорт' },
]

type SortMode = 'edge' | 'volume' | 'resolution' | 'probability'
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'edge', label: 'По Edge' },
  { value: 'volume', label: 'По объёму' },
  { value: 'resolution', label: 'По резолюции' },
  { value: 'probability', label: 'По вероятности' },
]

function isMacLike(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPod|iPad/.test(navigator.platform)
}

function maxAbsEdge(markets: Market[]): number {
  let max = 0
  for (const m of markets) {
    const e = m.ai?.edge
    if (e != null && Math.abs(e) > max) max = Math.abs(e)
  }
  return max
}

function groupVolume(markets: Market[]): number {
  const ev = markets[0]?.event
  if (ev?.total_volume != null) return ev.total_volume
  return markets.reduce((s, m) => s + (m.volume ?? 0), 0)
}

function groupMaxProb(markets: Market[]): number {
  let max = 0
  for (const m of markets) {
    const p = m.yesPrice
    if (p == null) continue
    const pct = p > 1 ? p : p * 100
    if (pct > max) max = pct
  }
  return max
}

function groupNearestResolve(markets: Market[]): number {
  let min = Infinity
  for (const m of markets) {
    if (!m.resolutionDate) continue
    const t = new Date(m.resolutionDate).getTime()
    if (!isNaN(t) && t < min) min = t
  }
  return min
}

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
  const [sort, setSort] = useState<SortMode>('edge')
  const [onlyEdge, setOnlyEdge] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialMarkets?.length ?? 0)

  const analyzingMarketIds = useState(() => getAnalyzingIds('market'))[0]
  const analyzedMarketIds  = useState(() => getAnalyzedIds('market'))[0]

  const searchRef = useRef<HTMLInputElement>(null)
  const [kbdLabel, setKbdLabel] = useState('⌘K')

  useEffect(() => {
    setKbdLabel(isMacLike() ? '⌘K' : 'Ctrl+K')
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const serverSort: 'volume' | 'resolution' = sort === 'volume' ? 'volume' : 'resolution'
  const filterKey = `${platform}|${category ?? ''}|${serverSort}|${debouncedSearch}`
  const lastFilterKey = useRef(filterKey)

  const buildParams = useCallback((targetPage: number) => {
    const params: Record<string, string | number> = { limit: PAGE_SIZE, page: targetPage, sort: serverSort }
    if (platform !== 'all') params.platform = platform
    if (category) params.category = category.toLowerCase()
    if (debouncedSearch) params.q = debouncedSearch
    return params
  }, [platform, category, serverSort, debouncedSearch])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  type Group = { key: string; eventId: string | null; markets: Market[] }

  const groupedAndSorted = useMemo(() => {
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

    const filtered = onlyEdge
      ? groups.filter(g => maxAbsEdge(g.markets) >= 2)
      : groups

    const sorted = [...filtered]
    if (sort === 'edge') {
      sorted.sort((a, b) => {
        const ea = maxAbsEdge(a.markets)
        const eb = maxAbsEdge(b.markets)
        if (eb !== ea) return eb - ea
        return groupVolume(b.markets) - groupVolume(a.markets)
      })
    } else if (sort === 'probability') {
      sorted.sort((a, b) => groupMaxProb(b.markets) - groupMaxProb(a.markets))
    } else if (sort === 'resolution') {
      sorted.sort((a, b) => groupNearestResolve(a.markets) - groupNearestResolve(b.markets))
    } else if (sort === 'volume') {
      sorted.sort((a, b) => groupVolume(b.markets) - groupVolume(a.markets))
    }

    sorted.sort((a, b) => {
      const aAny = a.markets.some(m => analyzingMarketIds.has(m.id ?? ''))
      const bAny = b.markets.some(m => analyzingMarketIds.has(m.id ?? ''))
      if (aAny !== bAny) return aAny ? -1 : 1
      return 0
    })

    return sorted
  }, [rawMarkets, onlyEdge, sort, analyzingMarketIds])

  const hasActiveFilters = platform !== 'all' || search !== '' || category !== null || onlyEdge
  const resultCount = groupedAndSorted.length
  const hasMore = rawMarkets.length < total
  const sortLabel = SORT_OPTIONS.find(s => s.value === sort)?.label ?? 'Сортировка'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-mono font-bold text-text-primary tracking-wider uppercase">
            Markets
          </h1>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">
            Живые маркеты · Цены каждые 5 минут
          </p>
        </div>

        <button
          onClick={() => load(1, false)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono font-medium text-text-secondary
            border border-bg-border rounded hover:border-text-muted hover:text-text-primary
            transition-colors disabled:opacity-40"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">ОБНОВИТЬ</span>
        </button>
      </div>

      <div className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по маркетам..."
          className="w-full bg-bg-surface border border-bg-border rounded-lg pl-9 pr-20 py-2.5 text-[13px] font-mono
            text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40
            transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-text-muted hover:text-text-secondary p-1"
              aria-label="Очистить"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
          <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded border border-bg-border bg-bg-elevated select-none pointer-events-none">
            {kbdLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {CATEGORY_OPTIONS.map((cat) => {
          const active = category === cat.value
          return (
            <button
              key={cat.label}
              onClick={() => setCategory(cat.value)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-full border transition-colors ${
                active
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-bg-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SOURCE_OPTIONS.map((opt) => {
          const active = platform === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setPlatform(opt.value)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-full border transition-colors ${
                active
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-bg-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setOnlyEdge(v => !v)}
          className={`flex items-center gap-2 px-2.5 py-1 text-[11px] font-mono rounded-full border transition-colors ${
            onlyEdge
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-bg-border text-text-muted hover:text-text-secondary hover:border-text-muted/30'
          }`}
        >
          <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${
            onlyEdge ? 'border-accent bg-accent/20' : 'border-bg-border'
          }`}>
            {onlyEdge && (
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6l3 3 5-6" />
              </svg>
            )}
          </span>
          Только с Edge
        </button>

        <div className="relative">
          <button
            onClick={() => setSortOpen(o => !o)}
            onBlur={() => setTimeout(() => setSortOpen(false), 150)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded border border-bg-border
              text-text-secondary hover:text-text-primary hover:border-text-muted/30 transition-colors"
          >
            <span className="text-text-muted">Сортировка:</span> {sortLabel}
            <svg className={`w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5l3 3 3-3" />
            </svg>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-bg-elevated border border-bg-border
              rounded shadow-lg z-10 overflow-hidden">
              {SORT_OPTIONS.map(opt => {
                const active = sort === opt.value
                return (
                  <button
                    key={opt.value}
                    onMouseDown={(e) => { e.preventDefault(); setSort(opt.value); setSortOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                      active ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono text-text-muted">
          {resultCount} {resultCount === 1 ? 'маркет' : 'маркетов'} из {total}
          {hasActiveFilters && <span className="text-accent/60"> · фильтры</span>}
        </span>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <MarketSkeleton key={i} index={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg p-6 text-center">
          <p className="text-sm font-mono text-danger mb-2">Ошибка соединения</p>
          <p className="text-xs font-mono text-text-muted mb-4">{error}</p>
          <button
            onClick={() => load(1, false)}
            className="mt-2 px-4 py-2 text-xs font-mono border border-danger/30 text-danger rounded hover:bg-danger/10 transition-colors"
          >
            ПОВТОРИТЬ
          </button>
        </div>
      )}

      {!loading && !error && resultCount === 0 && (
        <div className="text-center py-16">
          <p className="text-sm font-mono text-text-muted">Ничего не найдено</p>
          {hasActiveFilters && (
            <p className="text-xs font-mono text-text-muted mt-2">Попробуйте убрать фильтры</p>
          )}
        </div>
      )}

      {!loading && !error && groupedAndSorted.length > 0 && (
        <>
        <div className="flex flex-col gap-2">
          {groupedAndSorted.map((g, i) => {
            if (g.markets.length > 1 && g.eventId) {
              return (
                <EventCard
                  key={g.key}
                  markets={g.markets}
                  rank={i}
                  href={`/events/${g.eventId}`}
                  onClick={() => router.push(`/events/${g.eventId}`)}
                />
              )
            }
            const market = g.markets[0]
            const slug = slugify(market.question)
            return (
              <MarketCard
                key={g.key}
                market={market}
                rank={i}
                href={`/market/${slug}`}
                isPro={isPro}
                analyzing={analyzingMarketIds.has(market.id ?? '')}
                analyzed={analyzedMarketIds.has(market.id ?? '')}
                onClick={() => {
                  stashMarketNavItem(slug, { market })
                  router.push(`/market/${slug}`)
                }}
                onAnalyze={() => {
                  if (isPro) {
                    stashMarketNavItem(slug, { market })
                    router.push(`/market/${slug}`)
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
              className="px-6 py-2 text-[11px] font-mono font-bold text-text-secondary border border-bg-border rounded
                hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-40"
            >
              {loadingMore ? 'ЗАГРУЗКА…' : `ЗАГРУЗИТЬ ЕЩЁ (${total - rawMarkets.length})`}
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
