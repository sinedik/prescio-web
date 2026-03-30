import { useState, useEffect, useRef } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useParams, useNavigate } from 'react-router-dom'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import PaywallModal from '../components/PaywallModal'
import AnalysisLoader from '../AnalysisLoader'
import { markAnalyzing, clearAnalyzing, isAnalyzing, markAnalyzed } from '../lib/activeAnalyses'

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
  platform: string
  slug?: string
  price: number
  volume: number
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

const SENTIMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  BULLISH: { label: 'BULLISH', cls: 'text-accent bg-accent/10 border-accent/30' },
  BEARISH: { label: 'BEARISH', cls: 'text-danger bg-danger/10 border-danger/30' },
  NEUTRAL: { label: 'NEUTRAL', cls: 'text-text-muted bg-bg-elevated border-bg-border' },
}

const UNCERTAINTY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW:    { label: 'LOW uncertainty',  cls: 'text-accent/80 border-accent/20' },
  MEDIUM: { label: 'MED uncertainty',  cls: 'text-watch border-watch/30' },
  HIGH:   { label: 'HIGH uncertainty', cls: 'text-danger border-danger/25' },
}

const REC_CONFIG: Record<string, { label: string; cls: string }> = {
  strong_enter: { label: 'STRONG ENTER', cls: 'text-accent border-accent/60 bg-accent/15' },
  enter:        { label: 'ENTER',        cls: 'text-accent border-accent/40 bg-accent/10' },
  watch:        { label: 'WATCH',        cls: 'text-watch border-watch/40 bg-watch/10' },
  skip:         { label: 'SKIP',         cls: 'text-text-muted border-bg-border' },
  avoid:        { label: 'AVOID',        cls: 'text-danger border-danger/40 bg-danger/10' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isPro, isAlpha } = useAuthContext()
  const [paywallVariant, setPaywallVariant] = useState<'pro' | 'alpha' | null>(null)
  const [watchAdded, setWatchAdded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [localAnalysis, setLocalAnalysis] = useState<Pick<EventDetail, 'ai_summary' | 'sentiment' | 'uncertainty_level'> | null>(null)
  const prevIsAlpha = useRef(isAlpha)

  const { data: event, loading } = usePolling<EventDetail>(
    () => api.getEvent(id!) as Promise<EventDetail>,
    5 * 60 * 1000,
    id, // refetch when id changes
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

  // Enrichment polling: poll every 3s until status = ready
  const enrichTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [enrichedEvent, setEnrichedEvent] = useState<Partial<EventDetail> | null>(null)

  useEffect(() => {
    if (!event || !id) return
    if (event.enrichment_status === 'ready' || event.enrichment_status === 'failed') return

    const poll = async () => {
      try {
        const fresh = await api.getEvent(id) as EventDetail
        if (fresh.enrichment_status === 'ready') {
          setEnrichedEvent({
            description: fresh.description,
            image_url: fresh.image_url,
            context: fresh.context,
            enrichment_status: fresh.enrichment_status,
          })
          return
        }
        if (fresh.enrichment_status === 'failed') {
          setEnrichedEvent({ enrichment_status: 'failed' })
          return
        }
        enrichTimerRef.current = setTimeout(poll, 3000)
      } catch {
        enrichTimerRef.current = setTimeout(poll, 5000)
      }
    }

    enrichTimerRef.current = setTimeout(poll, 3000)
    return () => {
      if (enrichTimerRef.current) clearTimeout(enrichTimerRef.current)
    }
  }, [event?.id, event?.enrichment_status, id])

  usePageTitle(event?.title ?? '')

  async function handleAnalyze() {
    if (!id) return
    setAnalyzing(true)
    setAnalyzeError(null)
    markAnalyzing('event', id)
    try {
      await api.analyzeEvent(id)

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
      setAnalyzeError('Analysis is taking too long. Refresh the page in a moment.')
    } catch (err: unknown) {
      const e = err as { type?: string; limit?: number }
      if (e?.type === 'limit_reached') {
        setAnalyzeError(`Daily limit reached (${e.limit ?? 3} analyses/day). Upgrade to Pro for unlimited.`)
      } else {
        setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
      }
    } finally {
      clearAnalyzing('event', id)
      setAnalyzing(false)
    }
  }

  async function handleWatch() {
    if (!id) return
    try {
      await api.addToWatchlist({ type: 'event', id })
      setWatchAdded(true)
    } catch {
      setWatchAdded(true)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-3 w-20 bg-bg-elevated rounded" />
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
      <div className="max-w-3xl mx-auto px-4 py-6 text-center py-20">
        <p className="text-sm font-mono text-text-muted">EVENT NOT FOUND</p>
        <button onClick={() => navigate('/feed')} className="mt-4 text-xs font-mono text-accent hover:text-accent/80">
          Back to feed
        </button>
      </div>
    )
  }

  const effectiveSentiment = localAnalysis?.sentiment ?? event.sentiment
  const effectiveUncertainty = localAnalysis?.uncertainty_level ?? event.uncertainty_level
  const aiSummary = localAnalysis?.ai_summary ?? event.ai_summary

  const sentCfg = effectiveSentiment ? SENTIMENT_CONFIG[effectiveSentiment] : null
  const uncertCfg = effectiveUncertainty ? UNCERTAINTY_CONFIG[effectiveUncertainty] : null

  // Merge enrichment data from polling into event fields
  const enrichStatus = enrichedEvent?.enrichment_status ?? event.enrichment_status ?? 'pending'
  const imageUrl = enrichedEvent?.image_url ?? event.image_url ?? null
  const description = enrichedEvent?.description ?? event.description ?? null
  const context = enrichedEvent?.context ?? event.context ?? null
  const enrichPending = enrichStatus === 'pending'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate('/feed')}
        className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors mb-5"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        FEED
      </button>

      {/* ── 1. Hero image ── */}
      {enrichPending ? (
        <div className="w-full h-48 bg-bg-elevated rounded-xl mb-5 animate-pulse" />
      ) : imageUrl ? (
        <div className="w-full h-48 rounded-xl mb-5 overflow-hidden">
          <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" />
        </div>
      ) : null}

      {/* ── 2. Заголовок + статус ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-bg-border bg-bg-elevated text-text-muted uppercase tracking-wider">
            {event.category}
          </span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
            event.severity === 'CRITICAL' ? 'text-danger border-danger/60' :
            event.severity === 'HIGH'     ? 'text-danger border-danger/40' :
            event.severity === 'MEDIUM'   ? 'text-watch border-watch/30' :
            'text-text-muted border-bg-border'
          }`}>
            {event.severity}
          </span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
            event.status === 'active'
              ? 'text-accent border-accent/30 bg-accent/5'
              : 'text-text-muted border-bg-border'
          }`}>
            {event.status}
          </span>
        </div>

        <h1 className="text-xl font-mono font-bold text-text-primary leading-snug mb-2">
          {event.title}
        </h1>

        {/* Description (enriched) or summary fallback */}
        {enrichPending ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-3 w-full bg-bg-elevated rounded" />
            <div className="h-3 w-5/6 bg-bg-elevated rounded" />
            <div className="h-3 w-4/5 bg-bg-elevated rounded" />
          </div>
        ) : (
          <p className="text-sm font-mono text-text-muted leading-relaxed">
            {description ?? event.summary}
          </p>
        )}
      </div>

      {/* ── 3. AI Summary (Pro/Alpha) ── */}
      {isPro && analyzing ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-4">AI ANALYSIS</p>
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
          {/* Header: label + badges */}
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest">AI ANALYSIS</p>
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
              {aiSummary.next_key_date && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-bg-border text-text-muted">
                  {new Date(aiSummary.next_key_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          {/* Situation summary */}
          <p className="text-sm font-mono text-text-secondary leading-relaxed mb-5">
            {aiSummary.situation_summary}
          </p>

          {/* Key factors */}
          {aiSummary.key_factors?.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">KEY FACTORS</p>
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
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[12px] font-mono font-bold shrink-0 w-4 ${impactCls}`}>{icon}</span>
                        <span className="text-[12px] font-mono font-bold text-text-primary flex-1">{factor}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-16 h-1 bg-bg-elevated rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${Math.round(weight * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-text-muted w-5 text-right">{Math.round(weight * 10)}</span>
                        </div>
                      </div>
                      {desc && <p className="text-[11px] font-mono text-text-muted leading-relaxed pl-6">{desc}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Scenarios */}
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-3">SCENARIOS</p>
            {isAlpha && aiSummary.scenarios?.length ? (
              <div className="grid grid-cols-3 gap-2">
                {aiSummary.scenarios.map((s, i) => {
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
            ) : isAlpha ? (
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-mono text-text-muted">
                  Re-analyze to generate scenario breakdown.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="text-[10px] font-mono font-bold text-accent/70 hover:text-accent transition-colors disabled:opacity-50 shrink-0 ml-3"
                >
                  {analyzing ? 'Analyzing...' : '↻ Re-analyze'}
                </button>
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
                    onClick={() => setPaywallVariant('alpha')}
                    className="px-3 py-1.5 bg-bg-surface border border-bg-border text-[10px] font-mono font-bold text-text-muted hover:border-text-muted/40 hover:text-text-secondary rounded-lg transition-colors"
                  >
                    Alpha only
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : isPro && !aiSummary ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-2">AI ANALYSIS</p>
          <p className="text-xs font-mono text-text-muted mb-4">No analysis yet.</p>
          {analyzeError && (
            <p className="text-xs font-mono text-danger mb-3">{analyzeError}</p>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-accent text-bg-base text-xs font-mono font-bold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        </div>
      ) : !isPro ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6 relative overflow-hidden">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">AI ANALYSIS</p>
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
              Unlock AI Analysis
            </button>
          </div>
        </div>
      ) : null}

      {/* ── 4. Context (enriched background) ── */}
      {enrichPending ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6 animate-pulse">
          <div className="h-2.5 w-24 bg-bg-elevated rounded mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-bg-elevated rounded" />
            <div className="h-3 w-full bg-bg-elevated rounded" />
            <div className="h-3 w-3/4 bg-bg-elevated rounded" />
          </div>
        </div>
      ) : context ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">BACKGROUND</p>
          <p className="text-sm font-mono text-text-muted leading-relaxed">{context}</p>
        </div>
      ) : null}

      {/* ── 5. Связанные рынки ── */}
      {event.markets?.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">RELATED MARKETS</p>
          <div className="flex flex-col gap-2">
            {event.markets.map((m) => {
              const a = m.analysis
              const recCfg = a?.recommendation ? (REC_CONFIG[a.recommendation] ?? REC_CONFIG.skip) : null
              const hasEdge = isAlpha && a?.fair_prob != null && a?.edge_score != null
              const edgePos = (a?.edge_score ?? 0) >= 0
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/markets/${m.id}`)}
                  className="bg-bg-surface border border-bg-border rounded-lg px-4 py-3 cursor-pointer hover:border-text-muted/30 transition-colors"
                >
                  {/* Top row: question + price */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-mono text-text-secondary leading-snug">{m.question}</p>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5">{m.platform}{m.volume > 0 ? ` · ${formatVolume(m.volume)}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-text-primary">{m.price.toFixed(0)}%</p>
                      {hasEdge && (
                        <p className={`text-[10px] font-mono font-bold ${edgePos ? 'text-accent' : 'text-danger'}`}>
                          {edgePos ? '+' : ''}{a!.edge_score}pp
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Analysis row (Pro+) */}
                  {isPro && a && (
                    <div className="mt-2.5 pt-2.5 border-t border-bg-border">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
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
                            <span className="text-text-muted/30 text-[10px]">·</span>
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
                        <p className="text-[11px] font-mono text-text-muted leading-relaxed line-clamp-2">{a.thesis}</p>
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
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">TIMELINE</p>
          <div className="relative pl-4 border-l border-bg-border flex flex-col gap-4">
            {event.timeline.map((entry, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-bg-border border border-bg-elevated" />
                <p className="text-[10px] font-mono text-text-muted mb-0.5">
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs font-mono text-text-secondary">{entry.text}</p>
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
          {watchAdded ? 'Watching' : 'Watch Event'}
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
