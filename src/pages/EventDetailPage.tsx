import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import PaywallModal from '../components/PaywallModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineEntry {
  date: string
  text: string
}

interface RelatedMarket {
  id: string
  question: string
  platform: string
  price: number
  volume: number
}

interface EventDetail {
  id: string
  title: string
  summary: string
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'active' | 'resolved'
  updated_at: string
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  uncertainty_level?: 'LOW' | 'MEDIUM' | 'HIGH'
  ai_summary?: {
    situation_summary: string
    key_factors: string[]
    overall_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    uncertainty_level: 'LOW' | 'MEDIUM' | 'HIGH'
  }
  markets: RelatedMarket[]
  timeline?: TimelineEntry[]
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
  LOW:    { label: 'LOW uncertainty',    cls: 'text-accent/80 border-accent/20' },
  MEDIUM: { label: 'MED uncertainty', cls: 'text-watch border-watch/30' },
  HIGH:   { label: 'HIGH uncertainty',   cls: 'text-danger border-danger/25' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isPro, isAlpha } = useAuthContext()
  const [paywallVariant, setPaywallVariant] = useState<'pro' | 'alpha' | null>(null)
  const [watchAdded, setWatchAdded] = useState(false)

  const { data: event, loading } = usePolling<EventDetail>(
    () => api.getEvent(id!) as Promise<EventDetail>,
    5 * 60 * 1000,
  )

  async function handleWatch() {
    if (!id) return
    try {
      await api.addToWatchlist({ type: 'event', id })
      setWatchAdded(true)
    } catch {
      setWatchAdded(true) // optimistic
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-3 w-20 bg-bg-elevated rounded" />
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

  const sentCfg = event.sentiment ? SENTIMENT_CONFIG[event.sentiment] : null
  const uncertCfg = event.uncertainty_level ? UNCERTAINTY_CONFIG[event.uncertainty_level] : null
  const aiSummary = event.ai_summary

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

      {/* ── 1. Заголовок + статус ── */}
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
        <p className="text-sm font-mono text-text-muted leading-relaxed">{event.summary}</p>
      </div>

      {/* ── 2. AI Summary (Pro/Alpha) ── */}
      {isPro && aiSummary ? (
        <div className="bg-bg-surface border border-accent/15 rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-4">AI ANALYSIS</p>

          <p className="text-sm font-mono text-text-secondary leading-relaxed mb-4">
            {aiSummary.situation_summary}
          </p>

          {aiSummary.key_factors?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-mono text-text-muted tracking-wider mb-2">KEY FACTORS</p>
              <ul className="space-y-1.5">
                {aiSummary.key_factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-mono text-text-secondary">
                    <span className="text-accent/60 shrink-0 mt-0.5">▸</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
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
      ) : isPro && !aiSummary ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-5 mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-2">AI ANALYSIS</p>
          <p className="text-xs font-mono text-text-muted">AI analysis is being generated. Check back soon.</p>
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

      {/* ── 3. Связанные рынки ── */}
      {event.markets?.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-mono font-bold text-text-muted tracking-widest mb-3">RELATED MARKETS</p>
          <div className="flex flex-col gap-2">
            {event.markets.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/markets/${m.id}`)}
                className="flex items-center gap-3 bg-bg-surface border border-bg-border rounded-lg px-4 py-3 cursor-pointer hover:border-text-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-mono text-text-secondary truncate">{m.question}</p>
                  <p className="text-[10px] font-mono text-text-muted mt-0.5">{m.platform}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold text-text-primary">{m.price.toFixed(0)}%</p>
                  {m.volume > 0 && (
                    <p className="text-[10px] font-mono text-text-muted">{formatVolume(m.volume)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Timeline ── */}
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

      {/* ── 5. Watch button ── */}
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
