'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { sportApi } from '../lib/api'
import { getCached, setCached } from '../lib/clientCache'
import { useAuthContext } from '../contexts/AuthContext'
import { useSportWs } from '../hooks/useSportWs'
import type { SportEvent, SportOdds, SportPrediction, SportStanding, SportInjury, SubscriptionPlan, SportLineup, SportFixtureStat, SportMatchEvent, SportTopScorer } from '../types/index'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { mix } from '../components/disciplines'

export type EventFastCache = { event: SportEvent; form: { home_form: FormEntry[] | null; away_form: FormEntry[] | null } | null; prediction: SportPrediction | null | undefined }
type EventDetailsCache = { standings: SportStanding[]; topScorers: SportTopScorer[]; homeInj: SportInjury[]; awayInj: SportInjury[]; lineups: SportLineup[]; matchStats: SportFixtureStat[]; matchEvents: SportMatchEvent[] }

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORT_ACCENT: Record<string, string> = {
  football:   'var(--sport-football)',
  basketball: 'var(--sport-basketball)',
  tennis:     'var(--sport-tennis)',
  mma:        'var(--sport-mma)',
}
const MARKET_TAB_KEYS: Record<string, 'sport.market.h2h' | 'sport.market.totals' | 'sport.market.spreads' | 'sport.market.btts'> = {
  h2h: 'sport.market.h2h', totals: 'sport.market.totals', spreads: 'sport.market.spreads', btts: 'sport.market.btts',
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FormResult = 'W' | 'D' | 'L'
type FormEntry = { result: FormResult; home: string; away: string; score: string; date: string }
const FORM_COLOR: Record<FormResult, string> = { W: '#61DF6E', D: '#596470', L: '#E55E5B' }
const AWAY_BAR = 'rgba(var(--surface-tint-rgb),0.28)'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string) {
  const w = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : (name ?? '--').slice(0, 2).toUpperCase()
}
function pct(s: string | undefined) { return parseFloat(s ?? '0') || 0 }
function formSummary(form: FormEntry[] | null): string {
  if (!form?.length) return ''
  const c = { W: 0, D: 0, L: 0 }
  for (const f of form) c[f.result]++
  return [c.W && `W${c.W}`, c.D && `D${c.D}`, c.L && `L${c.L}`].filter(Boolean).join('')
}

interface AggOutcome { name: string; best: number; avg: number; implied: number }
function aggregateMarket(odds: SportOdds[], type: string): AggOutcome[] {
  const filtered = odds.filter(o => o.market_type === type)
  if (!filtered.length) return []
  const nameOrder: string[] = []
  for (const o of filtered) for (const out of o.outcomes) if (!nameOrder.includes(out.name)) nameOrder.push(out.name)
  return nameOrder.map(name => {
    const prices = filtered.flatMap(o => o.outcomes).filter(o => o.name === name).map(o => o.price).filter(p => p > 0)
    if (!prices.length) return null
    const best = Math.max(...prices)
    const avg  = prices.reduce((a, b) => a + b, 0) / prices.length
    return { name, best, avg: Math.round(avg * 100) / 100, implied: Math.round((100 / best) * 10) / 10 }
  }).filter(Boolean) as AggOutcome[]
}

// ─── TeamAvatar ───────────────────────────────────────────────────────────────
function TeamAvatar({ name, logo, accent, size = 68 }: { name: string; logo?: string | null; accent: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <div className="rounded-2xl flex items-center justify-center border-2 overflow-hidden shrink-0"
      style={{ width: size, height: size, background: mix(accent, 3), borderColor: mix(accent, 15) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={name} loading="lazy" onError={() => setErr(true)} style={{ width: size * 0.72, height: size * 0.72, objectFit: 'contain' }} />
    </div>
  )
  return (
    <div className="rounded-2xl flex items-center justify-center border-2 font-bold shrink-0"
      style={{ width: size, height: size, background: mix(accent, 7), borderColor: mix(accent, 19), color: accent, fontSize: size * 0.22 }}>
      {abbr(name)}
    </div>
  )
}

// ─── PlayerAvatar (фото + fallback инициалы) ──────────────────────────────────
function PlayerAvatar({ name, photo, size = 34 }: { name: string | null; photo?: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  if (photo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name ?? ''} loading="lazy" onError={() => setErr(true)}
      className="rounded-full object-cover shrink-0 border border-bg-border"
      style={{ width: size, height: size }} />
  )
  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']
  const color = COLORS[(name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, background: `${color}22`, border: `1.5px solid ${color}55`, color, fontSize: Math.round(size * 0.3) }}>
      {abbr(name ?? '?')}
    </div>
  )
}

// ─── FormDots ─────────────────────────────────────────────────────────────────
function FormDots({ form, align = 'left' }: { form: FormEntry[] | null; align?: 'left' | 'right' }) {
  const dots: (FormEntry | null)[] = form ?? Array(5).fill(null)
  return (
    <div className={`flex gap-1 sm:gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {dots.map((f, i) => f ? (
        <div key={i} title={`${f.home} ${f.score} ${f.away}`}
          className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold shrink-0"
          style={{ background: FORM_COLOR[f.result], color: f.result === 'W' ? '#052010' : '#fff' }}>
          {f.result}
        </div>
      ) : (
        <div key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-bg-border bg-bg-elevated animate-pulse shrink-0" />
      ))}
    </div>
  )
}

// ─── ProbBar ──────────────────────────────────────────────────────────────────
function ProbBar({ home, draw, away, homeName, awayName, accent }: {
  home: number; draw: number | null; away: number; homeName: string; awayName: string; accent: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted text-center mb-0.5">{t('sport.win_probability')}</p>
      <div className="flex justify-between px-0.5 text-[15px] font-mono font-bold">
        <span style={{ color: accent }}>{home}%</span>
        {draw != null && <span className="text-text-secondary">{draw}%</span>}
        <span className="text-text-primary">{away}%</span>
      </div>
      <div className="flex h-[6px] rounded-full overflow-hidden w-full">
        <div className="h-full" style={{ width: `${home}%`, background: accent, borderRadius: '99px 0 0 99px' }} />
        {draw != null && draw > 0 && <div className="h-full" style={{ width: `${draw}%`, background: 'rgba(89,100,112,0.7)' }} />}
        <div className="h-full flex-1" style={{ background: AWAY_BAR, borderRadius: '0 99px 99px 0' }} />
      </div>
      <div className="flex justify-between px-0.5 text-[11px] font-mono text-text-muted">
        <span>{homeName.split(' ').slice(0, 2).join(' ')}</span>
        {draw != null && <span>{t('sport.draw')}</span>}
        <span>{awayName.split(' ').slice(0, 2).join(' ')}</span>
      </div>
    </div>
  )
}

// ─── CompareBar ───────────────────────────────────────────────────────────────
function CompareBar({ label, homeVal, awayVal, accent }: {
  label: string; homeVal: number; awayVal: number; accent: string
}) {
  const total = homeVal + awayVal || 100
  const homePct = Math.round((homeVal / total) * 100)
  const awayPct = 100 - homePct
  return (
    <div className="flex items-center gap-3 min-h-[44px]">
      <span className="text-[13px] font-mono font-bold w-10 text-right text-text-primary tabular-nums">{homePct}%</span>
      <div className="flex flex-1 h-[5px] rounded-full overflow-hidden">
        <div style={{ width: `${homePct}%`, background: accent, borderRadius: '99px 0 0 99px' }} />
        <div style={{ flex: 1, background: AWAY_BAR, borderRadius: '0 99px 99px 0' }} />
      </div>
      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider w-24 text-center shrink-0">{label}</span>
      <div className="flex flex-1 h-[5px] rounded-full overflow-hidden flex-row-reverse">
        <div style={{ width: `${awayPct}%`, background: AWAY_BAR, borderRadius: '99px 0 0 99px' }} />
        <div style={{ flex: 1, background: accent, opacity: 0.25, borderRadius: '0 99px 99px 0' }} />
      </div>
      <span className="text-[13px] font-mono font-bold w-10 text-text-primary tabular-nums">{awayPct}%</span>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ id, title, children, action }: { id?: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-16">
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-text-secondary">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Section Nav ──────────────────────────────────────────────────────────────
function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { threshold: 0.3, rootMargin: '-60px 0px -60% 0px' }
    )
    items.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [items])

  const scroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-bg-border relative"
      style={{ background: 'rgba(var(--bg-base-rgb), 0.92)', backdropFilter: 'blur(12px)' }}>
      <div className="px-4 py-2 flex gap-1.5 overflow-x-auto">
        {items.map(({ id, label }) => (
          <button key={id} onClick={() => scroll(id)}
            className="px-3 py-1.5 rounded-full text-[11px] font-mono whitespace-nowrap transition-all shrink-0"
            style={active === id
              ? { background: 'rgba(var(--surface-tint-rgb), 0.14)', color: 'rgb(var(--text-primary))', fontWeight: 700 }
              : { background: 'rgba(var(--surface-tint-rgb), 0.04)', color: 'rgb(var(--text-muted))' }
            }>
            {label}
          </button>
        ))}
        <div className="w-4 shrink-0" />
      </div>
      {/* scroll fade indicator */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10"
        style={{ background: 'linear-gradient(to right, transparent, rgba(var(--bg-base-rgb), 0.92))' }} />
    </div>
  )
}

// ─── AI Insight ───────────────────────────────────────────────────────────────
function AiInsightCard({ pred, odds, accent }: {
  pred: SportPrediction | null | undefined; odds: SportOdds[]; accent: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  if (pred === undefined) return (
    <div id="insight" className="rounded-xl border border-bg-border overflow-hidden scroll-mt-16"
      style={{ borderLeft: '3px solid #22c55e', background: 'rgba(34,197,94,0.03)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: '#22c55e20' }}>
          <span style={{ color: '#22c55e' }}>⚡</span>
        </div>
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase" style={{ color: '#22c55e90' }}>{t('sport.insight_source')}</span>
      </div>
      <div className="px-4 py-5 flex flex-col gap-2.5">
        {[100, 80, 55].map((w, i) => <div key={i} className="h-2.5 rounded animate-pulse bg-bg-elevated" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  )
  if (!pred) return null

  const bkCount = new Set(odds.map(o => o.bookmaker)).size
  const bestAiVal = odds.map(o => o.ai_value).filter(Boolean).sort((a, b) => (b?.confidence ?? 0) - (a?.confidence ?? 0))[0]
  const maxPct = Math.max(pred.home_pct, pred.away_pct)
  const confidence = maxPct >= 60 ? t('sport.high_confidence') : maxPct >= 50 ? t('sport.medium_confidence') : t('sport.low_confidence')
  const advice = pred.advice ?? (pred.winner_name ? `${pred.winner_name}. ${pred.winner_comment ?? ''}`.trim() : null)

  return (
    <div id="insight" className="rounded-xl border border-bg-border overflow-hidden scroll-mt-16"
      style={{ borderLeft: '3px solid #22c55e', background: 'rgba(34,197,94,0.04)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: '#22c55e20' }}>
          <span style={{ color: '#22c55e' }}>⚡</span>
        </div>
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase" style={{ color: '#22c55e90' }}>{t('sport.insight_source')}</span>
        <div className="ml-auto px-2.5 py-1 rounded text-[10px] font-mono font-semibold shrink-0" style={{ background: '#22c55e18', color: '#22c55e' }}>
          {confidence}
        </div>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">
        {advice && (
          <p className="text-[16px] text-text-primary leading-relaxed font-medium">{advice}</p>
        )}
        {/* Prediction pcts as badges */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col items-center py-2.5 rounded-lg" style={{ background: mix(accent, 7), border: `1px solid ${mix(accent, 19)}` }}>
            <span className="text-[18px] font-mono font-black" style={{ color: accent }}>{pred.home_pct}%</span>
            <span className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider mt-0.5">{t('sport.home')}</span>
          </div>
          {pred.draw_pct != null && (
            <div className="flex-1 flex flex-col items-center py-2.5 rounded-lg border border-bg-border bg-bg-elevated">
              <span className="text-[18px] font-mono font-black text-text-muted/60">{pred.draw_pct}%</span>
              <span className="text-[9px] font-mono text-text-muted/40 uppercase tracking-wider mt-0.5">{t('sport.draw')}</span>
            </div>
          )}
          <div className="flex-1 flex flex-col items-center py-2.5 rounded-lg border border-bg-border bg-bg-elevated">
            <span className="text-[18px] font-mono font-black text-text-muted/70">{pred.away_pct}%</span>
            <span className="text-[9px] font-mono text-text-muted/40 uppercase tracking-wider mt-0.5">{t('sport.away')}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {bestAiVal?.value_rating != null && (
            <div className="px-3 py-1.5 rounded text-[10px] font-mono font-bold"
              style={{ background: mix(accent, 8), color: accent, border: `1px solid ${mix(accent, 21)}` }}>
              Edge +{bestAiVal.value_rating}% · {bestAiVal.suggested_side ?? pred.winner_name}
            </div>
          )}
          {bestAiVal?.confidence != null && (
            <div className="px-3 py-1.5 rounded text-[10px] font-mono border border-bg-border text-text-muted/60">
              Kelly: {(bestAiVal.confidence * 4.2).toFixed(1)}{t('sport.kelly_bank')}
            </div>
          )}
          {bkCount > 0 && (
            <div className="px-3 py-1.5 rounded text-[10px] font-mono border border-bg-border text-text-muted/40">
              {bkCount} {t('sport.data_sources')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── H2H ──────────────────────────────────────────────────────────────────────
function H2HSection({ h2h, homeId, awayId, homeName, awayName, accent }: {
  h2h: SportPrediction['h2h']
  homeId: number | null; awayId: number | null
  homeName: string; awayName: string; accent: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!h2h?.length) return null

  const homeWins = h2h.filter(m => {
    const hIsHome = m.teams.home.id === homeId
    const hG = hIsHome ? (m.goals.home ?? 0) : (m.goals.away ?? 0)
    const aG = hIsHome ? (m.goals.away ?? 0) : (m.goals.home ?? 0)
    return hG > aG
  }).length
  const draws    = h2h.filter(m => m.goals.home === m.goals.away).length
  const awayWins = h2h.length - homeWins - draws

  const total = homeWins + draws + awayWins || 1
  const homeWinPct = Math.round((homeWins / total) * 100)
  const drawPct    = Math.round((draws / total) * 100)
  const awayWinPct = 100 - homeWinPct - drawPct

  return (
    <Section id="h2h" title={lang === 'ru' ? `Head-to-Head · ${h2h.length} встреч` : `Head-to-Head · ${h2h.length} matches`}>
      {/* Summary numbers */}
      <div className="flex items-stretch border-b border-bg-border">
        {[
          { label: t('sport.home_wins'), sub: homeName, val: homeWins, color: accent },
          { label: t('sport.draws_count'), sub: '', val: draws, color: '#596470' },
          { label: t('sport.away_wins'), sub: awayName, val: awayWins, color: 'rgba(var(--surface-tint-rgb),0.85)' },
        ].map(({ label, sub, val, color }) => (
          <div key={label} className="flex-1 flex flex-col items-center py-5 gap-1 border-r border-bg-border last:border-r-0">
            <span className="text-4xl font-mono font-black leading-none" style={{ color }}>{val}</span>
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider text-center">{label}</span>
            {sub && <span className="text-[9px] font-mono text-text-muted truncate max-w-[80px] text-center">{sub}</span>}
          </div>
        ))}
      </div>
      {/* Proportional bar */}
      <div className="flex h-1.5 mx-4 my-3 rounded-full overflow-hidden gap-px">
        {homeWinPct > 0 && <div style={{ width: `${homeWinPct}%`, background: accent }} />}
        {drawPct > 0    && <div style={{ width: `${drawPct}%`, background: '#596470' }} />}
        {awayWinPct > 0 && <div style={{ flex: 1, background: AWAY_BAR }} />}
      </div>
      {/* Match list */}
      <div className="flex flex-col divide-y divide-bg-border/30 max-h-[300px] overflow-y-auto">
        {h2h.map(m => {
          const hG = m.goals.home ?? 0
          const aG = m.goals.away ?? 0
          const isHomeMatch = m.teams.home.id === homeId
          const ours   = isHomeMatch ? hG : aG
          const theirs = isHomeMatch ? aG : hG
          const result: FormResult = ours > theirs ? 'W' : ours < theirs ? 'L' : 'D'
          const homeWon = hG > aG
          const awayWon = aG > hG
          return (
            <div key={m.fixture.id} className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
              <span className="text-[11px] font-mono text-text-muted w-[80px] shrink-0">
                {new Date(m.fixture.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-[13px] truncate text-right flex-1 ${homeWon ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
                  {m.teams.home.name}
                </span>
                <span className="text-[14px] font-mono font-bold text-text-primary shrink-0 tabular-nums px-1">
                  {m.goals.home ?? '?'}:{m.goals.away ?? '?'}
                </span>
                <span className={`text-[13px] truncate flex-1 ${awayWon ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
                  {m.teams.away.name}
                </span>
              </div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: FORM_COLOR[result], color: result === 'W' ? '#052010' : '#fff' }}>
                {result}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Standings ────────────────────────────────────────────────────────────────
function StandingsSection({ standings, homeId, awayId, leagueName, accent }: {
  standings: SportStanding[]; homeId: number | null; awayId: number | null
  leagueName: string; accent: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  const [expanded, setExpanded] = useState(false)
  if (!standings.length) return null

  const highlighted = new Set([homeId, awayId].filter(Boolean) as number[])
  const SHOW = 6
  // When collapsed show teams + 2 neighbors; when expanded show all
  const visible = expanded ? standings : (() => {
    const idxs = standings.map((s, i) => highlighted.has(s.team_external_id) ? i : -1).filter(i => i >= 0)
    if (!idxs.length) return standings.slice(0, SHOW)
    const min = Math.max(0, Math.min(...idxs) - 1)
    const max = Math.min(standings.length - 1, Math.max(...idxs) + 1)
    return standings.slice(min, max + 1)
  })()

  const seasonYear = standings[0]?.season
  const seasonLabel = seasonYear ? `${seasonYear}/${String(seasonYear + 1).slice(-2)}` : ''

  return (
    <Section
      id="standings"
      title={lang === 'ru' ? `Турнирная таблица · ${leagueName} · ${seasonLabel}` : `Standings · ${leagueName} · ${seasonLabel}`}
      action={
        <button onClick={() => setExpanded(e => !e)}
          className="text-[10px] font-mono text-text-muted/50 hover:text-text-muted/80 transition-colors">
          {expanded ? t('sport.standings.collapse') : t('sport.standings.expand')}
        </button>
      }
    >
      <div className="flex flex-col">
        <div className="grid px-4 py-2 text-[10px] font-mono uppercase tracking-wide text-text-muted"
          style={{ gridTemplateColumns: '28px 1fr 44px 52px 52px' }}>
          <span>#</span><span>{t('sport.standings.team_col')}</span>
          <span className="text-right">{t('sport.standings.played_col')}</span>
          <span className="text-right">{t('sport.standings.points_col')}</span>
          <span className="text-right">{t('sport.standings.goal_diff_col')}</span>
        </div>
        <div className="flex flex-col divide-y divide-bg-border/20">
          {visible.map(s => {
            const isHL = highlighted.has(s.team_external_id)
            return (
              <div key={s.id}
                className="grid items-center px-4 py-2.5"
                style={{
                  gridTemplateColumns: '28px 1fr 44px 52px 52px',
                  background: isHL ? mix(accent, 3) : undefined,
                  borderLeft: isHL ? `2px solid ${accent}` : '2px solid transparent',
                }}>
                <span className="text-[11px] font-mono text-text-muted/50">{s.rank}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.team_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.team_logo} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 border"
                      style={{ background: isHL ? mix(accent, 31) : 'transparent', borderColor: isHL ? accent : 'rgba(var(--surface-tint-rgb),0.15)' }} />
                  )}
                  <span className={`text-[13px] truncate ${isHL ? 'font-bold' : 'text-text-secondary'}`}
                    style={isHL ? { color: accent } : {}}>
                    {s.team_name}
                  </span>
                </div>
                <span className="text-[12px] font-mono text-right text-text-muted">{s.played}</span>
                <span className="text-[13px] font-mono font-bold text-right"
                  style={isHL ? { color: accent } : { color: 'rgb(var(--text-primary))' }}>
                  {s.points}
                </span>
                <span className="text-[12px] font-mono text-right"
                  style={{ color: s.goal_diff > 0 ? '#61DF6E' : s.goal_diff < 0 ? '#E55E5B' : 'rgb(var(--text-muted))' }}>
                  {s.goal_diff > 0 ? '+' : ''}{s.goal_diff}
                </span>
              </div>
            )
          })}
        </div>
        {!expanded && standings.length > SHOW && (
          <button onClick={() => setExpanded(true)}
            className="py-3 text-[12px] font-mono text-text-muted/45 hover:text-text-muted/80 border-t border-bg-border/50 transition-colors">
            {lang === 'ru' ? `Показать всю таблицу (${standings.length} команд)` : `Show all teams (${standings.length})`}
          </button>
        )}
      </div>
    </Section>
  )
}

// ─── Injuries ─────────────────────────────────────────────────────────────────
function InjuriesSection({ homeInjuries, awayInjuries, homeTeam, awayTeam }: {
  homeInjuries: SportInjury[]; awayInjuries: SportInjury[]
  homeTeam: string; awayTeam: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!homeInjuries.length && !awayInjuries.length) return null
  return (
    <Section id="injuries" title={t('sport.title.injuries')}>
      <div className="grid grid-cols-2 divide-x divide-bg-border">
        {[
          { team: homeTeam, injuries: homeInjuries },
          { team: awayTeam, injuries: awayInjuries },
        ].map(({ team, injuries }) => (
          <div key={team} className="flex flex-col">
            <div className="px-3 py-2 border-b border-bg-border">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-text-muted/55">{team}</span>
            </div>
            {!injuries.length ? (
              <p className="px-3 py-4 text-[12px] font-mono text-text-muted/35">{t('common.no_data')}</p>
            ) : (
              <div className="flex flex-col divide-y divide-bg-border/30">
                {injuries.slice(0, 6).map(inj => (
                  <div key={inj.id} className="flex items-center gap-3 px-3 py-3">
                    <PlayerAvatar name={inj.player_name} photo={inj.player_photo} size={34} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold text-text-primary truncate">{inj.player_name}</span>
                      <span className="text-[10px] font-mono text-text-muted/45 truncate">
                        {inj.type ?? t('team.injury_default')}{inj.reason ? ` · ${inj.reason}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Market table ─────────────────────────────────────────────────────────────
function MarketTable({ odds, tab, accent }: { odds: SportOdds[]; tab: string; accent: string }) {
  const { lang } = useLang()
  const t = useT(lang)
  const rows = aggregateMarket(odds, tab)
  const bkCount = new Set(odds.filter(o => o.market_type === tab).map(o => o.bookmaker)).size

  if (!rows.length) return (
    <div className="flex justify-center py-8 text-[13px] font-mono text-text-muted/40">{t('common.no_data')}</div>
  )

  const isDC = (name: string) => name.includes('/') || /draw no bet/i.test(name)
  const isH2H = tab === 'h2h'
  const main = isH2H ? rows.filter(r => !isDC(r.name)) : rows
  const dc   = isH2H ? rows.filter(r => isDC(r.name))  : []

  const renderRow = (row: AggOutcome) => (
    <div key={row.name} className="grid items-center px-4 py-3 hover:bg-text-primary/[0.02] transition-colors"
      style={{ gridTemplateColumns: '1fr 88px 80px 68px' }}>
      <span className="text-[14px] font-semibold text-text-primary truncate pr-2">{row.name}</span>
      <span className="text-[15px] font-mono font-bold text-right text-green-400">{row.best.toFixed(2)}</span>
      <span className="text-[13px] font-mono text-right text-text-muted/55">{row.avg.toFixed(2)}</span>
      <span className="text-[13px] font-mono font-semibold text-right" style={{ color: accent }}>{row.implied}%</span>
    </div>
  )

  return (
    <div>
      <div className="grid px-4 py-2 text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted/40 border-b border-bg-border/40"
        style={{ gridTemplateColumns: '1fr 88px 80px 68px' }}>
        <span>{t('sport.market.outcome')}</span>
        <span className="text-right">{t('sport.market.best')}</span>
        <span className="text-right">Avg·{bkCount}</span>
        <span className="text-right" style={{ color: accent }}>%</span>
      </div>
      {main.length > 0 && (
        <>
          {isH2H && <div className="px-4 pt-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted/35">1X2</div>}
          <div className="flex flex-col divide-y divide-bg-border/20">{main.map(renderRow)}</div>
        </>
      )}
      {dc.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted/35">{t('sport.market.double_chance')}</div>
          <div className="flex flex-col divide-y divide-bg-border/20">{dc.map(renderRow)}</div>
        </>
      )}
    </div>
  )
}

// ─── Home/Away split ──────────────────────────────────────────────────────────
function HomeAwaySplit({ standings, homeId, awayId, homeName, awayName, accent }: {
  standings: SportStanding[]; homeId: number | null | undefined; awayId: number | null | undefined
  homeName: string; awayName: string; accent: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  const home = standings.find(s => s.team_external_id === homeId)
  const away = standings.find(s => s.team_external_id === awayId)
  if (!home && !away) return null

  const rows = [
    { label: t('sport.ha.home_wdl'), homeVal: home ? `${home.home_wins}/${home.home_draws}/${home.home_losses}` : '—', awayVal: away ? `${away.home_wins}/${away.home_draws}/${away.home_losses}` : '—' },
    { label: t('sport.ha.away_wdl'), homeVal: home ? `${home.away_wins}/${home.away_draws}/${home.away_losses}` : '—', awayVal: away ? `${away.away_wins}/${away.away_draws}/${away.away_losses}` : '—' },
    { label: t('sport.ha.goals_scored'), homeVal: home?.goals_for ?? '—', awayVal: away?.goals_for ?? '—' },
    { label: t('sport.ha.goals_conceded'), homeVal: home?.goals_against ?? '—', awayVal: away?.goals_against ?? '—' },
    { label: t('sport.ha.goal_diff'), homeVal: home ? (home.goal_diff > 0 ? `+${home.goal_diff}` : home.goal_diff) : '—', awayVal: away ? (away.goal_diff > 0 ? `+${away.goal_diff}` : away.goal_diff) : '—' },
    { label: t('sport.ha.form'), homeVal: home?.form ?? '—', awayVal: away?.form ?? '—' },
  ]

  return (
    <Section id="home-away" title={t('sport.title.home_away')}>
      <div className="px-4 py-2">
        <div className="flex justify-between text-[11px] font-mono font-bold mb-3">
          <span style={{ color: accent }}>{homeName}</span>
          <span className="text-text-muted/45 text-[10px]">{t('sport.compare.indicator')}</span>
          <span className="text-text-muted/65">{awayName}</span>
        </div>
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between py-2 border-b border-bg-border/20 last:border-0">
            <span className="text-[13px] font-mono font-semibold w-16 text-left" style={{ color: accent }}>
              {r.homeVal}
            </span>
            <span className="text-[10px] font-mono text-text-muted/40 uppercase tracking-wide text-center flex-1 px-2">
              {r.label}
            </span>
            <span className="text-[13px] font-mono font-semibold w-16 text-right text-text-muted/65">
              {r.awayVal}
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Lineups ──────────────────────────────────────────────────────────────────
function LineupsSection({ lineups, accent, status, sub }: { lineups: SportLineup[]; accent: string; status?: string; sub: string }) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!lineups.length) {
    if (status === 'scheduled') {
      return (
        <Section id="lineups" title={t('sport.title.lineups')}>
          <p className="px-4 py-5 text-[12px] font-mono text-text-muted/35">{t('sport.lineup_pending')}</p>
        </Section>
      )
    }
    return null
  }
  const home = lineups[0]
  const away = lineups[1]

  const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 }
  const sortPlayers = (players: SportLineup['start_xi']) =>
    [...players].sort((a, b) => (POS_ORDER[a.pos ?? ''] ?? 9) - (POS_ORDER[b.pos ?? ''] ?? 9))

  const PlayerRow = ({ p, align }: { p: SportLineup['start_xi'][0]; align: 'left' | 'right' }) => (
    <Link href={`/sport/${sub}/player/${p.id}`}
      className={`flex items-center gap-2 py-1.5 hover:bg-text-primary/[0.02] rounded transition-colors cursor-pointer ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono font-bold shrink-0 border border-bg-border text-text-muted/50">
        {p.number ?? '—'}
      </div>
      <span className="text-[12px] text-text-primary truncate hover:underline decoration-dotted underline-offset-2">{p.name}</span>
      {p.pos && (
        <span className="shrink-0 text-[9px] font-mono px-1 py-0.5 rounded border border-bg-border text-text-muted/40">
          {p.pos}
        </span>
      )}
    </Link>
  )

  const TeamColumn = ({ team, align }: { team: SportLineup; align: 'left' | 'right' }) => (
    <div className="flex flex-col min-w-0">
      <div className={`flex flex-col gap-0.5 pb-2 mb-2 border-b border-bg-border/50 ${align === 'right' ? 'items-end' : ''}`}>
        <span className="text-[11px] font-mono font-bold truncate" style={{ color: accent }}>{team.team_name}</span>
        {team.formation && (
          <span className="text-[10px] font-mono text-text-muted/50">{team.formation}</span>
        )}
        {team.coach_name && (
          <span className="text-[9px] font-mono text-text-muted/35 truncate">{team.coach_name}</span>
        )}
      </div>
      <div className="flex flex-col">
        {sortPlayers(team.start_xi).map(p => <PlayerRow key={p.id} p={p} align={align} />)}
      </div>
      {team.substitutes.length > 0 && (
        <>
          <p className="text-[9px] font-mono uppercase tracking-widest text-text-muted/45 mt-3 mb-1">{t('sport.substitutes')}</p>
          {team.substitutes.map(p => (
            <Link key={p.id} href={`/sport/${sub}/player/${p.id}`}
              className={`flex items-center gap-2 py-1 opacity-50 hover:opacity-75 transition-opacity ${align === 'right' ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-mono border border-bg-border/50 text-text-muted/40 shrink-0">
                {p.number ?? '—'}
              </div>
              <span className="text-[11px] text-text-muted/60 truncate hover:underline decoration-dotted underline-offset-2">{p.name}</span>
            </Link>
          ))}
        </>
      )}
    </div>
  )

  return (
    <Section id="lineups" title={t('sport.title.lineups')}>
      <div className="grid grid-cols-2 divide-x divide-bg-border px-4 py-4 gap-4">
        {home && <TeamColumn team={home} align="left" />}
        {away && <TeamColumn team={away} align="right" />}
      </div>
    </Section>
  )
}

// ─── Match Events Timeline ─────────────────────────────────────────────────────
function MatchEventsSection({ events, homeTeamId, accent, status }: {
  events: SportMatchEvent[]; homeTeamId: number | null | undefined; accent: string; status?: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!events.length) {
    if (status === 'live' || status === 'finished') {
      return (
        <Section id="match-events" title={t('sport.title.match_events')}>
          <p className="px-4 py-5 text-[12px] font-mono text-text-muted/35">{t('sport.no_match_events')}</p>
        </Section>
      )
    }
    return null
  }

  const isHome = (e: SportMatchEvent) => e.team_id === homeTeamId

  const EventIcon = ({ type, detail }: { type: string; detail?: string | null }) => {
    const isRed = detail?.toLowerCase().includes('red')
    if (type === 'Goal') return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/><path d="M12 3v4m0 14v-4M3 12h4m14 0h-4M6.3 6.3l2.8 2.8m5.6 5.6l2.8 2.8M17.7 6.3l-2.8 2.8M8.4 15.6L5.6 18.4"/>
      </svg>
    )
    if (type === 'subst') return (
      <svg className="w-4 h-4 shrink-0 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
      </svg>
    )
    if (type === 'Card') return (
      <div className="w-3.5 h-5 rounded-sm shrink-0" style={{ background: isRed ? '#ef4444' : '#eab308' }} />
    )
    return <span className="w-4 h-4 shrink-0 text-[11px] font-mono text-text-muted/40 flex items-center justify-center">·</span>
  }

  return (
    <Section id="match-events" title={t('sport.title.match_events')}>
      <div className="flex flex-col divide-y divide-bg-border/20 max-h-[400px] overflow-y-auto">
        {events.map((e, i) => {
          const home = isHome(e)
          const isGoal = e.type === 'Goal'
          return (
            <div key={i}
              className={`flex items-center gap-3 px-4 py-3 ${home ? '' : 'flex-row-reverse text-right'}`}
              style={isGoal ? { background: 'rgba(97,223,110,0.06)', borderLeft: home ? '2px solid #61DF6E' : undefined, borderRight: !home ? '2px solid #61DF6E' : undefined } : {}}>
              <span className="text-[11px] font-mono text-text-muted w-8 shrink-0 tabular-nums">
                {e.minute != null ? `${e.minute}${e.extra ? `+${e.extra}` : ''}'` : '—'}
              </span>
              <EventIcon type={e.type} detail={e.detail} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-[13px] font-semibold truncate ${isGoal ? 'text-text-primary' : 'text-text-secondary'}`}>{e.player ?? '—'}</span>
                {e.assist && (
                  <span className="text-[11px] font-mono text-text-muted truncate">↗ {e.assist}</span>
                )}
                {!isGoal && <span className="text-[10px] font-mono text-text-muted truncate">{e.detail}</span>}
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0"
                style={home
                  ? { borderColor: mix(accent, 19), color: accent, background: mix(accent, 6) }
                  : { borderColor: 'rgba(var(--surface-tint-rgb),0.1)', color: 'rgba(var(--surface-tint-rgb),0.5)' }
                }>
                {home ? t('sport.home_label') : t('sport.away_label')}
              </span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Match Statistics ──────────────────────────────────────────────────────────
function MatchStatsSection({ stats, accent, status }: { stats: SportFixtureStat[]; accent: string; status?: string }) {
  const { lang } = useLang()
  const t = useT(lang)
  if (stats.length < 2) {
    if (status === 'live' || status === 'finished') {
      return (
        <Section id="match-stats" title={t('sport.title.match_stats')}>
          <p className="px-4 py-5 text-[12px] font-mono text-text-muted/35">{t('sport.stats_unavailable')}</p>
        </Section>
      )
    }
    return null
  }
  const home = stats[0]
  const away = stats[1]

  const STAT_LABELS: Record<string, string> = {
    ball_possession:       t('stat.ball_possession'),
    shots_on_goal:         t('stat.shots_on_goal'),
    total_shots:           t('stat.total_shots'),
    blocked_shots:         t('stat.blocked_shots'),
    shots_insidebox:       t('stat.shots_insidebox'),
    shots_outsidebox:      t('stat.shots_outsidebox'),
    corner_kicks:          t('stat.corner_kicks'),
    offsides:              t('stat.offsides'),
    fouls:                 t('stat.fouls'),
    yellow_cards:          t('stat.yellow_cards'),
    red_cards:             t('stat.red_cards'),
    goalkeeper_saves:      t('stat.goalkeeper_saves'),
    total_passes:          t('stat.total_passes'),
    passes_accurate:       t('stat.passes_accurate'),
    passes:                t('stat.passes'),
    expected_goals:        t('stat.expected_goals'),
  }

  const parseVal = (v: string | number | null | undefined): number => {
    if (v == null) return 0
    return parseFloat(String(v).replace('%', '')) || 0
  }

  const rows = Object.keys(STAT_LABELS)
    .map(key => {
      const hv = home.stats[key]
      const av = away.stats[key]
      if (hv == null && av == null) return null
      return { key, label: STAT_LABELS[key], hRaw: hv, aRaw: av, hVal: parseVal(hv), aVal: parseVal(av) }
    })
    .filter(Boolean) as { key: string; label: string; hRaw: unknown; aRaw: unknown; hVal: number; aVal: number }[]

  if (!rows.length) return null

  return (
    <Section id="match-stats" title={t('sport.title.match_stats')}>
      <div className="px-5 py-3 flex flex-col gap-0">
        {rows.map(r => {
          const total = r.hVal + r.aVal || 1
          const hPct  = Math.round((r.hVal / total) * 100)
          const aPct  = 100 - hPct
          return (
            <div key={r.key} className="flex items-center gap-3 min-h-[44px]">
              <span className="text-[13px] font-mono font-bold w-10 text-right text-text-primary tabular-nums shrink-0">
                {String(r.hRaw ?? 0)}
              </span>
              <div className="flex flex-1 h-[5px] rounded-full overflow-hidden">
                <div style={{ width: `${hPct}%`, background: accent, borderRadius: '99px 0 0 99px' }} />
                <div style={{ flex: 1, background: AWAY_BAR, borderRadius: '0 99px 99px 0' }} />
              </div>
              <span className="text-[10px] text-text-muted uppercase tracking-wide w-32 text-center shrink-0">{r.label}</span>
              <div className="flex flex-1 h-[5px] rounded-full overflow-hidden flex-row-reverse">
                <div style={{ width: `${aPct}%`, background: AWAY_BAR, borderRadius: '99px 0 0 99px' }} />
                <div style={{ flex: 1, background: accent, opacity: 0.25, borderRadius: '0 99px 99px 0' }} />
              </div>
              <span className="text-[13px] font-mono font-bold w-10 text-text-primary tabular-nums shrink-0">
                {String(r.aRaw ?? 0)}
              </span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Top Scorers ──────────────────────────────────────────────────────────────
function TopScorersSection({ scorers, accent, sub }: { scorers: SportTopScorer[]; accent: string; sub: string }) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!scorers.length) return null
  return (
    <Section id="topscorers" title={t('sport.title.scorers')}>
      <div className="flex flex-col">
        {scorers.slice(0, 10).map((s, i) => (
          <Link key={s.player_id} href={`/sport/${sub}/player/${s.player_id}`}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border/20 last:border-0 hover:bg-text-primary/[0.02] transition-colors">
            <span className="text-[13px] font-mono font-bold w-5 text-right shrink-0"
              style={{ color: i < 3 ? accent : 'rgba(var(--surface-tint-rgb),0.3)' }}>
              {i + 1}
            </span>
            {s.player_photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.player_photo} alt={s.player_name} loading="lazy" className="w-7 h-7 rounded-full object-cover shrink-0 border border-bg-border" />
            ) : (
              <div className="w-7 h-7 rounded-full border border-bg-border shrink-0 bg-bg-elevated" />
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold truncate hover:underline decoration-dotted underline-offset-2">
                {s.player_name}
              </span>
              {s.team_name && (
                <span className="text-[10px] font-mono text-text-muted/40 truncate">{s.team_name}</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[15px] font-mono font-black leading-none" style={{ color: accent }}>{s.goals}</span>
                <span className="text-[8px] font-mono uppercase text-text-muted/35 mt-0.5">{t('team.goal_abbr')}</span>
              </div>
              {s.assists > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-[13px] font-mono font-bold leading-none text-text-muted/55">{s.assists}</span>
                  <span className="text-[8px] font-mono uppercase text-text-muted/35 mt-0.5">{t('team.assist_abbr')}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export interface EventMeta { league: string; leagueId?: number | null; homeTeam: string; awayTeam: string }

export default function SportEventPage({ id: idProp, onBack, onLeagueLoad, initialFast }: { id?: string; onBack?: () => void; onLeagueLoad?: (meta: EventMeta) => void; initialFast?: EventFastCache }) {
  const params = useParams<{ id: string }>()
  const id     = idProp ?? params?.id ?? ''
  const router = useRouter()
  const { profile } = useAuthContext()
  const _plan: SubscriptionPlan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const pageRef = useRef<HTMLDivElement>(null)
  const { lang } = useLang()
  const t = useT(lang)

  // SSR seed: prime cache so initial render shows data without loading flash.
  if (initialFast && id && !getCached<EventFastCache>(`event_fast:${id}`)) {
    setCached(`event_fast:${id}`, initialFast)
  }
  const _fc = id ? getCached<EventFastCache>(`event_fast:${id}`) : null
  const _dc = id ? getCached<EventDetailsCache>(`event_details:${id}`) : null

  const [event, setEvent]           = useState<SportEvent | null>(_fc?.event ?? null)
  const [loading, setLoading]       = useState(!_fc)
  const [form, setForm]             = useState<{ home_form: FormEntry[] | null; away_form: FormEntry[] | null } | null>(_fc?.form ?? null)
  const [prediction, setPrediction] = useState<SportPrediction | null | undefined>(_fc?.prediction)
  const [standings, setStandings]   = useState<SportStanding[]>(_dc?.standings ?? [])
  const [homeInj, setHomeInj]       = useState<SportInjury[]>(_dc?.homeInj ?? [])
  const [awayInj, setAwayInj]       = useState<SportInjury[]>(_dc?.awayInj ?? [])
  const [lineups, setLineups]       = useState<SportLineup[]>(_dc?.lineups ?? [])
  const [matchStats, setMatchStats] = useState<SportFixtureStat[]>(_dc?.matchStats ?? [])
  const [matchEvents, setMatchEvents] = useState<SportMatchEvent[]>(_dc?.matchEvents ?? [])
  const [topScorers, setTopScorers] = useState<SportTopScorer[]>(_dc?.topScorers ?? [])
  const [dataError, setDataError]   = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(!_dc)

  // ── Fast load: event + form + prediction in one request ────────────────────
  useEffect(() => {
    if (!id) return
    if (!getCached<EventFastCache>(`event_fast:${id}`)) setLoading(true)
    sportApi.getEventFull(id)
      .then(({ event: ev, form: f, prediction: p }) => {
        setEvent(ev)
        setForm(f)
        setPrediction(p)
        setCached(`event_fast:${id}`, { event: ev, form: f, prediction: p })
        if (ev.league && onLeagueLoad) onLeagueLoad({ league: ev.league, leagueId: ev.raw_data?.league_id as number | null | undefined, homeTeam: ev.home_team, awayTeam: ev.away_team })
      })
      .catch(() => setDataError(true))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── If loaded from cache, fire onLeagueLoad immediately (once) ────────────
  useEffect(() => {
    if (_fc?.event && onLeagueLoad) {
      const ev = _fc.event
      onLeagueLoad({ league: ev.league ?? '', leagueId: ev.raw_data?.league_id as number | null | undefined, homeTeam: ev.home_team, awayTeam: ev.away_team })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Heavy load: standings + topscorers + injuries + lineups + stats ─────────
  useEffect(() => {
    if (!id) return
    if (!getCached<EventDetailsCache>(`event_details:${id}`)) setDetailsLoading(true)
    sportApi.getEventDetails(id)
      .then(({ standings: s, topScorers: ts, homeInjuries: hi, awayInjuries: ai, lineups: l, stats: st, matchEvents: me }) => {
        setStandings(s)
        setTopScorers(ts)
        setHomeInj(hi)
        setAwayInj(ai)
        setLineups(l)
        setMatchStats(st)
        setMatchEvents(me)
        setCached(`event_details:${id}`, { standings: s, topScorers: ts, homeInj: hi, awayInj: ai, lineups: l, matchStats: st, matchEvents: me })
      })
      .catch(() => {})
      .finally(() => setDetailsLoading(false))
  }, [id])

  // ── WebSocket: live score + odds updates ────────────────────────────────────
  useSportWs({
    eventId: id,
    onEventUpdate: useCallback((data: Record<string, unknown>) => {
      setEvent(prev => prev ? { ...prev, ...data } as SportEvent : prev)
    }, []),
    onOddsUpdate: useCallback((_eventId: string, data: Record<string, unknown>) => {
      const incoming = data as unknown as SportOdds
      setEvent(prev => {
        if (!prev) return prev
        const odds = prev.sport_odds ?? []
        const idx = odds.findIndex(o => o.bookmaker === incoming.bookmaker && o.market_type === incoming.market_type)
        if (idx === -1) return { ...prev, sport_odds: [...odds, incoming] }
        const updated = [...odds]
        updated[idx] = incoming
        return { ...prev, sport_odds: updated }
      })
    }, []),
  })

  const sub    = event?.subcategory ?? 'football'
  const accent = SPORT_ACCENT[sub] ?? '#D4A017'

  const raw           = event?.raw_data as Record<string, unknown> | null | undefined
  const fixtureId     = raw?.fixture_id  as number | null | undefined
  const homeTeamId    = raw?.home_team_id as number | null | undefined
  const awayTeamId    = raw?.away_team_id as number | null | undefined
  const leagueId      = raw?.league_id   as number | null | undefined
  const elapsed       = raw?.elapsed     as number | null | undefined
  const homeLogo      = raw?.home_logo   as string | null | undefined
  const awayLogo      = raw?.away_logo   as string | null | undefined
  const leagueLogo    = raw?.league_logo as string | null | undefined
  const venue         = raw?.venue       as string | null | undefined
  const venueCapacity = raw?.venue_capacity as number | null | undefined
  const venueCity     = raw?.city         as string | null | undefined
  const referee       = raw?.referee      as string | null | undefined
  const isBasicCard   = !fixtureId

  const isLive     = event?.status === 'live'
  const isFinished = event?.status === 'finished'
  const hasScore   = event?.home_score != null && event?.away_score != null

  const availableTabs = (['h2h', 'totals', 'spreads', 'btts'] as const).filter(t => event?.sport_odds?.some(o => o.market_type === t))
  const [activeTab, setActiveTab] = useState<string>('h2h')

  useEffect(() => {
    if (availableTabs.length && !availableTabs.includes(activeTab as 'h2h' | 'totals' | 'spreads' | 'btts')) {
      setActiveTab(availableTabs[0])
    }
  }, [availableTabs.join('')]) // eslint-disable-line

  const cmp = prediction?.comparison
  const compareRows = cmp ? [
    { label: t('sport.compare.form'),    home: pct(cmp.form?.home),  away: pct(cmp.form?.away) },
    { label: t('sport.compare.attack'),  home: pct(cmp.att?.home),   away: pct(cmp.att?.away) },
    { label: t('sport.compare.defense'), home: pct(cmp.def?.home),   away: pct(cmp.def?.away) },
    { label: 'H2H',                      home: pct(cmp.h2h?.home),   away: pct(cmp.h2h?.away) },
    { label: t('sport.compare.goals'),   home: pct(cmp.goals?.home), away: pct(cmp.goals?.away) },
    { label: t('sport.compare.conceded'),home: 100 - pct(cmp.def?.home), away: 100 - pct(cmp.def?.away) },
  ].filter(r => r.home + r.away > 0) : []

  const leagueName = event?.league ?? t('sport.league_default')
  const bkCount    = new Set((event?.sport_odds ?? []).map(o => o.bookmaker)).size

  // Build nav items only for sections that have data
  const navItems = [
    { id: 'insight',      label: t('sport.section.insight'),   show: prediction !== null },
    { id: 'lineups',      label: t('sport.section.lineups'),   show: lineups.length > 0 || event?.status === 'scheduled' },
    { id: 'match-events', label: t('sport.section.events'),    show: matchEvents.length > 0 || isLive || isFinished },
    { id: 'match-stats',  label: t('sport.section.stats'),     show: matchStats.length >= 2 || isLive || isFinished },
    { id: 'home-away',    label: t('sport.section.home_away'), show: standings.length > 0 },
    { id: 'compare',      label: t('sport.section.compare'),   show: compareRows.length > 0 },
    { id: 'h2h',          label: 'H2H',                        show: (prediction?.h2h?.length ?? 0) > 0 },
    { id: 'markets',      label: t('sport.section.markets'),   show: (event?.sport_odds?.length ?? 0) > 0 },
    { id: 'standings',    label: t('sport.section.standings'), show: standings.length > 0 },
    { id: 'topscorers',   label: t('sport.section.scorers'),   show: topScorers.length > 0 },
    { id: 'injuries',     label: t('sport.section.injuries'),  show: homeInj.length > 0 || awayInj.length > 0 },
  ].filter(n => n.show)

  if (loading && !event) return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-3 w-40 bg-bg-elevated rounded" />
      <div className="bg-bg-surface border border-bg-border rounded-xl h-72" />
      <div className="bg-bg-surface border border-bg-border rounded-xl h-32" />
    </div>
  )

  if (!event) return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="text-base font-mono text-text-muted mb-4">{t('sport.not_found')}</p>
      <button onClick={() => onBack ? onBack() : router.back()} className="text-sm font-mono" style={{ color: accent }}>← {t('sport.back')}</button>
    </div>
  )

  return (
    <div ref={pageRef} className="flex flex-col gap-4 pb-8">

      {/* Back — only shown in standalone mode; embedded mode uses parent header */}
      {!onBack && (
      <button onClick={() => { if (leagueId) router.push(`/sport/${sub}/league/${leagueId}`); else router.push(`/sport/${sub}`) }}
        className="flex items-center gap-1.5 text-[13px] font-mono text-text-muted/60 hover:text-text-secondary transition-colors self-start">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {leagueName} · {t('sport.all_matches')}
      </button>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-bg-surface overflow-hidden"
        style={{ borderColor: isLive ? 'rgba(255,50,50,0.35)' : mix(accent, 13) }}>

        {/* Meta */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border"
          style={isLive ? { background: 'rgba(255,50,50,0.04)' } : {}}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {leagueLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leagueLogo} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />
            )}
            <span className="text-[12px] font-mono text-text-secondary truncate font-medium">
              {leagueName}
              {raw?.round != null && <span className="text-text-muted"> · {String(raw.round)}</span>}
              {raw?.season != null && <span className="text-text-muted"> · {String(raw.season)}</span>}
            </span>
          </div>
          {isLive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-500/30 bg-red-500/08 shrink-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                LIVE{elapsed != null ? ` ${elapsed}'` : ''}
              </span>
            </div>
          ) : isFinished ? (
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border border-bg-border text-text-muted/45 shrink-0">{t('sport.finished_label')}</span>
          ) : (
            <span className="text-[11px] font-mono text-text-muted/55 shrink-0">
              {new Date(event.starts_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Matchup */}
        <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <div className="grid items-start gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            {/* Home */}
            <div className="flex flex-col items-center gap-3">
              <TeamAvatar name={event.home_team} logo={homeLogo} accent={accent} size={72} />
              {homeTeamId ? (
                <Link href={`/sport/${sub}/team/${homeTeamId}`}
                  className="group flex flex-col items-center gap-0.5 text-[14px] font-bold text-text-primary text-center leading-snug max-w-[140px] hover:text-text-secondary transition-colors">
                  <span className="group-hover:underline decoration-dotted underline-offset-2">{event.home_team}</span>
                  <svg className="w-3 h-3 text-text-muted/40 group-hover:text-text-muted/55 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                </Link>
              ) : (
                <p className="text-[14px] font-bold text-text-primary text-center leading-snug max-w-[140px]">{event.home_team}</p>
              )}
              <FormDots form={form?.home_form ?? null} align="left" />
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-start pt-2 px-2 sm:px-4 gap-1">
              {hasScore ? (
                <>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {(() => {
                      const hs = event.home_score ?? 0, as_ = event.away_score ?? 0
                      const homeLeads = hs > as_, awayLeads = as_ > hs
                      const liveColor = '#ff5252'
                      const homeColor = isLive ? liveColor : homeLeads ? accent : awayLeads ? 'rgba(var(--surface-tint-rgb),0.3)' : accent
                      const awayColor = isLive ? liveColor : awayLeads ? 'rgba(var(--surface-tint-rgb),0.9)' : homeLeads ? 'rgba(var(--surface-tint-rgb),0.3)' : accent
                      return (<>
                        <span className="text-4xl sm:text-5xl font-mono font-black leading-none" style={{ color: homeColor }}>{event.home_score}</span>
                        <span className="text-2xl sm:text-3xl font-mono text-text-muted/35 leading-none">:</span>
                        <span className="text-4xl sm:text-5xl font-mono font-black leading-none" style={{ color: awayColor }}>{event.away_score}</span>
                      </>)
                    })()}
                  </div>
                  {isLive && elapsed != null && (
                    <span className="text-[11px] font-mono text-red-400">{elapsed}' · {t('common.live')}</span>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 pt-6">
                  <span className="text-lg font-mono font-bold text-text-muted/35 tracking-[0.25em]">VS</span>
                  <span className="text-[11px] font-mono text-text-muted/35">
                    {new Date(event.starts_at).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-3">
              <TeamAvatar name={event.away_team} logo={awayLogo} accent={accent} size={72} />
              {awayTeamId ? (
                <Link href={`/sport/${sub}/team/${awayTeamId}`}
                  className="group flex flex-col items-center gap-0.5 text-[14px] font-bold text-text-primary text-center leading-snug max-w-[140px] hover:text-text-secondary transition-colors">
                  <span className="group-hover:underline decoration-dotted underline-offset-2">{event.away_team}</span>
                  <svg className="w-3 h-3 text-text-muted/40 group-hover:text-text-muted/55 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                </Link>
              ) : (
                <p className="text-[14px] font-bold text-text-primary text-center leading-snug max-w-[140px]">{event.away_team}</p>
              )}
              <FormDots form={form?.away_form ?? null} align="right" />
            </div>
          </div>

          {prediction && (
            <div className="mt-7">
              <ProbBar
                home={prediction.home_pct}
                draw={prediction.draw_pct}
                away={prediction.away_pct}
                homeName={event.home_team}
                awayName={event.away_team}
                accent={accent}
              />
            </div>
          )}

          {(venue || referee) && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3">
              {venue && (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span>{venue}{venueCity ? `, ${venueCity}` : ''}{venueCapacity ? ` · ${venueCapacity.toLocaleString()} ${t('sport.capacity')}` : ''}</span>
                </div>
              )}
              {referee && (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/></svg>
                  <span>{referee}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BASIC CARD NOTICE ───────────────────────────────────────────────── */}
      {isBasicCard && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-bg-border bg-bg-surface">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-[12px] font-mono text-text-muted/50 leading-relaxed">
            {t('sport.basic_card')}
          </p>
        </div>
      )}

      {/* ── SECTION NAV ─────────────────────────────────────────────────────── */}
      {navItems.length > 0 && <SectionNav items={navItems} />}

      {/* ── AI INSIGHT ──────────────────────────────────────────────────────── */}
      <AiInsightCard pred={prediction} odds={event.sport_odds ?? []} accent={accent} />
      {prediction === null && fixtureId && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-bg-border bg-bg-surface text-[11px] font-mono text-text-muted/45">
          <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          {t('sport.forecast_updating')}
        </div>
      )}

      {/* ── LINEUPS ─────────────────────────────────────────────────────────── */}
      <LineupsSection lineups={lineups} accent={accent} status={event.status} sub={sub} />

      {/* ── MATCH EVENTS ────────────────────────────────────────────────────── */}
      <MatchEventsSection events={matchEvents} homeTeamId={homeTeamId} accent={accent} status={event.status} />

      {/* ── MATCH STATS ─────────────────────────────────────────────────────── */}
      <MatchStatsSection stats={matchStats} accent={accent} status={event.status} />

      {/* ── DETAILS SKELETON ────────────────────────────────────────────────── */}
      {detailsLoading && !lineups.length && !matchStats.length && !standings.length && (
        <div className="flex flex-col gap-3">
          {[90, 120, 80].map((h, i) => (
            <div key={i} className="rounded-xl border border-bg-border bg-bg-surface animate-pulse" style={{ height: h, animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {/* ── HOME/AWAY SPLIT ─────────────────────────────────────────────────── */}
      {standings.length > 0 && (
        <HomeAwaySplit
          standings={standings}
          homeId={homeTeamId}
          awayId={awayTeamId}
          homeName={event.home_team}
          awayName={event.away_team}
          accent={accent}
        />
      )}

      {/* ── COMPARISON ──────────────────────────────────────────────────────── */}
      {compareRows.length > 0 && (
        <div id="compare" className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-16">
          <div className="px-4 py-3 border-b border-bg-border">
            <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-text-secondary">{t('sport.title.compare')}</span>
          </div>
          <div className="px-5 py-4">
            <div className="flex justify-between text-[12px] font-mono font-bold mb-1">
              <span style={{ color: accent }}>{event.home_team}</span>
              <span className="text-text-primary">{event.away_team}</span>
            </div>
            {compareRows.map(r => (
              <CompareBar
                key={r.label}
                label={r.label}
                homeVal={r.home}
                awayVal={r.away}
                accent={accent}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── H2H ─────────────────────────────────────────────────────────────── */}
      {prediction?.h2h && (
        <H2HSection
          h2h={prediction.h2h}
          homeId={homeTeamId ?? null}
          awayId={awayTeamId ?? null}
          homeName={event.home_team}
          awayName={event.away_team}
          accent={accent}
        />
      )}

      {/* ── MARKETS ─────────────────────────────────────────────────────────── */}
      <div id="markets" className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-16">
        <div className="flex items-center border-b border-bg-border px-4 pt-3 gap-0.5 overflow-x-auto">
          {availableTabs.length > 0 ? availableTabs.map(tab => {
            const outCount = aggregateMarket(event.sport_odds ?? [], tab).length
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-2 text-[11px] font-mono font-bold tracking-wide transition-all relative shrink-0"
                style={activeTab === tab ? { color: accent } : { color: 'rgba(var(--surface-tint-rgb),0.35)' }}>
                {MARKET_TAB_KEYS[tab] ? t(MARKET_TAB_KEYS[tab]) : tab}{outCount > 0 ? ` ${outCount}` : ''}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: accent }} />
                )}
              </button>
            )
          }) : (
            <span className="text-[12px] font-mono text-text-muted/40 py-2 pb-3">{t('sport.market.loading')}</span>
          )}
          {bkCount > 0 && (
            <span className="ml-auto text-[10px] font-mono text-text-muted/35 pb-2 shrink-0 pl-2">{bkCount} {t('sport.market.sources')}</span>
          )}
        </div>
        <div className="py-1">
          {(event.sport_odds?.length ?? 0) > 0
            ? <MarketTable odds={event.sport_odds!} tab={activeTab} accent={accent} />
            : <div className="px-4 py-5 text-[13px] font-mono text-text-muted/40">{t('sport.market.no_odds')}</div>
          }
        </div>
      </div>

      {/* ── STANDINGS ───────────────────────────────────────────────────────── */}
      {standings.length > 0 && (
        <StandingsSection
          standings={standings}
          homeId={homeTeamId ?? null}
          awayId={awayTeamId ?? null}
          leagueName={leagueName}
          accent={accent}
        />
      )}

      {/* ── TOP SCORERS ─────────────────────────────────────────────────────── */}
      <TopScorersSection scorers={topScorers} accent={accent} sub={sub} />

      {/* ── INJURIES ────────────────────────────────────────────────────────── */}
      {(homeInj.length > 0 || awayInj.length > 0) && (
        <InjuriesSection
          homeInjuries={homeInj}
          awayInjuries={awayInj}
          homeTeam={event.home_team}
          awayTeam={event.away_team}
        />
      )}

      {/* ── DATA ERROR ──────────────────────────────────────────────────────── */}
      {dataError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-[12px] font-mono text-red-400/70">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {t('sport.data_error')}
        </div>
      )}

      {/* ── LINKED MARKETS ──────────────────────────────────────────────────── */}
      {(event.linked_prediction_markets?.length ?? 0) > 0 && (
        <Section title={t('sport.prediction_markets')}>
          <div className="flex flex-col divide-y divide-bg-border/40">
            {event.linked_prediction_markets!.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                <span className="text-[13px] font-mono text-text-secondary flex-1 truncate">{m.title}</span>
                <span className="text-[11px] font-mono text-text-muted/40 shrink-0">{m.source_name}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}
