'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useParams, useRouter } from 'next/navigation'
import type { Market, Analysis, MarketOpportunity, NewsItem, MetaculusMatch } from '../types'
import {
  formatProb, formatEdge, formatVolume, daysUntil,
} from '../utils'
import dynamic from 'next/dynamic'
const PaywallModal = dynamic(() => import('../components/PaywallModal'), { ssr: false })
import { api } from '../lib/api'
import { analyzeMarketAction } from '../actions/analyze'
import { useAuthContext } from '../contexts/AuthContext'
import AnalysisLoader from '../AnalysisLoader'
import { markAnalyzing, clearAnalyzing, isAnalyzing, markAnalyzed } from '../lib/activeAnalyses'
import { MARKET_CACHE_PREFIX } from '../lib/marketNavCache'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { SourceBadge } from '../components/feed/SourceBadge'
import { Breadcrumbs } from '../components/Breadcrumbs'

const CATEGORY_LABELS: Record<string, string> = {
  POLITICS: 'Политика',
  US_POLITICS: 'Политика США',
  GEOPOLITICS: 'Геополитика',
  ELECTIONS: 'Выборы',
  POLICY: 'Политика',
  SPORT: 'Спорт',
  SPORTS: 'Спорт',
  CRYPTO: 'Крипто',
  ESPORTS: 'Киберспорт',
  ECONOMICS: 'Экономика',
  SCIENCE_TECH: 'Наука',
}

function catLabel(cat?: string | null): string | null {
  if (!cat) return null
  const k = cat.toUpperCase()
  return CATEGORY_LABELS[k] ?? k.replace(/_/g, ' ').toLowerCase()
}

function resolutionLabel(date: string | undefined, days: number | null): { text: string; tone: 'danger' | 'warning' | 'muted' } | null {
  if (!date || days === null) return null
  if (days <= 0) return { text: 'Резолв сегодня', tone: 'danger' }
  if (days <= 3) return { text: `Резолв через ${days}д`, tone: 'danger' }
  if (days <= 7) return { text: `Резолв через ${days}д`, tone: 'warning' }
  const d = new Date(date)
  const fmt = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
  return { text: `Резолв ${fmt} · ${days}д`, tone: 'muted' }
}

// ---- Interactive SVG Price Chart ----
interface HistoryPoint { t: number; p: number }

function PriceChart({ history, loading }: {
  history: HistoryPoint[]
  loading?: boolean
}) {
  const { lang } = useLang()
  const t = useT(lang)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; pt: HistoryPoint } | null>(null)

  const W = 600, H = 140
  const pad = { left: 36, right: 12, top: 12, bot: 24 }
  const iW = W - pad.left - pad.right
  const iH = H - pad.top - pad.bot

  const pts = useCallback(() => {
    if (!history || history.length < 2) return []
    return history.map(h => ({ t: h.t, p: h.p > 1 ? h.p : h.p * 100 }))
  }, [history])()

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || pts.length < 2) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const chartX = Math.max(pad.left, Math.min(W - pad.right, svgX))
    const frac = (chartX - pad.left) / iW

    const minT = pts[0].t, maxT = pts[pts.length - 1].t
    const tRange = maxT - minT || 1
    const targetT = minT + frac * tRange

    let lo = 0, hi = pts.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (pts[mid].t < targetT) lo = mid + 1
      else hi = mid
    }
    const pt = pts[lo] || pts[pts.length - 1]

    const prices = pts.map(p => p.p)
    const minP = Math.min(...prices) - 2
    const maxP = Math.max(...prices) + 2
    const range = maxP - minP || 1

    const x = pad.left + ((pt.t - minT) / tRange) * iW
    const y = pad.top + iH - ((pt.p - minP) / range) * iH
    setHover({ x, y, pt })
  }, [pts, iW, iH, pad])

  if (loading) return <div className="w-full bg-bg-elevated rounded animate-pulse" style={{ height: 160 }} />

  if (pts.length < 2) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-2" style={{ height: 160 }}>
        <svg className="w-8 h-8 text-text-muted/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 17l6-6 4 4 8-8" />
        </svg>
        <p className="text-xs font-mono text-text-muted">{t('markets.no_price_history')}</p>
      </div>
    )
  }

  const prices = pts.map(p => p.p)
  const minP = Math.min(...prices) - 2
  const maxP = Math.max(...prices) + 2
  const range = maxP - minP || 1
  const minT = pts[0].t, maxT = pts[pts.length - 1].t
  const tRange = maxT - minT || 1

  const toX = (t: number) => pad.left + ((t - minT) / tRange) * iW
  const toY = (p: number) => pad.top + iH - ((p - minP) / range) * iH

  const first = pts[0], last = pts[pts.length - 1]
  const isUp = last.p >= first.p
  const color = isUp ? 'rgb(var(--accent))' : 'rgb(var(--danger))'
  const change = last.p - first.p
  const changePct = Math.abs(change).toFixed(1)

  const linePts = pts.map(h => `${toX(h.t).toFixed(1)},${toY(h.p).toFixed(1)}`).join(' ')
  const areaPath =
    `M ${toX(first.t).toFixed(1)},${toY(first.p).toFixed(1)} ` +
    pts.slice(1).map(h => `L ${toX(h.t).toFixed(1)},${toY(h.p).toFixed(1)}`).join(' ') +
    ` L ${toX(last.t).toFixed(1)},${(pad.top + iH).toFixed(1)} L ${pad.left},${(pad.top + iH).toFixed(1)} Z`

  const yTicks = [0, 25, 50, 75, 100].filter(v => v >= minP - 5 && v <= maxP + 5)

  const xTicks = [0, 0.33, 0.66, 1].map(f => ({
    x: pad.left + f * iW,
    label: new Date((minT + f * tRange) * 1000).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }).replace('.', ''),
  }))

  const tooltipOnLeft = hover && hover.x > W * 0.65

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[24px] font-mono font-bold text-text-primary leading-none">
          {hover ? `${Math.round(hover.pt.p)}%` : `${Math.round(last.p)}%`}
        </span>
        <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-accent' : 'text-danger'}`}>
          {change >= 0 ? '+' : '-'}{changePct}pp
        </span>
        {hover && (
          <span className="text-[11px] font-mono text-text-muted">
            {new Date(hover.pt.t * 1000).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric' }).replace('.', '')}
            {' · '}
            {new Date(hover.pt.t * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair select-none"
        style={{ height: H }}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={pad.left} y={pad.top} width={iW} height={iH} />
          </clipPath>
        </defs>

        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={pad.left} y1={toY(v).toFixed(1)}
              x2={W - pad.right} y2={toY(v).toFixed(1)}
              stroke="rgb(var(--bg-border))" strokeWidth="0.5" strokeDasharray="3,3"
            />
            <text
              x={pad.left - 4} y={(toY(v) + 3).toFixed(1)}
              textAnchor="end" fontSize="9" fill="rgb(var(--text-muted))" fontFamily="monospace"
            >
              {v}%
            </text>
          </g>
        ))}

        <g clipPath="url(#chartClip)">
          <path d={areaPath} fill="url(#chartGrad)" />
          <polyline points={linePts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        </g>

        <circle cx={toX(last.t).toFixed(1)} cy={toY(last.p).toFixed(1)} r="3.5" fill={color} />

        {hover && (
          <g>
            <line
              x1={hover.x.toFixed(1)} y1={pad.top}
              x2={hover.x.toFixed(1)} y2={pad.top + iH}
              stroke="rgb(var(--text-muted))" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1={pad.left} y1={hover.y.toFixed(1)}
              x2={W - pad.right} y2={hover.y.toFixed(1)}
              stroke="rgb(var(--text-muted))" strokeWidth="0.5" strokeDasharray="3,3"
            />
            <circle cx={hover.x.toFixed(1)} cy={hover.y.toFixed(1)} r="4" fill={color} stroke="rgb(var(--bg-base))" strokeWidth="1.5" />

            <g transform={`translate(${tooltipOnLeft ? hover.x - 88 : hover.x + 8}, ${Math.max(pad.top, hover.y - 22)})`}>
              <rect x="0" y="0" width="80" height="32" rx="4" fill="rgb(var(--bg-elevated))" stroke="rgb(var(--bg-border))" strokeWidth="1" />
              <text x="8" y="13" fontSize="11" fill={color} fontFamily="monospace" fontWeight="bold">
                {Math.round(hover.pt.p)}%
              </text>
              <text x="8" y="26" fontSize="9" fill="rgb(var(--text-muted))" fontFamily="monospace">
                {new Date(hover.pt.t * 1000).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }).replace('.', '')}
              </text>
            </g>
          </g>
        )}

        {xTicks.map((tk, i) => (
          <text
            key={i}
            x={tk.x.toFixed(1)} y={H - 4}
            textAnchor="middle" fontSize="9" fill="rgb(var(--text-muted))" fontFamily="monospace"
          >
            {tk.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

function liquidityTier(level?: string): { tier: 'high' | 'medium' | 'low'; label: string; tone: 'accent' | 'watch' | 'danger' } {
  const l = (level ?? 'low').toLowerCase()
  if (l === 'high') return { tier: 'high', label: 'Высокая', tone: 'accent' }
  if (l === 'medium') return { tier: 'medium', label: 'Средняя', tone: 'watch' }
  return { tier: 'low', label: 'Низкая', tone: 'danger' }
}

function slugify(q: string) {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/(^-|-$)/g, '')
}

function filterHistory(pts: HistoryPoint[], interval: '1w' | '1m' | '6m' | 'max'): HistoryPoint[] {
  if (interval === 'max' || !pts.length) return pts
  const now = Date.now() / 1000
  const days = interval === '1w' ? 7 : interval === '1m' ? 30 : 180
  const cutoff = now - days * 86400
  const filtered = pts.filter(p => p.t >= cutoff)
  return filtered.length > 1 ? filtered : pts
}

export default function MarketDetailPage() {
  const router = useRouter()
  const params = useParams<{ slug?: string; id?: string }>()
  const slug = (params?.slug ?? params?.id) as string | undefined
  const { lang } = useLang()
  const t = useT(lang)

  const [market, setMarket] = useState<Market | undefined>(undefined)

  usePageTitle(market?.question ?? '')
  const [analysis, setAnalysis] = useState<Analysis | undefined>(undefined)
  const [news, setNews] = useState<NewsItem[] | undefined>(undefined)
  const [metaculusMatch, setMetaculusMatch] = useState<MetaculusMatch | undefined>(undefined)

  const [marketLoading, setMarketLoading] = useState(true)
  const [freshLoading, setFreshLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyInterval, setHistoryInterval] = useState<'1w' | '1m' | '6m' | 'max'>('max')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const userTriggeredAnalysis = useRef(false)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [historyReal, setHistoryReal] = useState(false)
  const [siblings, setSiblings] = useState<{ id: string; question: string; price: number; no_price?: number; volume?: number; resolution_date?: string; slug?: string }[]>([])
  const [resOpen, setResOpen] = useState(false)

  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallVariant, setPaywallVariant] = useState<'pro' | 'alpha'>('pro')
  const { isPro, isAlpha } = useAuthContext()

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    let stateItem: Partial<MarketOpportunity> | undefined
    try {
      const raw = sessionStorage.getItem(MARKET_CACHE_PREFIX + slug)
      if (raw) stateItem = JSON.parse(raw) as Partial<MarketOpportunity>
    } catch {
      stateItem = undefined
    }
    if (stateItem?.market) {
      const key = MARKET_CACHE_PREFIX + slugify(stateItem.market.question)
      sessionStorage.setItem(key, JSON.stringify(stateItem))
      if (!cancelled) {
        setMarket(stateItem.market)
        setAnalysis(stateItem.analysis)
        setNews(stateItem.news)
        setMetaculusMatch(stateItem.metaculusMatch ?? undefined)
        setMarketLoading(false)
      }
    } else {
      const key = MARKET_CACHE_PREFIX + slug
      const cached = sessionStorage.getItem(key)
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Partial<MarketOpportunity>
          if (!cancelled) {
            setMarket(parsed.market)
            setAnalysis(parsed.analysis)
            setNews(parsed.news)
            setMetaculusMatch(parsed.metaculusMatch ?? undefined)
            setMarketLoading(false)
          }
        } catch { /* ignore */ }
      }
    }

    ;(async () => {
      try {
        const initial = stateItem?.market
        let marketId = initial?.id

        if (!marketId) {
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (UUID_RE.test(slug)) marketId = slug
        }

        if (!marketId) {
          const results = await api.getMarkets({ limit: 50 })
          const raw = Array.isArray(results)
            ? results
            : ((results as { data?: unknown[]; markets?: unknown[] }).data
              ?? (results as { data?: unknown[]; markets?: unknown[] }).markets
              ?? [])
          const list = raw as (Market & { analysis?: Analysis })[]
          const found = list.find(m => {
            const s = m.question?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            return s === slug || m.slug === slug
          }) ?? list[0]
          if (found) {
            marketId = found.id
            if (!cancelled) {
              setMarket(found as Market)
              if ((found as Market & { analysis?: Analysis }).analysis) setAnalysis((found as Market & { analysis?: Analysis }).analysis)
              setMarketLoading(false)
            }
          }
        }

        if (!marketId || cancelled) return

        const fresh = await api.getMarket(marketId) as Market & { analysis?: Analysis; price_history?: HistoryPoint[]; siblings?: { id: string; question: string; price: number; resolution_date?: string; slug?: string }[] }
        if (!cancelled && fresh) {
          setMarket(fresh)
          if (fresh.analysis) {
            setAnalysis(fresh.analysis)
            markAnalyzed('market', marketId)
            clearAnalyzing('market', marketId)
          } else if (isAnalyzing('market', marketId)) {
            setAnalyzing(true)
            ;(async () => {
              for (let i = 0; i < 12; i++) {
                await new Promise(r => setTimeout(r, 10000))
                if (cancelled) break
                try {
                  const polled = await api.getMarket(marketId) as Market & { analysis?: Analysis }
                  if (polled?.analysis) {
                    if (!cancelled) {
                      setAnalysis(polled.analysis)
                      markAnalyzed('market', marketId)
                      clearAnalyzing('market', marketId)
                      setAnalyzing(false)
                      const k = MARKET_CACHE_PREFIX + slug
                      sessionStorage.setItem(k, JSON.stringify({ market: polled, analysis: polled.analysis }))
                    }
                    return
                  }
                } catch { /* continue */ }
              }
              if (!cancelled) {
                clearAnalyzing('market', marketId)
                setAnalyzing(false)
              }
            })()
          }
          if (fresh.price_history?.length) {
            setHistory(fresh.price_history)
            setHistoryReal(true)
            setHistoryLoading(false)
          } else {
            setHistoryLoading(false)
          }
          if (fresh.siblings) setSiblings(fresh.siblings)
          const key = MARKET_CACHE_PREFIX + slug
          const prevStr = sessionStorage.getItem(key)
          const prevAnalysis = prevStr ? (JSON.parse(prevStr) as { analysis?: Analysis }).analysis : undefined
          sessionStorage.setItem(key, JSON.stringify({ market: fresh, analysis: fresh.analysis ?? prevAnalysis }))
          setMarketLoading(false)
        }
        if (!cancelled) setFreshLoading(false)
      } catch {
        if (!cancelled) {
          setHistoryLoading(false)
          setFreshLoading(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    const fullHistory = (market as (Market & { price_history?: HistoryPoint[] }) | undefined)?.price_history
    if (!fullHistory?.length) return
    const filtered = filterHistory(fullHistory, historyInterval)
    setHistory(filtered)
    setHistoryReal(filtered.length > 1)
    setHistoryLoading(false)
  }, [market, historyInterval])

  async function handleAnalyze() {
    if (!market) return
    userTriggeredAnalysis.current = true
    setAnalyzing(true)
    setAnalyzeError(null)
    const marketId = market.id!
    markAnalyzing('market', marketId)
    try {
      const marketQuestion = market.question!
      const result = await analyzeMarketAction(marketId) as Record<string, unknown>

      const pollForAnalysis = async () => {
        const MAX_ATTEMPTS = 12
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          await new Promise(r => setTimeout(r, 10000))
          const fresh = await api.getMarket(marketId) as Market & { analysis?: Analysis }
          if (fresh?.analysis) {
            setAnalysis(fresh.analysis)
            setMarket(prev => prev ? { ...prev } : prev)
            markAnalyzed('market', marketId)
            const key = MARKET_CACHE_PREFIX + slugify(marketQuestion)
            sessionStorage.setItem(key, JSON.stringify({ market: fresh, analysis: fresh.analysis, news, metaculusMatch }))
            setAnalyzing(false)
            return true
          }
        }
        return false
      }

      if (result.analysis) {
        const [fresh] = await Promise.all([
          api.getMarket(marketId) as Promise<Market & { analysis?: Analysis }>,
          new Promise(r => setTimeout(r, 20000)),
        ])
        if (fresh?.analysis) {
          setAnalysis(fresh.analysis)
          const key = MARKET_CACHE_PREFIX + slugify(marketQuestion)
          sessionStorage.setItem(key, JSON.stringify({ market: fresh, analysis: fresh.analysis, news, metaculusMatch }))
        } else {
          setAnalysis(result.analysis as Analysis)
        }
        setAnalyzing(false)
        return
      }

      if (result.queued) {
        const found = await pollForAnalysis()
        if (!found) setAnalyzeError('Анализ занимает дольше обычного. Обновите страницу через минуту.')
      }
    } catch (err: unknown) {
      const e = err as { type?: string; limit?: number }
      if (e?.type === 'limit_reached') {
        setAnalyzeError(`Дневной лимит исчерпан (${e.limit ?? 3} анализа/день). Pro — безлимит.`)
      } else {
        setAnalyzeError(err instanceof Error ? err.message : 'Анализ не удался')
      }
    } finally {
      clearAnalyzing('market', marketId)
      setAnalyzing(false)
      userTriggeredAnalysis.current = false
    }
  }

  if (marketLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 animate-pulse">
        <div className="h-3 w-48 bg-bg-elevated rounded mb-4" />
        <div className="bg-bg-surface border border-bg-border rounded-lg p-5 mb-4 space-y-3">
          <div className="flex gap-2"><div className="h-4 w-20 bg-bg-elevated rounded" /><div className="h-4 w-16 bg-bg-elevated rounded" /></div>
          <div className="h-5 w-4/5 bg-bg-elevated rounded" />
          <div className="h-3 w-2/3 bg-bg-elevated rounded" />
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-bg-elevated rounded" />)}
          </div>
        </div>
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
          <div className="h-3 w-24 bg-bg-elevated rounded mb-3" />
          <div className="h-40 bg-bg-elevated rounded" />
        </div>
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4 space-y-3">
          <div className="h-3 w-20 bg-bg-elevated rounded" />
          <div className="h-4 w-1/2 bg-bg-elevated rounded" />
          <div className="h-3 w-full bg-bg-elevated rounded" />
          <div className="h-3 w-5/6 bg-bg-elevated rounded" />
        </div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm font-mono text-text-muted">Маркет не найден</p>
        <button onClick={() => router.push('/markets')}
          className="px-4 py-2 text-xs font-mono border border-bg-border text-text-secondary rounded hover:border-text-muted transition-colors">
          К списку маркетов
        </button>
      </div>
    )
  }

  const days = daysUntil(market.resolutionDate)
  const prob = market.yesPrice != null
    ? (market.yesPrice > 1 ? market.yesPrice : market.yesPrice * 100)
    : (analysis?.marketProb ?? null)
  const noProb = market.noPrice != null
    ? (market.noPrice > 1 ? market.noPrice : market.noPrice * 100)
    : prob != null ? (100 - prob) : null
  const confScore = analysis
    ? (typeof analysis.confidenceScore === 'number' ? analysis.confidenceScore
      : analysis.confidence === 'high' ? 75
      : analysis.confidence === 'medium' ? 50 : 25)
    : null
  const confBarColor = confScore != null
    ? confScore >= 70 ? 'bg-accent' : confScore >= 40 ? 'bg-watch' : 'bg-text-muted'
    : 'bg-text-muted'

  const liq = liquidityTier(analysis?.liquidity)
  const liqToneCls = liq.tone === 'accent'
    ? 'text-accent border-accent/30 bg-accent/5'
    : liq.tone === 'watch'
    ? 'text-watch border-watch/30 bg-watch/5'
    : 'text-danger border-danger/30 bg-danger/5'

  const resInfo = resolutionLabel(market.resolutionDate, days)
  const resInfoCls = !resInfo ? '' :
    resInfo.tone === 'danger' ? 'text-danger'
    : resInfo.tone === 'warning' ? 'text-watch'
    : 'text-text-muted'

  const categoryText = catLabel(analysis?.category ?? market.category)

  const crumbs: { label: string; href?: string }[] = [
    { label: 'Маркеты', href: '/markets' },
  ]
  if (categoryText) crumbs.push({ label: categoryText })
  if (market.event?.title) {
    const tokenize = (s: string) => new Set(
      s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length >= 3)
    )
    const evWords = tokenize(market.event.title)
    const qWords = tokenize(market.question)
    let overlap = 0
    evWords.forEach(w => { if (qWords.has(w)) overlap++ })
    const ratio = evWords.size > 0 ? overlap / evWords.size : 0
    if (ratio < 0.7) {
      crumbs.push({ label: market.event.title, href: `/events/${market.event.id}` })
    }
  }
  crumbs.push({ label: market.question })
  while (crumbs.length > 3) crumbs.splice(1, 1)

  const actionVal = (analysis?.action ?? '').toUpperCase()
  const actionBannerCfg =
    actionVal.includes('BUY') || actionVal.includes('YES') || actionVal.includes('ENTER')
      ? { label: actionVal || 'BUY YES', banner: 'bg-accent/10 border-accent/30 text-accent' }
    : actionVal.includes('SELL') || (actionVal.includes('NO') && !actionVal.includes('KNOW'))
      ? { label: actionVal || 'SELL', banner: 'bg-danger/10 border-danger/30 text-danger' }
    : actionVal.includes('SKIP') || actionVal.includes('PASS')
      ? { label: actionVal || 'SKIP', banner: 'bg-bg-elevated border-bg-border text-text-secondary' }
    : actionVal.includes('WATCH')
      ? { label: actionVal, banner: 'bg-watch/10 border-watch/30 text-watch' }
    : { label: actionVal || 'HOLD', banner: 'bg-bg-elevated border-bg-border text-text-secondary' }

  const hintEdge = market.ai?.edge ?? null
  const hintFair = market.ai?.fairProb ?? null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumbs items={crumbs} />

      {/* ── HERO ── */}
      <div className="bg-bg-surface border border-bg-border rounded-lg p-5 mb-4">
        {/* Meta bar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SourceBadge source={market.platform.toLowerCase()} size="md" />
          {resInfo && (
            <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${resInfoCls}`}>
              {resInfo.text}
            </span>
          )}
          {market.url && (
            <a href={market.url} target="_blank" rel="noopener noreferrer"
              className="ml-auto text-[10px] font-mono text-text-muted hover:text-accent transition-colors uppercase tracking-wider">
              Открыть рынок →
            </a>
          )}
        </div>

        {/* Title */}
        <h1 className="text-[16px] font-semibold text-text-primary leading-snug mb-3">
          {market.question}
        </h1>

        {/* Resolution criteria preview */}
        {market.resolutionCriteria && (
          <p className="text-[12px] font-mono text-text-muted leading-relaxed mb-4 line-clamp-2">
            {market.resolutionCriteria}
            {market.resolutionCriteria.length > 140 && (
              <>
                {' '}
                <button
                  onClick={(e) => { e.preventDefault(); setResOpen(true); document.getElementById('resolution-details')?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="text-accent hover:underline"
                >
                  Подробнее
                </button>
              </>
            )}
          </p>
        )}

        {/* 3 metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-bg-elevated border border-accent/30 rounded-lg p-3">
            <p className="text-[9px] font-mono text-text-muted mb-1.5 tracking-wider uppercase">Рыночная цена</p>
            <p className="text-[22px] font-mono font-bold text-accent leading-none">
              {prob != null ? `${Math.round(prob)}%` : '—'}
            </p>
            <p className="text-[10px] font-mono text-text-muted mt-1.5">
              {noProb != null ? `YES / NO ${Math.round(noProb)}%` : 'Текущая YES'}
            </p>
          </div>

          <div className="bg-bg-elevated border border-bg-border rounded-lg p-3">
            <p className="text-[9px] font-mono text-text-muted mb-1.5 tracking-wider uppercase">Объём</p>
            <p className="text-[22px] font-mono font-bold text-text-primary leading-none">
              {formatVolume(market.volume)}
            </p>
            <p className="text-[10px] font-mono text-text-muted mt-1.5">Всего торгов</p>
          </div>

          <div className={`bg-bg-elevated rounded-lg p-3 border ${liqToneCls.split(' ').filter(c => c.startsWith('border-')).join(' ')}`}>
            <p className="text-[9px] font-mono text-text-muted mb-1.5 tracking-wider uppercase">Ликвидность</p>
            <div className="flex items-end gap-2">
              <p className={`text-[22px] font-mono font-bold leading-none ${liqToneCls.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                {liq.label}
              </p>
              <div className="inline-flex items-end gap-0.5 pb-1">
                {[1, 2, 3].map(n => {
                  const active = (liq.tier === 'high' ? 3 : liq.tier === 'medium' ? 2 : 1) >= n
                  return (
                    <div
                      key={n}
                      className={`w-1.5 rounded-sm ${active ? liqToneCls.split(' ').filter(c => c.startsWith('text-')).map(c => c.replace('text-', 'bg-')).join(' ') : 'bg-bg-border'}`}
                      style={{ height: `${n * 4 + 4}px` }}
                    />
                  )
                })}
              </div>
            </div>
            <p className="text-[10px] font-mono text-text-muted mt-1.5">
              {market.liquidity != null ? formatVolume(market.liquidity) : 'Сигнал рынка'}
            </p>
          </div>
        </div>
      </div>

      {/* ── PRICE HISTORY ── */}
      {((market as Market & { price_history?: HistoryPoint[] }).price_history?.length ?? 0) > 0 && (
      <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-[11px] font-mono font-bold text-text-muted tracking-widest uppercase">История цены</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {([['1w', '1Н'], ['1m', '1М'], ['6m', '6М'], ['max', 'MAX']] as const).map(([iv, lbl]) => (
                <button
                  key={iv}
                  onClick={() => setHistoryInterval(iv)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                    historyInterval === iv
                      ? 'text-accent bg-accent/10'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <span className={`text-[10px] font-mono ${
              historyLoading ? 'text-text-muted animate-pulse' :
              historyReal ? 'text-accent/70' : 'text-text-muted'
            }`}>
              {historyLoading ? 'ЗАГРУЗКА...' : historyReal ? '● LIVE' : 'НЕТ ДАННЫХ'}
            </span>
          </div>
        </div>

        <PriceChart history={history} loading={historyLoading} />
      </div>
      )}

      {/* ── AI ANALYSIS ── */}

      {freshLoading && !analyzing && !analysis && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4 animate-pulse space-y-3">
          <div className="h-2.5 w-20 bg-bg-elevated rounded" />
          <div className="h-4 w-1/2 bg-bg-elevated rounded" />
          <div className="h-3 w-full bg-bg-elevated rounded" />
          <div className="h-3 w-4/5 bg-bg-elevated rounded" />
        </div>
      )}

      {analyzing && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-mono font-bold text-text-muted tracking-widest uppercase">AI анализ</p>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-watch/40 bg-watch/10 text-watch animate-pulse uppercase">
              Идёт анализ
            </span>
          </div>
          <AnalysisLoader height={300} />
        </div>
      )}

      {/* LOCKED (not Pro) */}
      {!freshLoading && !analyzing && !isPro && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-5 mb-4 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-mono font-bold text-text-muted tracking-widest uppercase">AI анализ</p>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent uppercase tracking-wider">
              Только Pro
            </span>
          </div>

          <div className="space-y-2.5 mb-5">
            {(() => {
              const recRaw = (market.ai?.recommendation ?? '').toString().toLowerCase()
              const recHint = recRaw.includes('enter') || recRaw.includes('buy_yes') || recRaw === 'yes' ? 'ПОКУПАТЬ YES'
                : recRaw.includes('avoid') || recRaw === 'no' || recRaw.includes('sell') ? 'ПОКУПАТЬ NO'
                : recRaw.includes('watch') ? 'НАБЛЮДАТЬ'
                : recRaw.includes('skip') || recRaw.includes('pass') ? 'ПРОПУСТИТЬ'
                : null
              const fairHint = hintFair != null ? `~${Math.round(hintFair > 1 ? hintFair : hintFair * 100)}%` : null
              const edgeHint = hintEdge != null ? `${hintEdge > 0 ? '+' : ''}${Math.round(hintEdge)}pp` : null
              const rows: { label: string; kind: 'rec' | 'hint' | 'blur'; hint?: string | null; tone?: 'accent' | 'danger' | null }[] = [
                { label: 'Рекомендация', kind: 'rec', hint: recHint },
                { label: 'Справедливая цена AI', kind: 'hint', hint: fairHint },
                { label: 'Edge vs рынок', kind: 'hint', hint: edgeHint, tone: hintEdge != null ? (hintEdge > 0 ? 'accent' : 'danger') : null },
                { label: 'Тезис анализа', kind: 'blur' },
                { label: 'Размер позиции (Kelly)', kind: 'blur' },
              ]
              return rows.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-bg-border last:border-0">
                  <span className="text-[12px] font-mono text-text-secondary">{row.label}</span>
                  {row.kind === 'rec' && row.hint ? (
                    <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-wider select-none"
                      style={{ filter: 'blur(4px)' }}>
                      {row.hint}
                    </span>
                  ) : row.kind === 'rec' ? (
                    <span className="text-[12px] font-mono font-bold text-text-muted blur-[4px] select-none">●●●●</span>
                  ) : row.kind === 'hint' && row.hint ? (
                    <span className={`text-[12px] font-mono italic ${
                      row.tone === 'accent' ? 'text-accent/70' : row.tone === 'danger' ? 'text-danger/70' : 'text-text-muted'
                    }`}>
                      {row.hint}
                    </span>
                  ) : (
                    <span className="text-[12px] font-mono font-bold text-text-muted blur-[4px] select-none">●●●●</span>
                  )}
                </div>
              ))
            })()}
          </div>

          <button
            onClick={() => { setPaywallVariant('pro'); setShowPaywall(true) }}
            className="w-full py-2.5 bg-accent text-bg-base text-[12px] font-mono font-bold rounded-lg
              hover:bg-accent/90 transition-colors uppercase tracking-wider"
          >
            Разблокировать Pro — $14.99/мес
          </button>
        </div>
      )}

      {/* PRO, no analysis → Analyze button */}
      {!freshLoading && !analyzing && isPro && !analysis && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4 text-center">
          <p className="text-[13px] font-mono text-text-secondary mb-1">{t('markets.no_ai_analysis')}</p>
          <p className="text-[11px] font-mono text-text-muted mb-4">
            {isAlpha ? 'Alpha · безлимит анализов' : 'Pro · безлимит анализов'}
          </p>
          {analyzeError && (
            <div className="text-[11px] font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2 mb-4">
              {analyzeError}
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-base
              text-[11px] font-mono font-bold rounded hover:bg-accent/90 transition-colors disabled:opacity-50 uppercase tracking-wider"
          >
            {analyzing ? <><SpinnerIcon /> Анализ...</> : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
                </svg>
                Запустить AI анализ
              </>
            )}
          </button>
        </div>
      )}

      {/* UNLOCKED */}
      {!analyzing && isPro && !freshLoading && analysis && (
        <div className="bg-bg-surface border border-accent/20 rounded-lg p-5 mb-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent uppercase tracking-wider">
                {isAlpha ? 'Alpha' : 'Pro'}
              </span>
              <p className="text-[11px] font-mono font-bold text-text-muted tracking-widest uppercase">AI анализ</p>
            </div>
            {/* TODO(backend): add analysis.generated_at to show freshness */}
            <span className="text-[10px] font-mono text-text-muted">
              Обновлено недавно
            </span>
          </div>

          {/* RECOMMENDATION banner */}
          <div className={`rounded-lg border p-3 mb-4 ${actionBannerCfg.banner}`}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70">Рекомендация</span>
              <span className="text-[14px] font-mono font-bold uppercase tracking-wider">{actionBannerCfg.label}</span>
              {confScore != null && (
                <span className="ml-auto text-[10px] font-mono opacity-80">
                  Уверенность {confScore}%
                </span>
              )}
            </div>
            {analysis.actionReason && (
              <p className="text-[12px] font-mono leading-relaxed opacity-90">
                {analysis.actionReason}
              </p>
            )}
          </div>

          {/* EDGE РАСЧЁТ */}
          <div className="mb-4">
            <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase mb-2">Edge расчёт</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-[10px] font-mono text-text-muted mb-0.5">Рыночная</p>
                <p className="text-[16px] font-mono font-bold text-text-primary leading-none">
                  {prob != null ? `${Math.round(prob)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-text-muted mb-0.5">Справедливая AI</p>
                <p className="text-[16px] font-mono font-bold text-watch leading-none">
                  {formatProb(analysis.fairProb)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-text-muted mb-0.5">Edge</p>
                <p className={`text-[16px] font-mono font-bold leading-none ${analysis.edge > 0 ? 'text-accent' : analysis.edge < 0 ? 'text-danger' : 'text-text-muted'}`}>
                  {formatEdge(analysis.edge)}
                </p>
                <p className={`text-[9px] font-mono mt-0.5 ${analysis.edge > 0 ? 'text-accent/70' : analysis.edge < 0 ? 'text-danger/70' : 'text-text-muted'}`}>
                  {analysis.edge > 2 ? 'YES недооценён' : analysis.edge < -2 ? 'YES переоценён' : 'Цена справедливая'}
                </p>
              </div>
            </div>

            {confScore != null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Уверенность AI</span>
                  <span className="text-[10px] font-mono font-bold text-text-secondary">{confScore}%</span>
                </div>
                <div className="w-full h-1 bg-bg-elevated rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${confBarColor}`} style={{ width: `${confScore}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* THESIS */}
          {analysis.thesis && (
            <div className="mb-4 bg-bg-elevated/60 border-l-2 border-accent/50 pl-3 py-2 rounded-r">
              <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase mb-1.5">Тезис</p>
              <p className="text-[13px] font-mono text-text-secondary leading-relaxed">{analysis.thesis}</p>
            </div>
          )}

          {/* CROWD BIAS */}
          {analysis.crowdBias && (
            <div className="mb-4">
              <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase mb-1.5">Толпа склоняется к</p>
              <p className="text-[13px] font-mono text-text-secondary leading-relaxed">{analysis.crowdBias}</p>
            </div>
          )}

          {/* KELLY SIZING */}
          {analysis.kellySizing && typeof analysis.kellySizing === 'object' && (
            <div className="mb-4 bg-bg-elevated rounded-lg p-3">
              <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase mb-1.5">
                Рекомендуемый размер позиции
              </p>
              {isAlpha ? (
                <div className="flex items-end gap-3 flex-wrap">
                  <span className="text-[20px] font-mono font-bold text-text-primary leading-none">
                    {analysis.kellySizing.kellyUsed?.toFixed(1)}%
                  </span>
                  <span className="text-[11px] font-mono text-text-muted pb-0.5">
                    от банка · ставка ${analysis.kellySizing.betSize} · потенциал +${analysis.kellySizing.potentialWin}
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-end gap-3 cursor-pointer group"
                  onClick={() => { setPaywallVariant('alpha'); setShowPaywall(true) }}
                >
                  <span className="text-[20px] font-mono font-bold text-text-primary leading-none blur-[4px] select-none">
                    XX%
                  </span>
                  <span className="text-[11px] font-mono text-text-muted pb-0.5 group-hover:text-accent transition-colors">
                    Только Alpha →
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Resolution note */}
          {analysis.resolutionNote && (
            <div className="mb-3">
              <p className="text-[10px] font-mono text-text-muted tracking-widest uppercase mb-1.5">Примечание по резолюции</p>
              <p className="text-[12px] font-mono text-text-muted leading-relaxed">{analysis.resolutionNote}</p>
            </div>
          )}

          {/* TODO(backend): replace with analysis.generated_at timestamp */}
          <p className="text-[10px] font-mono text-text-muted/70 pt-3 border-t border-bg-border mt-3">
            Анализ основан на актуальных данных. Точная отметка времени будет добавлена позже.
          </p>
        </div>
      )}

      {/* ── ДРУГИЕ РЫНКИ СОБЫТИЯ (siblings) ── */}
      {siblings.length > 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
          <p className="text-[11px] font-mono font-bold text-text-muted tracking-widest uppercase mb-3">
            Другие рынки события
          </p>
          <div className="flex flex-col gap-1">
            {siblings.slice(0, 8).map(s => {
              const pct = Math.round(s.price)
              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/markets/${s.id}`)}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-md cursor-pointer
                    hover:bg-bg-elevated/60 transition-colors border border-transparent hover:border-bg-border"
                >
                  <span className="text-[13px] font-mono text-text-secondary flex-1 truncate">
                    {s.question}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-20 h-1 bg-bg-elevated rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-accent/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[13px] font-mono font-bold text-accent w-10 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ПОХОЖИЕ РЫНКИ ── */}
      {analysis?.similarMarkets && analysis.similarMarkets.length > 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
          <p className="text-[11px] font-mono font-bold text-text-muted tracking-widest uppercase mb-3">
            Похожие рынки
          </p>
          <div className="flex flex-col gap-2.5">
            {analysis.similarMarkets.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <SourceBadge source={m.platform.toLowerCase()} size="sm" />
                <p className="text-[12px] font-mono text-text-secondary leading-snug flex-1">{m.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RESOLUTION CRITERIA (expandable) ── */}
      {market.resolutionCriteria && (
        <details
          id="resolution-details"
          open={resOpen}
          onToggle={(e) => setResOpen((e.currentTarget as HTMLDetailsElement).open)}
          className="bg-bg-surface border border-bg-border rounded-lg mb-4 group"
        >
          <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
            <h2 className="text-[11px] font-mono font-bold text-text-muted tracking-widest uppercase">Критерий резолюции</h2>
            <span className="text-text-muted text-xs font-mono group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-[12px] font-mono text-text-muted leading-relaxed">{market.resolutionCriteria}</p>
          </div>
        </details>
      )}

      {showPaywall && (
        <PaywallModal variant={paywallVariant} onClose={() => setShowPaywall(false)} />
      )}
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
