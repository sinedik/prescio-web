import { useState, useEffect, useRef, useCallback } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Market, Analysis, MarketOpportunity, NewsItem, MetaculusMatch } from '../types'
import {
  formatProb, formatEdge, formatVolume, formatDate, daysUntil,
  edgeColor, platformColor, actionColor,
} from '../utils'
import AddPositionModal from '../components/AddPositionModal'
import PaywallModal from '../components/PaywallModal'
import { usePortfolio } from '../hooks/usePortfolio'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import AnalysisLoader from '../AnalysisLoader'
import { markAnalyzing, clearAnalyzing, isAnalyzing, markAnalyzed } from '../lib/activeAnalyses'

// ---- Event analysis types ----
interface KeyFactor {
  factor: string
  description: string
  impact: 'bullish' | 'bearish' | 'neutral'
  weight: number
}

interface Scenario {
  label: 'bull' | 'base' | 'bear'
  probability: number
  title: string
  description: string
}

interface EventAiSummary {
  situation_summary: string
  key_factors: KeyFactor[]
  scenarios?: Scenario[] | null
  next_key_date?: string | null
  overall_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  uncertainty_level: 'LOW' | 'MEDIUM' | 'HIGH'
}

// ---- Interactive SVG Price Chart ----
interface HistoryPoint { t: number; p: number }

function PriceChart({ history, loading }: {
  history: HistoryPoint[]
  loading?: boolean
}) {
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

    // Binary search for closest point
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
        <svg className="w-8 h-8 text-text-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 17l6-6 4 4 8-8" />
        </svg>
        <p className="text-xs font-mono text-text-muted">No price history available</p>
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

  // Y-axis grid lines & labels
  const yTicks = [0, 25, 50, 75, 100].filter(v => v >= minP - 5 && v <= maxP + 5)

  // X-axis labels (4 points)
  const xTicks = [0, 0.33, 0.66, 1].map(f => ({
    x: pad.left + f * iW,
    label: new Date((minT + f * tRange) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  // Tooltip positioning — flip when near right edge
  const tooltipOnLeft = hover && hover.x > W * 0.65

  return (
    <div>
      {/* Change summary */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl font-mono font-bold text-text-primary">
          {hover ? `${Math.round(hover.pt.p)}%` : `${Math.round(last.p)}%`}
        </span>
        <span className={`text-xs font-mono font-bold ${isUp ? 'text-accent' : 'text-danger'}`}>
          {change >= 0 ? '+' : '-'}{changePct}pp
        </span>
        {hover && (
          <span className="text-xs font-mono text-text-muted">
            {new Date(hover.pt.t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {new Date(hover.pt.t * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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

        {/* Y grid + labels */}
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

        {/* Area + line (clipped) */}
        <g clipPath="url(#chartClip)">
          <path d={areaPath} fill="url(#chartGrad)" />
          <polyline points={linePts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        </g>

        {/* End dot */}
        <circle cx={toX(last.t).toFixed(1)} cy={toY(last.p).toFixed(1)} r="3.5" fill={color} />

        {/* Crosshair */}
        {hover && (
          <g>
            {/* Vertical line */}
            <line
              x1={hover.x.toFixed(1)} y1={pad.top}
              x2={hover.x.toFixed(1)} y2={pad.top + iH}
              stroke="rgb(var(--text-muted))" strokeWidth="1" strokeDasharray="3,3"
            />
            {/* Horizontal line */}
            <line
              x1={pad.left} y1={hover.y.toFixed(1)}
              x2={W - pad.right} y2={hover.y.toFixed(1)}
              stroke="rgb(var(--text-muted))" strokeWidth="0.5" strokeDasharray="3,3"
            />
            {/* Dot on line */}
            <circle cx={hover.x.toFixed(1)} cy={hover.y.toFixed(1)} r="4" fill={color} stroke="rgb(var(--bg-base))" strokeWidth="1.5" />

            {/* Tooltip box */}
            <g transform={`translate(${tooltipOnLeft ? hover.x - 88 : hover.x + 8}, ${Math.max(pad.top, hover.y - 22)})`}>
              <rect x="0" y="0" width="80" height="32" rx="4" fill="rgb(var(--bg-elevated))" stroke="rgb(var(--bg-border))" strokeWidth="1" />
              <text x="8" y="13" fontSize="11" fill={color} fontFamily="monospace" fontWeight="bold">
                {Math.round(hover.pt.p)}%
              </text>
              <text x="8" y="26" fontSize="9" fill="rgb(var(--text-muted))" fontFamily="monospace">
                {new Date(hover.pt.t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            </g>
          </g>
        )}

        {/* X axis labels */}
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

// ---- Liquidity bars ----
function LiquidityBars({ level }: { level?: string }) {
  const l = (level ?? 'low').toLowerCase()
  const active = l === 'high' ? 3 : l === 'medium' ? 2 : 1
  const barColor = l === 'high' ? 'bg-accent' : l === 'medium' ? 'bg-watch' : 'bg-text-muted'
  return (
    <div className="relative group cursor-help inline-flex items-end gap-0.5">
      {[1, 2, 3].map(n => (
        <div key={n} className={`w-1.5 rounded-sm ${n <= active ? barColor : 'bg-bg-elevated'}`}
          style={{ height: `${n * 5 + 3}px` }} />
      ))}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap text-[10px] font-mono
        bg-bg-elevated border border-bg-border rounded px-2 py-1 opacity-0 group-hover:opacity-100
        transition-opacity pointer-events-none z-10 capitalize">
        {l} liquidity
      </div>
    </div>
  )
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

const CACHE_PREFIX = 'pi_market_'

export default function MarketDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { profile } = useAuthContext()
  const { addPosition } = usePortfolio()

  const [market, setMarket] = useState<Market | undefined>(location.state?.item?.market)

  usePageTitle(market?.question ?? '')
  const [analysis, setAnalysis] = useState<Analysis | undefined>(location.state?.item?.analysis)
  const [news, setNews] = useState<NewsItem[] | undefined>(location.state?.item?.news)
  const [metaculusMatch, setMetaculusMatch] = useState<MetaculusMatch | undefined>(location.state?.item?.metaculusMatch)

  const [marketLoading, setMarketLoading] = useState(true) // всегда скелетон до первого ответа API
  const [freshLoading, setFreshLoading] = useState(true)   // свежий запрос ещё идёт
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyInterval, setHistoryInterval] = useState<'1w' | '1m' | '6m' | 'max'>('max')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [eventAi, setEventAi] = useState<EventAiSummary | null>(null)
  const [eventAnalyzing, setEventAnalyzing] = useState(false)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [historyReal, setHistoryReal] = useState(false)
  const [siblings, setSiblings] = useState<{ id: string; question: string; price: number; no_price?: number; volume?: number; resolution_date?: string; slug?: string }[]>([])
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallVariant, setPaywallVariant] = useState<'pro' | 'alpha'>('pro')
  const { isPro, isAlpha } = useAuthContext()

  // Master loader — всегда загружает свежие данные по UUID, не зависит от cache/state
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    console.log('[MarketDetail] effect start, slug=', slug, 'hasState=', !!location.state?.item)

    // 1. Быстрый показ из navigation state / sessionStorage
    const stateItem = location.state?.item as Partial<MarketOpportunity> | undefined
    if (stateItem?.market) {
      const key = CACHE_PREFIX + slugify(stateItem.market.question)
      sessionStorage.setItem(key, JSON.stringify(stateItem))
      if (!cancelled) {
        setMarket(stateItem.market)
        setAnalysis(stateItem.analysis)
        setNews(stateItem.news)
        setMetaculusMatch(stateItem.metaculusMatch ?? undefined)
        setMarketLoading(false)
      }
    } else {
      const key = CACHE_PREFIX + slug
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

    // 2. Всегда делаем свежий запрос к API по UUID маркета
    ;(async () => {
      try {
        // Сначала получаем ID маркета (slug → UUID через поиск, если нужно)
        const initial = stateItem?.market
        let marketId = initial?.id

        if (!marketId) {
          // Если slug — это UUID, используем напрямую
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (UUID_RE.test(slug)) {
            marketId = slug
          }
        }

        if (!marketId) {
          // Пробуем найти по slug
          const results = await api.getMarkets({ search: slug.replace(/-/g, ' '), limit: 5 }) as { markets: Market[] }
          const list = (results.markets ?? []) as (Market & { analysis?: Analysis })[]
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
        const { data: { session: dbgSession } } = await (await import('../lib/supabase')).supabase.auth.getSession()
        console.log('[MarketDetail] fetching fresh by UUID=', marketId, 'has_token=', !!dbgSession?.access_token, 'plan=?')

        // Запрашиваем полные данные по UUID (включая analysis)
        const fresh = await api.getMarket(marketId) as Market & { analysis?: Analysis; price_history?: HistoryPoint[]; siblings?: { id: string; question: string; price: number; resolution_date?: string; slug?: string }[] }
        if (!cancelled && fresh) {
          setMarket(fresh)
          if (fresh.analysis) {
            setAnalysis(fresh.analysis)
            markAnalyzed('market', marketId)
            clearAnalyzing('market', marketId)
          } else if (isAnalyzing('market', marketId)) {
            // Resume polling after page reload
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
                      const k = CACHE_PREFIX + slug
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
          const key = CACHE_PREFIX + slug
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

  // Fetch (or auto-analyze) event AI when market analysis is ready
  useEffect(() => {
    if (!market?.event?.id || !isPro || !analysis) return
    let cancelled = false
    const eventId = market.event.id
    ;(async () => {
      try {
        const ev = await api.getEvent(eventId) as { ai_summary?: EventAiSummary }
        if (cancelled) return
        if (ev?.ai_summary) { setEventAi(ev.ai_summary); return }

        // Событие не проанализировано — запускаем анализ автоматически
        setEventAnalyzing(true)
        try {
          await api.analyzeEvent(eventId)
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 3000))
            if (cancelled) break
            const fresh = await api.getEvent(eventId) as { ai_summary?: EventAiSummary }
            if (fresh?.ai_summary) {
              if (!cancelled) setEventAi(fresh.ai_summary)
              return
            }
          }
        } catch { /* ignore */ } finally {
          if (!cancelled) setEventAnalyzing(false)
        }
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [market?.event?.id, analysis, isPro])

  // Filter price history from market object by selected interval
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
    setAnalyzing(true)
    setAnalyzeError(null)
    const marketId = market.id!
    markAnalyzing('market', marketId)
    try {
      const marketQuestion = market.question!
      const result = await api.analyzeMarket(marketId) as Record<string, unknown>

      // Всегда перечитываем из GET — данные правильно форматированы и гарантированно из БД
      const pollForAnalysis = async () => {
        const MAX_ATTEMPTS = 12
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          await new Promise(r => setTimeout(r, 10000))
          const fresh = await api.getMarket(marketId) as Market & { analysis?: Analysis }
          if (fresh?.analysis) {
            setAnalysis(fresh.analysis)
            setMarket(prev => prev ? { ...prev } : prev)
            markAnalyzed('market', marketId)
            const key = CACHE_PREFIX + slugify(marketQuestion)
            sessionStorage.setItem(key, JSON.stringify({ market: fresh, analysis: fresh.analysis, news, metaculusMatch }))
            setAnalyzing(false)
            return true
          }
        }
        return false
      }

      // Если анализ уже был в БД — сразу перечитываем без ожидания
      if (result.analysis) {
        const fresh = await api.getMarket(marketId) as Market & { analysis?: Analysis }
        if (fresh?.analysis) {
          setAnalysis(fresh.analysis)
          const key = CACHE_PREFIX + slugify(marketQuestion)
          sessionStorage.setItem(key, JSON.stringify({ market: fresh, analysis: fresh.analysis, news, metaculusMatch }))
        } else {
          // Fallback: анализ есть но план не позволяет читать через GET (free user)
          setAnalysis(result.analysis as Analysis)
        }
        setAnalyzing(false)
        return
      }

      // Анализ поставлен в очередь — поллим каждые 10 секунд
      if (result.queued) {
        const found = await pollForAnalysis()
        if (!found) setAnalyzeError('Analysis is taking too long. Refresh the page in a moment.')
      }
    } catch (err: unknown) {
      const e = err as { type?: string; limit?: number }
      if (e?.type === 'limit_reached') {
        setAnalyzeError(`Daily limit reached (${e.limit ?? 3} analyses/day). Upgrade to Pro for unlimited.`)
      } else {
        setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
      }
    } finally {
      clearAnalyzing('market', marketId)
      setAnalyzing(false)
    }
  }

  if (marketLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
        {/* Back */}
        <div className="h-3 w-10 bg-bg-elevated rounded mb-5" />
        {/* Event context */}
        <div className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden mb-4">
          <div className="w-full h-36 bg-bg-elevated" />
          <div className="px-4 py-3 space-y-2">
            <div className="h-2 w-24 bg-bg-elevated rounded" />
            <div className="h-4 w-2/3 bg-bg-elevated rounded" />
            <div className="h-3 w-full bg-bg-elevated rounded" />
          </div>
        </div>
        {/* Header card */}
        <div className="bg-bg-surface border border-bg-border rounded-lg p-5 mb-4 space-y-3">
          <div className="flex gap-2"><div className="h-5 w-20 bg-bg-elevated rounded" /><div className="h-5 w-16 bg-bg-elevated rounded" /></div>
          <div className="h-5 w-4/5 bg-bg-elevated rounded" />
          <div className="h-4 w-2/3 bg-bg-elevated rounded" />
          <div className="grid grid-cols-4 gap-3 pt-1">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-bg-elevated rounded" />)}
          </div>
        </div>
        {/* Price chart */}
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
          <div className="h-3 w-24 bg-bg-elevated rounded mb-3" />
          <div className="h-40 bg-bg-elevated rounded" />
        </div>
        {/* AI Analysis */}
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
        <p className="text-sm font-mono text-text-muted">MARKET NOT FOUND</p>
        <button onClick={() => navigate('/markets')}
          className="px-4 py-2 text-xs font-mono border border-bg-border text-text-secondary rounded hover:border-text-muted transition-colors">
          BACK TO MARKETS
        </button>
      </div>
    )
  }

  const days = daysUntil(market.resolutionDate)
  const prob = market.yesPrice != null
    ? (market.yesPrice > 1 ? market.yesPrice : market.yesPrice * 100)
    : (analysis?.marketProb ?? null)
  const absEdge = analysis ? Math.abs(analysis.edge) : 0
  const confScore = analysis
    ? (typeof analysis.confidenceScore === 'number' ? analysis.confidenceScore
      : analysis.confidence === 'high' ? 75
      : analysis.confidence === 'medium' ? 50 : 25)
    : null
  const confBarColor = confScore != null
    ? confScore >= 70 ? 'bg-accent' : confScore >= 40 ? 'bg-watch' : 'bg-text-muted'
    : 'bg-text-muted'

  const SENTIMENT_CFG: Record<string, { label: string; cls: string }> = {
    BULLISH: { label: 'BULLISH', cls: 'text-accent bg-accent/10 border-accent/30' },
    BEARISH: { label: 'BEARISH', cls: 'text-danger bg-danger/10 border-danger/30' },
    NEUTRAL: { label: 'NEUTRAL', cls: 'text-text-muted bg-bg-elevated border-bg-border' },
  }
  const UNCERT_CFG: Record<string, { label: string; cls: string }> = {
    LOW:    { label: 'LOW uncertainty',  cls: 'text-accent/80 border-accent/20' },
    MEDIUM: { label: 'MED uncertainty',  cls: 'text-watch border-watch/30' },
    HIGH:   { label: 'HIGH uncertainty', cls: 'text-danger border-danger/25' },
  }
  const sentCfg = eventAi ? SENTIMENT_CFG[eventAi.overall_sentiment] : null
  const uncertCfg = eventAi ? UNCERT_CFG[eventAi.uncertainty_level] : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors mb-5">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        BACK
      </button>

      {/* ── Event context card ── */}
      {market.event && (
        <div className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden mb-4">
          {market.event.enrichment_status === 'ready' && market.event.image_url ? (
            <div className="w-full h-36 overflow-hidden">
              <img src={market.event.image_url} alt={market.event.title} className="w-full h-full object-cover" />
            </div>
          ) : market.event.enrichment_status === 'pending' ? (
            <div className="w-full h-36 bg-bg-elevated animate-pulse" />
          ) : null}
          <div className="px-4 py-3">
            <p className="text-[10px] font-mono text-text-muted tracking-widest mb-1">EVENT CONTEXT</p>
            <p className="text-sm font-mono font-bold text-text-primary leading-snug mb-1">{market.event.title}</p>
            {market.event.description && (
              <p className="text-xs font-mono text-text-muted leading-relaxed line-clamp-2">{market.event.description}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Header card ── */}
      <div className="bg-bg-surface border border-bg-border rounded-lg p-5 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${platformColor(market.platform)}`}>
            {market.platform}
          </span>
          {analysis?.category && (
            <span className="text-[10px] font-mono text-text-muted border border-bg-border px-1.5 py-0.5 rounded uppercase">
              {analysis.category}
            </span>
          )}
          {days !== null && (
            <span className="text-[10px] font-mono text-text-muted">
              {days <= 0 ? 'RESOLVES TODAY' : `RESOLVES IN ${days}D`} · {formatDate(market.resolutionDate)}
            </span>
          )}
          {analysis?.liquidity && <LiquidityBars level={analysis.liquidity} />}
          {market.url && (
            <a href={market.url} target="_blank" rel="noopener noreferrer"
              className="ml-auto text-[10px] font-mono text-text-muted hover:text-accent transition-colors">
              VIEW MARKET →
            </a>
          )}
        </div>

        <h1 className="text-base font-semibold text-text-primary leading-snug mb-4">
          {market.question}
        </h1>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bg-elevated border border-bg-border rounded p-3">
            <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">MARKET PRICE</p>
            <p className="text-lg font-mono font-bold text-text-primary leading-none">
              {prob != null ? formatProb(prob) : '—'}
            </p>
            <p className="text-[9px] font-mono text-text-muted mt-1">current yes</p>
          </div>

          {analysis ? (
            <>
              <div className="bg-bg-elevated border border-accent/20 rounded p-3">
                <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">FAIR VALUE</p>
                <p className="text-lg font-mono font-bold text-accent leading-none">
                  {formatProb(analysis.fairProb)}
                </p>
                <p className="text-[9px] font-mono text-text-muted mt-1">AI estimate</p>
              </div>
              <div className="bg-bg-elevated border border-bg-border rounded p-3">
                <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">EDGE</p>
                <p className={`text-lg font-mono font-bold leading-none ${edgeColor(analysis.edge)}`}>
                  {formatEdge(analysis.edge)}
                </p>
                <p className="text-[9px] font-mono text-text-muted mt-1">opportunity</p>
              </div>
            </>
          ) : (
            <div className="col-span-2 bg-bg-elevated border border-accent/10 rounded p-3 flex items-center justify-center">
              <p className="text-[10px] font-mono text-text-muted text-center leading-relaxed">
                Run AI analysis<br />to see Fair Value & Edge
              </p>
            </div>
          )}

          <div className="bg-bg-elevated border border-bg-border rounded p-3">
            <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">VOLUME</p>
            <p className="text-lg font-mono font-bold text-text-primary leading-none">
              {formatVolume(market.volume)}
            </p>
            <p className="text-[9px] font-mono text-text-muted mt-1">total traded</p>
          </div>
        </div>

        {/* Extra market stats */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-bg-border">
          {market.volume24h != null && market.volume24h > 0 && (
            <div>
              <span className="text-[9px] font-mono text-text-muted tracking-wider">24H VOL </span>
              <span className="text-xs font-mono text-text-secondary">{formatVolume(market.volume24h)}</span>
            </div>
          )}
          {market.liquidity != null && market.liquidity > 0 && (
            <div>
              <span className="text-[9px] font-mono text-text-muted tracking-wider">LIQUIDITY </span>
              <span className="text-xs font-mono text-text-secondary">{formatVolume(market.liquidity)}</span>
            </div>
          )}
          {market.noPrice != null && (
            <div>
              <span className="text-[9px] font-mono text-text-muted tracking-wider">NO </span>
              <span className="text-xs font-mono text-text-secondary">
                {formatProb(market.noPrice > 1 ? market.noPrice : market.noPrice * 100)}
              </span>
            </div>
          )}
          {analysis?.horizon && (
            <div>
              <span className="text-[9px] font-mono text-text-muted tracking-wider">HORIZON </span>
              <span className="text-xs font-mono text-text-secondary">{analysis.horizon}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Related market variants (siblings) ── */}
      {siblings.length > 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">OTHER OUTCOMES</p>
          <div className="flex flex-col gap-1">
            {/* Current market — active row */}
            {(() => {
              const curProb = prob != null ? Math.round(prob) : 50
              const curNo = 100 - curProb
              return (
                <div className="rounded-md bg-bg-elevated border border-accent/20 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-mono text-text-primary flex-1 pr-3 truncate">{market.question}</span>
                    <span className="text-sm font-mono font-bold text-accent shrink-0">{curProb}%</span>
                  </div>
                  <div className="w-full h-1 bg-bg-border rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${curProb}%` }} />
                  </div>
                  <div className="flex gap-1.5">
                    <button className="flex-1 py-1 text-xs font-mono font-bold rounded bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors">
                      YES {curProb}¢
                    </button>
                    <button className="flex-1 py-1 text-xs font-mono font-bold rounded bg-bg-border/60 text-text-secondary border border-bg-border hover:bg-bg-border transition-colors">
                      NO {curNo}¢
                    </button>
                  </div>
                </div>
              )
            })()}
            {/* Siblings */}
            {siblings.map(s => {
              const noP = s.no_price ?? (100 - s.price)
              return (
                <div
                  key={s.id}
                  className="rounded-md px-3 py-2.5 cursor-pointer hover:bg-bg-elevated/50 transition-colors border border-transparent hover:border-bg-border"
                  onClick={() => navigate(`/markets/${s.id}`)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-mono text-text-secondary flex-1 pr-3 truncate">{s.question}</span>
                    <span className="text-sm font-mono font-bold text-text-primary shrink-0">{s.price}%</span>
                  </div>
                  <div className="w-full h-1 bg-bg-border rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-text-muted/50 rounded-full" style={{ width: `${s.price}%` }} />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      className="flex-1 py-1 text-xs font-mono font-bold rounded bg-bg-elevated text-text-secondary border border-bg-border hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors"
                      onClick={e => { e.stopPropagation(); navigate(`/markets/${s.id}`) }}
                    >
                      YES {s.price}¢
                    </button>
                    <button
                      className="flex-1 py-1 text-xs font-mono font-bold rounded bg-bg-elevated text-text-secondary border border-bg-border hover:bg-bg-border transition-colors"
                      onClick={e => { e.stopPropagation(); navigate(`/markets/${s.id}`) }}
                    >
                      NO {noP}¢
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Price chart ── */}
      <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest">PRICE HISTORY</h2>
          <div className="flex items-center gap-2">
            {market.platform === 'polymarket' && (
              <div className="flex items-center gap-0.5">
                {(['1w', '1m', '6m', 'max'] as const).map(iv => (
                  <button
                    key={iv}
                    onClick={() => setHistoryInterval(iv)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      historyInterval === iv
                        ? 'text-accent bg-accent/10'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {iv.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <span className={`text-[10px] font-mono ${
              historyLoading ? 'text-text-muted animate-pulse' :
              historyReal ? 'text-accent/60' : 'text-text-muted'
            }`}>
              {historyLoading ? 'LOADING...' : historyReal ? '● POLYMARKET CLOB' :
               market.platform === 'kalshi' ? 'KALSHI (AUTH REQUIRED)' :
               market.platform === 'metaculus' ? 'METACULUS' : 'NO DATA'}
            </span>
          </div>
        </div>

        {historyLoading ? (
          <div className="w-full bg-bg-elevated rounded animate-pulse" style={{ height: 160 }} />
        ) : market.platform !== 'polymarket' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="flex items-center gap-3">
              {/* Current price pill */}
              {prob != null && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-text-muted tracking-wider">CURRENT</span>
                  <span className="text-3xl font-mono font-bold text-text-primary">{Math.round(prob)}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-center">
              <svg className="w-4 h-4 text-text-muted/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <p className="text-[11px] font-mono text-text-muted">
                {market.platform === 'kalshi'
                  ? 'Historical chart requires Kalshi API credentials'
                  : 'Price history not available for this platform'}
              </p>
            </div>
            {market.platform === 'kalshi' && market.url && (
              <a href={market.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-mono text-accent/60 hover:text-accent transition-colors">
                View chart on Kalshi →
              </a>
            )}
          </div>
        ) : (
          <PriceChart history={history} loading={false} />
        )}
      </div>

      {/* ── AI Analysis — tiered access ── */}

      {/* Fresh fetch in progress — skeleton placeholder */}
      {freshLoading && !analyzing && !analysis && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4 animate-pulse space-y-3">
          <div className="h-2.5 w-20 bg-bg-elevated rounded" />
          <div className="h-4 w-1/2 bg-bg-elevated rounded" />
          <div className="h-3 w-full bg-bg-elevated rounded" />
          <div className="h-3 w-4/5 bg-bg-elevated rounded" />
        </div>
      )}

      {/* Analyzing in progress: show loader inside the block */}
      {analyzing && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4">
          <p className="text-[10px] font-mono text-text-muted tracking-widest mb-4">AI ANALYSIS</p>
          <AnalysisLoader height={300} />
        </div>
      )}

      {/* FREE: locked paywall block */}
      {!freshLoading && !isPro && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4 relative overflow-hidden">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">AI ANALYSIS</p>
          <div className="space-y-2 blur-[3px] opacity-60 pointer-events-none select-none">
            <div className="h-3 w-full bg-bg-elevated rounded" />
            <div className="h-3 w-5/6 bg-bg-elevated rounded" />
            <div className="h-3 w-4/5 bg-bg-elevated rounded" />
            <div className="h-3 w-3/4 bg-bg-elevated rounded" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => { setPaywallVariant('pro'); setShowPaywall(true) }}
              className="px-4 py-2 bg-accent text-bg-base text-xs font-mono font-bold rounded-lg hover:bg-accent/90 transition-colors"
            >
              Unlock AI Analysis
            </button>
          </div>
        </div>
      )}

      {/* PRO / ALPHA: no analysis yet → analyze button */}
      {!freshLoading && !analyzing && isPro && !analysis && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 mb-4 text-center">
          <p className="text-sm font-mono text-text-secondary mb-1">No AI analysis yet</p>
          <p className="text-xs font-mono text-text-muted mb-4">
            {isAlpha ? 'Alpha · Unlimited analyses' : 'Pro · Unlimited analyses'}
          </p>
          {analyzeError && (
            <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2 mb-4">
              {analyzeError}
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-bg-base
              text-xs font-mono font-bold rounded hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {analyzing ? <><SpinnerIcon /> ANALYZING...</> : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
                </svg>
                ANALYZE WITH AI
              </>
            )}
          </button>
        </div>
      )}

      {/* PRO / ALPHA with analysis */}
      {!analyzing && isPro && !freshLoading && analysis && (
        <>
          {/* Single unified AI Analysis card */}
          <div className="bg-bg-surface border border-accent/15 rounded-xl p-5 mb-4">

            {/* Header: label + badges + action buttons */}
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest">AI ANALYSIS</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {analysis.action && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${actionColor(analysis.action)}`}>
                    {analysis.action}
                  </span>
                )}
                {confScore != null && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    confScore >= 70 ? 'text-accent border-accent/30 bg-accent/5'
                    : confScore >= 40 ? 'text-watch border-watch/30 bg-watch/5'
                    : 'text-text-muted border-bg-border'
                  }`}>
                    {confScore}% CONF
                  </span>
                )}
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
                {eventAi?.next_key_date && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-bg-border text-text-muted">
                    {new Date(eventAi.next_key_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Action reason */}
            {analysis.actionReason && (
              <p className="text-sm font-mono text-text-secondary leading-relaxed mb-4">
                {analysis.actionReason}
              </p>
            )}

            {/* Edge + Fair Value row */}
            {isAlpha && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-bg-elevated rounded-lg p-3">
                  <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">EDGE SCORE</p>
                  <p className={`text-lg font-mono font-bold leading-none ${edgeColor(analysis.edge)}`}>
                    {formatEdge(analysis.edge)}
                  </p>
                </div>
                {analysis.fairProb != null && (
                  <div className="bg-bg-elevated rounded-lg p-3">
                    <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">FAIR VALUE</p>
                    <p className="text-lg font-mono font-bold text-accent leading-none">{formatProb(analysis.fairProb)}</p>
                  </div>
                )}
                {analysis.kellySizing && typeof analysis.kellySizing === 'object' && (
                  <div className="bg-bg-elevated rounded-lg p-3">
                    <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">KELLY</p>
                    <p className="text-lg font-mono font-bold text-text-primary leading-none">
                      {analysis.kellySizing.kellyUsed?.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isAlpha && (
              <div
                className="flex items-center gap-2 mb-4 cursor-pointer group"
                onClick={() => { setPaywallVariant('alpha'); setShowPaywall(true) }}
              >
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {['EDGE SCORE', 'FAIR VALUE', 'KELLY'].map(label => (
                    <div key={label} className="bg-bg-elevated rounded-lg p-3">
                      <p className="text-[9px] font-mono text-text-muted mb-1 tracking-wider">{label}</p>
                      <p className="text-lg font-mono font-bold text-text-primary leading-none blur-sm select-none">XX</p>
                    </div>
                  ))}
                </div>
                <span className="text-base shrink-0">🔒</span>
              </div>
            )}

            {/* Thesis / Crowd Bias / Resolution Note */}
            {(analysis.thesis || analysis.crowdBias || analysis.resolutionNote) && (
              <div className="space-y-3 mb-4">
                {analysis.thesis && (
                  <div>
                    <p className="text-[10px] font-mono text-text-muted mb-1 tracking-wider">THESIS</p>
                    <p className="text-sm font-mono text-text-secondary leading-relaxed">{analysis.thesis}</p>
                  </div>
                )}
                {analysis.crowdBias && (
                  <div>
                    <p className="text-[10px] font-mono text-text-muted mb-1 tracking-wider">CROWD BIAS</p>
                    <p className="text-sm font-mono text-text-secondary leading-relaxed">{analysis.crowdBias}</p>
                  </div>
                )}
                {analysis.resolutionNote && (
                  <div>
                    <p className="text-[10px] font-mono text-text-muted mb-1 tracking-wider">RESOLUTION NOTE</p>
                    <p className="text-sm font-mono text-text-secondary leading-relaxed">{analysis.resolutionNote}</p>
                  </div>
                )}
              </div>
            )}

            {/* Kelly sizing detail (Alpha only) */}
            {isAlpha && analysis.kellySizing && typeof analysis.kellySizing === 'object' && (
              <p className="text-xs font-mono text-text-muted mb-4">
                Bet ${analysis.kellySizing.betSize} · Potential +${analysis.kellySizing.potentialWin}
              </p>
            )}

            {/* Event-level AI analysis loading */}
            {eventAnalyzing && !eventAi && (
              <div className="border-t border-bg-border mt-4 pt-4">
                <AnalysisLoader height={180} startPhase={2} />
              </div>
            )}

            {/* Event-level AI analysis */}
            {eventAi && (
              <div className="border-t border-bg-border mt-4 pt-4 space-y-4">
                {/* Situation summary */}
                <div>
                  <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">SITUATION</p>
                  <p className="text-sm font-mono text-text-secondary leading-relaxed">{eventAi.situation_summary}</p>
                </div>

                {/* Key factors */}
                {eventAi.key_factors?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">KEY FACTORS</p>
                    <div className="flex flex-col gap-3">
                      {eventAi.key_factors.map((f, i) => {
                        const impact = f.impact ?? 'neutral'
                        const weight = f.weight ?? 0.5
                        const impactCls = impact === 'bullish' ? 'text-accent' : impact === 'bearish' ? 'text-danger' : 'text-text-muted/60'
                        const barCls   = impact === 'bullish' ? 'bg-accent' : impact === 'bearish' ? 'bg-danger' : 'bg-text-muted/30'
                        const icon     = impact === 'bullish' ? '↑' : impact === 'bearish' ? '↓' : '→'
                        return (
                          <div key={i}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[12px] font-mono font-bold shrink-0 w-4 ${impactCls}`}>{icon}</span>
                              <span className="text-[12px] font-mono font-bold text-text-primary flex-1">{f.factor}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-16 h-1 bg-bg-elevated rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${Math.round(weight * 100)}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-text-muted w-5 text-right">{Math.round(weight * 10)}</span>
                              </div>
                            </div>
                            {f.description && <p className="text-[11px] font-mono text-text-muted leading-relaxed pl-6">{f.description}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Scenarios */}
                {eventAi.scenarios?.length ? (
                  <div>
                    <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">SCENARIOS</p>
                    {isAlpha ? (
                      <div className="grid grid-cols-3 gap-2">
                        {eventAi.scenarios.map((s, i) => {
                          const cfg = s.label === 'bull'
                            ? { border: 'border-accent/30 bg-accent/5', lbl: 'text-accent', prob: 'text-accent' }
                            : s.label === 'bear'
                            ? { border: 'border-danger/30 bg-danger/5', lbl: 'text-danger', prob: 'text-danger' }
                            : { border: 'border-bg-border bg-bg-elevated/20', lbl: 'text-text-muted', prob: 'text-text-secondary' }
                          return (
                            <div key={i} className={`rounded-lg border p-3 ${cfg.border}`}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${cfg.lbl}`}>{s.label}</span>
                                <span className={`text-sm font-mono font-bold ${cfg.prob}`}>{s.probability}%</span>
                              </div>
                              <p className="text-[11px] font-mono font-bold text-text-primary mb-1 leading-snug">{s.title}</p>
                              <p className="text-[10px] font-mono text-text-muted leading-relaxed">{s.description}</p>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="grid grid-cols-3 gap-2 blur-sm opacity-40 pointer-events-none select-none">
                          {['BULL', 'BASE', 'BEAR'].map((lbl) => (
                            <div key={lbl} className="rounded-lg border border-bg-border p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="h-2.5 w-8 bg-bg-elevated rounded" />
                                <div className="h-3 w-6 bg-bg-elevated rounded" />
                              </div>
                              <div className="h-2.5 w-full bg-bg-elevated rounded mb-1" />
                              <div className="h-2 w-4/5 bg-bg-elevated rounded" />
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button
                            onClick={() => { setPaywallVariant('alpha'); setShowPaywall(true) }}
                            className="px-3 py-1.5 bg-bg-surface border border-bg-border text-[10px] font-mono font-bold text-text-muted hover:border-text-muted/40 hover:text-text-secondary rounded-lg transition-colors"
                          >
                            Alpha only
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Add to Portfolio */}
            {isAlpha && (
              <button onClick={() => setShowAddPosition(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 mt-4 bg-accent/10 border border-accent/30
                  text-accent text-xs font-mono font-bold rounded hover:bg-accent/20 transition-colors">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                ADD TO PORTFOLIO
              </button>
            )}
          </div>

        </>
      )}

      {showPaywall && (
        <PaywallModal variant={paywallVariant} onClose={() => setShowPaywall(false)} />
      )}

      {/* ── Tags ── */}
      {market.tags && market.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {market.tags.slice(0, 8).map((tag, i) => (
            <span key={i} className="text-[10px] font-mono text-text-muted border border-bg-border
              px-2 py-0.5 rounded-full bg-bg-surface">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Resolution criteria ── */}
      {market.resolutionCriteria && (
        <details className="bg-bg-surface border border-bg-border rounded-lg mb-4 group">
          <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
            <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest">RESOLUTION CRITERIA</h2>
            <span className="text-text-muted text-xs font-mono group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="px-5 pb-5">
            <p className="text-xs text-text-muted leading-relaxed">{market.resolutionCriteria}</p>
          </div>
        </details>
      )}

      {/* ── Similar markets ── */}
      {analysis?.similarMarkets && analysis.similarMarkets.length > 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
          <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest mb-3">RELATED MARKETS</h2>
          <div className="space-y-2.5">
            {analysis.similarMarkets.slice(0, 4).map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0 mt-0.5 ${platformColor(m.platform)}`}>
                  {m.platform}
                </span>
                <p className="text-xs text-text-secondary leading-snug">{m.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Metaculus ── */}
      {metaculusMatch && (
        <div className="bg-bg-surface border border-purple-400/20 rounded-lg p-4 mb-4">
          <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest mb-3">METACULUS COMMUNITY</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-text-muted">COMMUNITY PROBABILITY</p>
              <p className="text-xl font-mono font-bold text-purple-400">
                {metaculusMatch.communityProb !== null ? formatProb(metaculusMatch.communityProb) : '—'}
              </p>
              <p className="text-xs font-mono text-text-muted mt-1">{metaculusMatch.numForecasters} forecasters</p>
            </div>
            {metaculusMatch.url && (
              <a href={metaculusMatch.url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-mono text-purple-400 border border-purple-400/30 px-3 py-1.5 rounded hover:bg-purple-400/10 transition-colors">
                VIEW →
              </a>
            )}
          </div>
          {metaculusMatch.question && (
            <p className="text-xs font-mono text-text-muted mt-3 leading-relaxed">"{metaculusMatch.question}"</p>
          )}
        </div>
      )}

      {/* ── News ── */}
      {news && news.length > 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-5 mb-4">
          <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest mb-3">
            RELEVANT NEWS ({news.length})
          </h2>
          <div className="space-y-3">
            {news.map((n, i) => (
              <div key={i} className="border-b border-bg-border last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-text-muted uppercase">{n.source}</span>
                  {n.publishedAt && (
                    <span className="text-[10px] font-mono text-text-muted/60">
                      · {new Date(n.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {n.url ? (
                  <a href={n.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors leading-snug block">
                    {n.title}
                  </a>
                ) : (
                  <p className="text-sm text-text-secondary leading-snug">{n.title}</p>
                )}
                {n.summary && (
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">{n.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Position Modal ── */}
      {showAddPosition && analysis && (
        <AddPositionModal
          onAdd={addPosition}
          onClose={() => setShowAddPosition(false)}
          prefill={{
            question: market.question,
            platform: market.platform,
            entryPrice: Math.round(analysis.marketProb),
            myFairProb: Math.round(analysis.fairProb),
            direction: analysis.edgeDirection === 'YES' ? 'YES' : 'NO',
            url: market.url,
            resolutionDate: market.resolutionDate,
            thesis: analysis.thesis,
          }}
        />
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
