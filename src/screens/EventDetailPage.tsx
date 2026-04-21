'use client'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useParams, useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { analyzeEventAction } from '../actions/analyze'
import { addToWatchlistAction } from '../actions/watchlist'
import dynamic from 'next/dynamic'
import { useAuthContext } from '../contexts/AuthContext'
const PaywallModal = dynamic(() => import('../components/PaywallModal'), { ssr: false })
import AnalysisLoader from '../AnalysisLoader'
import { markAnalyzing, clearAnalyzing, isAnalyzing, markAnalyzed } from '../lib/activeAnalyses'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { SourceBadge } from '../components/feed/SourceBadge'
import { MarketStatusBadge } from '../components/markets/MarketStatusBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface RelatedMarket {
  id: string
  question: string
  outcome_label?: string | null
  platform: string
  slug?: string
  price: number
  volume: number
  resolves_at?: string | null
  external_url?: string | null
  analysis?: {
    recommendation?: string
    confidence_score?: number
    fair_prob?: number
    edge_score?: number
    kelly_fraction?: number
    thesis?: string
    crowd_bias?: string
    risk_factors?: string
    created_at?: string
  }
}

interface EventDetail {
  id: string
  title: string
  summary: string
  description?: string | null
  image_url?: string | null
  context?: string | null
  enrichment_status?: 'pending' | 'ready' | 'failed'
  resolves_at?: string | null
  source_name?: string | null
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'active' | 'resolved'
  updated_at: string
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  uncertainty_level?: 'LOW' | 'MEDIUM' | 'HIGH'
  ai_summary?: {
    situation_summary: string
    key_factors: KeyFactor[]
    scenarios?: Scenario[] | null
    next_key_date?: string | null
    overall_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    uncertainty_level: 'LOW' | 'MEDIUM' | 'HIGH'
  }
  markets: RelatedMarket[]
  timeline?: { date: string; text: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVolume(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v}`
}

function formatResolveDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCountdown(iso: string): string {
  const now = Date.now()
  const target = new Date(iso).getTime()
  const diffMs = target - now
  if (diffMs < 0) return 'завершено'
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'сегодня'
  if (days === 1) return 'завтра'
  if (days < 5) return `через ${days} дня`
  return `через ${days} дней`
}

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
  const key = cat.toUpperCase()
  return CATEGORY_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase()
}

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'КРИТ',
  HIGH: 'ВЫСОКИЙ',
  MEDIUM: 'СРЕДНИЙ',
  LOW: 'НИЗКИЙ',
}

const SENTIMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  BULLISH: { label: 'БЫЧИЙ',      cls: 'text-accent border-accent/30 bg-accent/10' },
  BEARISH: { label: 'МЕДВЕЖИЙ',   cls: 'text-danger border-danger/30 bg-danger/10' },
  NEUTRAL: { label: 'НЕЙТРАЛЬНЫЙ', cls: 'text-text-muted border-bg-border bg-bg-elevated' },
}

const UNCERTAINTY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:    { label: 'НИЗКАЯ НЕОПРЕД.',  cls: 'text-accent/80 border-accent/20' },
  MEDIUM: { label: 'СРЕДНЯЯ НЕОПРЕД.', cls: 'text-watch border-watch/30' },
  HIGH:   { label: 'ВЫСОКАЯ НЕОПРЕД.', cls: 'text-danger border-danger/25' },
}

const REC_CONFIG: Record<string, { label: string; cls: string }> = {
  strong_enter: { label: 'СИЛЬНЫЙ ВХОД', cls: 'text-accent border-accent/60 bg-accent/15' },
  enter:        { label: 'ВХОД',         cls: 'text-accent border-accent/40 bg-accent/10' },
  watch:        { label: 'НАБЛЮДЕНИЕ',   cls: 'text-watch border-watch/40 bg-watch/10' },
  skip:         { label: 'ПРОПУСК',      cls: 'text-text-muted border-bg-border' },
  avoid:        { label: 'ИЗБЕГАТЬ',     cls: 'text-danger border-danger/40 bg-danger/10' },
}

const SCENARIO_LABELS: Record<string, string> = {
  bull: 'БЫК',
  base: 'БАЗА',
  bear: 'МЕДВ',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage({ initialData }: { initialData?: EventDetail } = {}) {
  const params = useParams<{ id: string }>()
  const id = (params?.id ?? '') as string
  const router = useRouter()
  const { isPro, isAlpha } = useAuthContext()
  const [paywallVariant, setPaywallVariant] = useState<'pro' | 'alpha' | null>(null)
  const [watchAdded, setWatchAdded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [localAnalysis, setLocalAnalysis] = useState<Pick<EventDetail, 'ai_summary' | 'sentiment' | 'uncertainty_level'> | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const prevIsAlpha = useRef(isAlpha)
  const { lang } = useLang()
  const t = useT(lang)

  const { data: event, loading } = usePolling<EventDetail>(
    () => api.getEvent(id!) as Promise<EventDetail>,
    5 * 60 * 1000,
    id,
    ...(initialData ? [{ initialData }] : []),
  )

  // Resume polling if analysis was in progress before reload
  useEffect(() => {
    if (!id || !event || analyzing) return
    if (event.ai_summary?.situation_summary || localAnalysis?.ai_summary?.situation_summary) {
      clearAnalyzing('event', id)
      return
    }
    if (!isAnalyzing('event', id)) return

    setAnalyzing(true)
    let active = true
    ;(async () => {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000))
        if (!active) break
        try {
          const fresh = await api.getEvent(id) as EventDetail
          if (fresh?.ai_summary?.situation_summary) {
            if (active) {
              setLocalAnalysis({ ai_summary: fresh.ai_summary, sentiment: fresh.sentiment, uncertainty_level: fresh.uncertainty_level })
              clearAnalyzing('event', id)
              setAnalyzing(false)
            }
            return
          }
        } catch { /* continue */ }
      }
      if (active) { clearAnalyzing('event', id); setAnalyzing(false) }
    })()
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, event])

  // При апгрейде до Alpha — перезапросить событие чтобы получить полные данные
  useEffect(() => {
    if (isAlpha && !prevIsAlpha.current && id) {
      api.getEvent(id).then((fresh) => {
        if (fresh) {
          const e = fresh as EventDetail
          if (e.ai_summary) {
            setLocalAnalysis({
              ai_summary: e.ai_summary,
              sentiment: e.sentiment,
              uncertainty_level: e.uncertainty_level,
            })
          }
        }
      }).catch(() => {})
    }
    prevIsAlpha.current = isAlpha
  }, [isAlpha, id])

  usePageTitle(event?.title ?? '')

  async function handleAnalyze() {
    if (!id) return
    setAnalyzing(true)
    setAnalyzeError(null)
    markAnalyzing('event', id)
    try {
      await analyzeEventAction(id)

      const MAX_ATTEMPTS = 30
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const fresh = await api.getEvent(id) as EventDetail & { _analysisTs?: string }
        if (fresh?.ai_summary?.situation_summary) {
          setLocalAnalysis({
            ai_summary: fresh.ai_summary,
            sentiment: fresh.sentiment,
            uncertainty_level: fresh.uncertainty_level,
          })
          markAnalyzed('event', id)
          return
        }
      }
      setAnalyzeError('Анализ занимает слишком много времени. Обновите страницу через минуту.')
    } catch (err: unknown) {
      const e = err as { type?: string; limit?: number }
      if (e?.type === 'limit_reached') {
        setPaywallVariant('pro')
      } else {
        setAnalyzeError(err instanceof Error ? err.message : 'Ошибка анализа')
      }
    } finally {
      clearAnalyzing('event', id)
      setAnalyzing(false)
    }
  }

  async function handleWatch() {
    if (!id) return
    try {
      await addToWatchlistAction({ type: 'event', id })
      setWatchAdded(true)
    } catch {
      setWatchAdded(true)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-3 w-40 bg-bg-elevated rounded" />
          <div className="h-48 w-full bg-bg-elevated rounded-xl" />
          <div className="h-6 w-3/4 bg-bg-elevated rounded" />
          <div className="h-3 w-full bg-bg-elevated rounded" />
          <div className="h-3 w-5/6 bg-bg-elevated rounded" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-sm font-mono text-text-muted">СОБЫТИЕ НЕ НАЙДЕНО</p>
        <button onClick={() => router.push('/markets')} className="mt-4 text-xs font-mono text-accent hover:text-accent/80">
          К маркетам
        </button>
      </div>
    )
  }

  const effectiveSentiment = localAnalysis?.sentiment ?? event.sentiment
  const effectiveUncertainty = localAnalysis?.uncertainty_level ?? event.uncertainty_level
  const aiSummary = localAnalysis?.ai_summary ?? event.ai_summary

  const sentCfg = effectiveSentiment ? SENTIMENT_CONFIG[effectiveSentiment] : null
  const uncertCfg = effectiveUncertainty ? UNCERTAINTY_CONFIG[effectiveUncertainty] : null

  const imageUrl = event.image_url ?? null
  const description = event.description ?? event.summary ?? null
  const context = event.context ?? null

  const firstMarket = event.markets?.[0]
  const sourcePlatform = event.source_name ?? firstMarket?.platform ?? null
  const resolveIso = event.resolves_at ?? firstMarket?.resolves_at ?? null
  const marketUrl = firstMarket?.external_url ?? null
  const DESC_LIMIT = 120
  const descNeedsCollapse = !!description && description.length > DESC_LIMIT
  const descCollapsed = descNeedsCollapse && !descExpanded

  const cLabel = catLabel(event.category)
  const severityLabel = SEVERITY_LABELS[event.severity] ?? event.severity
  const crumbs = [
    { label: 'Маркеты', href: '/markets' },
    ...(cLabel ? [{ label: cLabel, href: `/markets?category=${encodeURIComponent(event.category)}` }] : []),
    { label: event.title },
  ]

  const nextKeyDate = aiSummary?.next_key_date
    ? new Date(aiSummary.next_key_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
    : null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumbs items={crumbs} />

      {/* ── 1. Hero image ── */}
      {imageUrl && !imgFailed ? (
        <div className="w-full h-48 rounded-xl mb-5 overflow-hidden">
          <img
            src={imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : null}

      {/* ── 2. Hero: meta bar + title + description ── */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {(() => {
            const parts: ReactNode[] = []
            if (event.severity) {
              parts.push(
                <span key="sev" className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                  event.severity === 'CRITICAL' ? 'text-danger' :
                  event.severity === 'HIGH'     ? 'text-danger' :
                  event.severity === 'MEDIUM'   ? 'text-watch' :
                  'text-text-muted'
                }`}>
                  {severityLabel}
                </span>
              )
            }
            parts.push(
              <span key="status" className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                event.status === 'active' ? 'text-accent' : 'text-text-muted'
              }`}>
                {event.status === 'active' ? 'АКТИВНО' : 'ЗАВЕРШЕНО'}
              </span>
            )
            if (nextKeyDate) {
              parts.push(
                <span key="date" className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Ключевая дата <span className="text-text-secondary font-bold">{nextKeyDate}</span>
                </span>
              )
            }
            return parts.reduce<ReactNode[]>((acc, el, i) => {
              if (i > 0) acc.push(<span key={`sep-${i}`} className="text-text-muted/40 text-[10px]">·</span>)
              acc.push(el)
              return acc
            }, [])
          })()}
        </div>

        {/* Source / resolve / external link meta row */}
        {(sourcePlatform || resolveIso || marketUrl) && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {sourcePlatform && <SourceBadge source={sourcePlatform} size="sm" />}
              {resolveIso && (
                <>
                  {sourcePlatform && <span className="text-text-muted/40 text-[10px]">·</span>}
                  <span className="text-[10px] font-mono text-watch">
                    Резолв: <span className="font-bold">{formatResolveDate(resolveIso)}</span>
                  </span>
                  <span className="text-text-muted/40 text-[10px]">·</span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {formatCountdown(resolveIso)}
                  </span>
                </>
              )}
            </div>
            {marketUrl && (
              <a
                href={marketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-mono text-accent hover:text-accent/80 transition-colors shrink-0 ml-auto"
              >
                Открыть рынок →
              </a>
            )}
          </div>
        )}

        <h1 className="text-[22px] sm:text-[26px] font-mono font-bold text-text-primary leading-tight mb-3 tracking-tight">
          {event.title}
        </h1>

        {description && (
          <div>
            {descCollapsed ? (
              <div
                className="border-l-2 border-bg-border bg-bg-elevated/40 rounded-r-sm"
                style={{ padding: '6px 10px' }}
              >
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  {description.slice(0, DESC_LIMIT)}...
                </p>
              </div>
            ) : (
              <p className="text-[14px] text-text-secondary leading-relaxed">
                {description}
              </p>
            )}
            {descNeedsCollapse && (
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="text-[9px] font-mono text-text-muted hover:text-text-secondary transition-colors mt-1.5"
              >
                {descExpanded ? 'Скрыть ↑' : 'Показать полное условие резолюции ↓'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 3. AI Analysis ── */}
      {isPro && analyzing ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-4">AI АНАЛИЗ</p>
          <AnalysisLoader height={300} />
        </div>
      ) : isPro && loading ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-2.5 w-24 bg-bg-elevated rounded" />
            <div className="flex gap-2"><div className="h-5 w-16 bg-bg-elevated rounded" /><div className="h-5 w-20 bg-bg-elevated rounded" /></div>
          </div>
          <div className="space-y-2 mb-5">
            <div className="h-3 w-full bg-bg-elevated rounded" />
            <div className="h-3 w-5/6 bg-bg-elevated rounded" />
            <div className="h-3 w-4/5 bg-bg-elevated rounded" />
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-bg-elevated rounded" />)}
          </div>
        </div>
      ) : isPro && aiSummary ? (
        <div className="bg-bg-surface border border-accent/15 rounded-xl p-5 mb-6">
          {/* Header: tier badge + sentiment/uncertainty */}
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest">AI АНАЛИЗ</p>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                isAlpha ? 'text-accent border-accent/40 bg-accent/10' : 'text-text-secondary border-bg-border'
              }`}>
                {isAlpha ? 'ALPHA' : 'PRO'}
              </span>
              {/* TODO: backend должен отдавать generated_at для точного таймстемпа */}
              <span className="text-[10px] font-mono text-text-muted">Обновлено недавно</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
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
          </div>

          {/* Situation summary — ведущая thesis-style */}
          <div className="border-l-2 border-accent/30 pl-3 mb-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1.5">СИТУАЦИЯ</p>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {aiSummary.situation_summary}
            </p>
          </div>

          {/* ФАКТОРЫ */}
          {aiSummary.key_factors?.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">ФАКТОРЫ</p>
              <div className="flex flex-col gap-3">
                {aiSummary.key_factors.map((f, i) => {
                  const isObj = typeof f === 'object' && f !== null
                  const factor = isObj ? (f as KeyFactor).factor : String(f)
                  const desc = isObj ? (f as KeyFactor).description : ''
                  const impact = isObj ? (f as KeyFactor).impact : 'neutral'
                  const weight = isObj ? ((f as KeyFactor).weight ?? 0.5) : 0.5
                  const impactCls = impact === 'bullish' ? 'text-accent' : impact === 'bearish' ? 'text-danger' : 'text-text-muted/60'
                  const barCls   = impact === 'bullish' ? 'bg-accent' : impact === 'bearish' ? 'bg-danger' : 'bg-text-muted/30'
                  const icon     = impact === 'bullish' ? '↑' : impact === 'bearish' ? '↓' : '→'
                  return (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[13px] font-mono font-bold shrink-0 w-4 ${impactCls}`}>{icon}</span>
                        <span className="text-[12px] font-medium text-text-primary flex-1 leading-snug">{factor}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-16 h-1 bg-bg-elevated rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${Math.round(weight * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-text-muted w-6 text-right">{Math.round(weight * 10)}/10</span>
                        </div>
                      </div>
                      {desc && <p className="text-[11px] text-text-muted leading-relaxed pl-6">{desc}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* СЦЕНАРИИ — Alpha-gated */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest">СЦЕНАРИИ</p>
              {!isAlpha && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-bg-border text-text-muted uppercase tracking-wider">
                  Только Alpha
                </span>
              )}
            </div>
            {isAlpha && aiSummary.scenarios?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {aiSummary.scenarios.map((s, i) => {
                  const cfg = s.label === 'bull'
                    ? { border: 'border-accent/30 bg-accent/5', lbl: 'text-accent', prob: 'text-accent' }
                    : s.label === 'bear'
                    ? { border: 'border-danger/30 bg-danger/5', lbl: 'text-danger', prob: 'text-danger' }
                    : { border: 'border-bg-border bg-bg-elevated/30', lbl: 'text-text-muted', prob: 'text-text-secondary' }
                  const scLabel = SCENARIO_LABELS[s.label] ?? s.label.toUpperCase()
                  return (
                    <div key={i} className={`rounded-lg border p-3 ${cfg.border}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${cfg.lbl}`}>{scLabel}</span>
                        <span className={`text-sm font-mono font-bold ${cfg.prob}`}>{s.probability}%</span>
                      </div>
                      <p className="text-[11px] font-medium text-text-primary mb-1 leading-snug">{s.title}</p>
                      <p className="text-[10px] text-text-muted leading-relaxed">{s.description}</p>
                    </div>
                  )
                })}
              </div>
            ) : isAlpha ? (
              <div className="flex items-center justify-between bg-bg-elevated/30 border border-bg-border rounded-lg px-3 py-2">
                <p className="text-[11px] font-mono text-text-muted">
                  Перезапустите анализ, чтобы получить сценарии.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="text-[10px] font-mono font-bold text-accent/80 hover:text-accent transition-colors disabled:opacity-50 shrink-0 ml-3"
                >
                  {analyzing ? 'Анализ...' : '↻ Перезапустить'}
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 blur-sm opacity-40 pointer-events-none select-none">
                  {['БЫК', 'БАЗА', 'МЕДВ'].map((lbl) => (
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
                    onClick={() => setPaywallVariant('alpha')}
                    className="px-3 py-1.5 bg-bg-surface border border-accent/30 text-[10px] font-mono font-bold text-accent hover:border-accent/60 rounded-lg transition-colors"
                  >
                    Разблокировать Alpha
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isPro && !aiSummary ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-2">AI АНАЛИЗ</p>
          <p className="text-xs text-text-muted mb-4">{t('markets.no_analysis')}</p>
          {analyzeError && (
            <p className="text-xs font-mono text-danger mb-3">{analyzeError}</p>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-accent text-bg-base text-xs font-mono font-bold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {analyzing ? 'Анализ...' : 'Анализировать'}
          </button>
        </div>
      ) : !isPro ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest">AI АНАЛИЗ</p>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-bg-border text-text-muted uppercase tracking-wider">
              Только Pro
            </span>
          </div>
          <div className="space-y-2 blur-[3px] opacity-60 pointer-events-none select-none">
            <div className="h-3 w-full bg-bg-elevated rounded" />
            <div className="h-3 w-5/6 bg-bg-elevated rounded" />
            <div className="h-3 w-4/5 bg-bg-elevated rounded" />
            <div className="h-3 w-3/4 bg-bg-elevated rounded" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setPaywallVariant('pro')}
              className="px-4 py-2 bg-accent text-bg-base text-xs font-mono font-bold rounded-lg hover:bg-accent/90 transition-colors"
            >
              Разблокировать Pro — $14.99/мес
            </button>
          </div>
        </div>
      ) : null}

      {/* ── 4. Context / Background ── */}
      {context ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">КОНТЕКСТ</p>
          <p className="text-[13px] text-text-muted leading-relaxed">{context}</p>
        </div>
      ) : null}

      {/* ── 5. Связанные рынки ── */}
      {event.markets?.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest">СВЯЗАННЫЕ РЫНКИ</p>
            <span className="text-[10px] font-mono text-text-muted">{event.markets.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {event.markets.map((m) => {
              const a = m.analysis
              const recCfg = a?.recommendation ? (REC_CONFIG[a.recommendation] ?? REC_CONFIG.skip) : null
              const hasEdge = isAlpha && a?.fair_prob != null && a?.edge_score != null
              const edgePos = (a?.edge_score ?? 0) >= 0
              const prob = m.price != null ? Math.round(m.price) : null
              const statusInput = { yesPrice: m.price != null ? m.price / 100 : null, resolutionDate: m.resolves_at }
              return (
                <div
                  key={m.id}
                  onClick={() => router.push(`/markets/${m.id}`)}
                  className="bg-bg-surface border border-bg-border rounded-lg px-4 py-3 cursor-pointer
                    hover:bg-bg-elevated/60 hover:border-text-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {m.outcome_label && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-accent/30 bg-accent/5 text-accent uppercase tracking-wider">
                            {m.outcome_label}
                          </span>
                        )}
                        <p className="text-[13px] font-medium text-text-primary leading-snug line-clamp-2 flex-1">{m.question}</p>
                        <MarketStatusBadge market={statusInput} size="xs" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                          {m.platform}
                        </span>
                        {m.volume > 0 && (
                          <>
                            <span className="text-text-muted/40 text-[10px]">·</span>
                            <span className="text-[10px] font-mono text-text-muted">
                              VOL <span className="text-text-secondary">{formatVolume(m.volume)}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-[64px]">
                      <p className="text-[18px] font-mono font-bold text-accent leading-none">
                        {prob != null ? `${prob}%` : '—'}
                      </p>
                      {hasEdge && (
                        <p className={`text-[10px] font-mono font-bold mt-1 ${edgePos ? 'text-accent' : 'text-danger'}`}>
                          {edgePos ? '+' : ''}{a!.edge_score}pp
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Analysis row (Pro+) */}
                  {isPro && a && (recCfg || hasEdge || a.confidence_score != null) && (
                    <div className="mt-2.5 pt-2.5 border-t border-bg-border">
                      <div className="flex items-center gap-2 flex-wrap">
                        {recCfg && (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${recCfg.cls}`}>
                            {recCfg.label}
                          </span>
                        )}
                        {hasEdge && (
                          <>
                            <span className="text-[10px] font-mono text-text-muted">
                              fair <span className="text-text-secondary font-bold">{a!.fair_prob}%</span>
                            </span>
                            <span className="text-text-muted/45 text-[10px]">·</span>
                            <span className="text-[10px] font-mono text-text-muted">
                              kelly <span className="text-text-secondary font-bold">{a!.kelly_fraction?.toFixed(1)}%</span>
                            </span>
                          </>
                        )}
                        {a.confidence_score != null && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <div className="w-16 h-1 bg-bg-elevated rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-text-muted/50"
                                style={{ width: `${a.confidence_score}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-text-muted">{a.confidence_score}%</span>
                          </div>
                        )}
                      </div>
                      {isAlpha && a.thesis && (
                        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 mt-2">{a.thesis}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 6. Timeline ── */}
      {event.timeline && event.timeline.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">ХРОНОЛОГИЯ</p>
          <div className="relative pl-4 border-l border-bg-border flex flex-col gap-4">
            {event.timeline.map((entry, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-bg-border border border-bg-elevated" />
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-0.5">
                  {new Date(entry.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')}
                </p>
                <p className="text-[12px] text-text-secondary leading-snug">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. Watch button ── */}
      <div className="pt-2">
        <button
          onClick={handleWatch}
          disabled={watchAdded}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-mono font-bold transition-colors ${
            watchAdded
              ? 'border-accent/30 bg-accent/10 text-accent cursor-default'
              : 'border-bg-border text-text-muted hover:border-text-muted/40 hover:text-text-secondary'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={watchAdded ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {watchAdded ? 'В списке' : 'Следить'}
        </button>
      </div>

      {paywallVariant && (
        <PaywallModal
          variant={paywallVariant}
          onClose={() => setPaywallVariant(null)}
        />
      )}
    </div>
  )
}
