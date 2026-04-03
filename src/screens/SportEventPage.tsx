'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { sportApi } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import type { SportEvent, SportOdds, SportPrediction, SportStanding, SportInjury, SubscriptionPlan } from '../types/index'

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORT_ACCENT: Record<string, string> = {
  football: '#D4A017', basketball: '#e66414', tennis: '#C8E63C', mma: '#e02020',
}
const MARKET_TAB_LABELS: Record<string, string> = {
  h2h: 'Основные', totals: 'Тоталы', spreads: 'Форы', btts: 'Обе забьют',
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FormResult = 'W' | 'D' | 'L'
type FormEntry = { result: FormResult; home: string; away: string; score: string; date: string }
const FORM_COLOR: Record<FormResult, string> = { W: '#22c55e', D: '#71717a', L: '#ef4444' }

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
      style={{ width: size, height: size, background: `${accent}08`, borderColor: `${accent}25` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={name} onError={() => setErr(true)} style={{ width: size * 0.72, height: size * 0.72, objectFit: 'contain' }} />
    </div>
  )
  return (
    <div className="rounded-2xl flex items-center justify-center border-2 font-bold shrink-0"
      style={{ width: size, height: size, background: `${accent}12`, borderColor: `${accent}30`, color: accent, fontSize: size * 0.22 }}>
      {abbr(name)}
    </div>
  )
}

// ─── PlayerAvatar (фото + fallback инициалы) ──────────────────────────────────
function PlayerAvatar({ name, photo, size = 34 }: { name: string | null; photo?: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  if (photo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name ?? ''} onError={() => setErr(true)}
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
    <div className={`flex gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {dots.map((f, i) => f ? (
        <div key={i} title={`${f.home} ${f.score} ${f.away}`}
          className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold"
          style={{ background: `${FORM_COLOR[f.result]}28`, color: FORM_COLOR[f.result] }}>
          {f.result}
        </div>
      ) : (
        <div key={i} className="w-6 h-6 rounded border border-bg-border bg-bg-elevated animate-pulse" />
      ))}
    </div>
  )
}

// ─── ProbBar ──────────────────────────────────────────────────────────────────
function ProbBar({ home, draw, away, homeName, awayName, accent }: {
  home: number; draw: number | null; away: number; homeName: string; awayName: string; accent: string
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted/40 text-center mb-0.5">Вероятность победы</p>
      <div className="flex justify-between px-0.5 text-[15px] font-mono font-bold">
        <span style={{ color: accent }}>{home}%</span>
        {draw != null && <span className="text-text-muted/50">{draw}%</span>}
        <span className="text-text-muted/70">{away}%</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden w-full">
        <div className="h-full" style={{ width: `${home}%`, background: accent, opacity: 0.85, borderRadius: '99px 0 0 99px' }} />
        {draw != null && draw > 0 && <div className="h-full" style={{ width: `${draw}%`, background: 'rgba(160,160,170,0.55)' }} />}
        <div className="h-full flex-1" style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '0 99px 99px 0' }} />
      </div>
      <div className="flex justify-between px-0.5 text-[11px] font-mono text-text-muted/50">
        <span>{homeName.split(' ').slice(0, 2).join(' ')}</span>
        {draw != null && <span>Ничья</span>}
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
  const homeLeads = homePct >= awayPct
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-[13px] font-mono font-bold w-11 text-right"
        style={{ color: homeLeads ? accent : 'rgba(255,255,255,0.45)' }}>{homePct}%</span>
      <div className="flex flex-1 h-[7px] rounded-full overflow-hidden">
        <div style={{ width: `${homePct}%`, background: accent, opacity: homeLeads ? 0.9 : 0.4, borderRadius: '99px 0 0 99px' }} />
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.25)', opacity: homeLeads ? 0.7 : 1, borderRadius: '0 99px 99px 0' }} />
      </div>
      <span className="text-[10px] font-mono text-text-muted/50 uppercase tracking-wider w-28 text-center">{label}</span>
      <span className="text-[13px] font-mono font-bold w-11"
        style={{ color: !homeLeads ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)' }}>{awayPct}%</span>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ id, title, children, action }: { id?: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-16">
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-text-muted/60">{title}</span>
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
    <div className="sticky top-0 z-20 -mx-4 px-4 py-2 flex gap-1.5 overflow-x-auto border-b border-bg-border"
      style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)' }}>
      {items.map(({ id, label }) => (
        <button key={id} onClick={() => scroll(id)}
          className="px-3 py-1.5 rounded-full text-[11px] font-mono whitespace-nowrap transition-all shrink-0"
          style={active === id
            ? { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }
            : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)' }
          }>
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── AI Insight ───────────────────────────────────────────────────────────────
function AiInsightCard({ pred, odds, accent }: {
  pred: SportPrediction | null | undefined; odds: SportOdds[]; accent: string
}) {
  if (pred === undefined) return (
    <div id="insight" className="rounded-xl border border-bg-border overflow-hidden scroll-mt-16"
      style={{ borderLeft: '3px solid #22c55e', background: 'rgba(34,197,94,0.03)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: '#22c55e20' }}>
          <span style={{ color: '#22c55e' }}>⚡</span>
        </div>
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase" style={{ color: '#22c55e90' }}>Прогноз · API-Sports</span>
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
  const confidence = maxPct >= 60 ? 'Высокая уверенность' : maxPct >= 50 ? 'Средняя уверенность' : 'Низкая уверенность'
  const advice = pred.advice ?? (pred.winner_name ? `Фаворит: ${pred.winner_name}. ${pred.winner_comment ?? ''}`.trim() : null)

  return (
    <div id="insight" className="rounded-xl border border-bg-border overflow-hidden scroll-mt-16"
      style={{ borderLeft: '3px solid #22c55e', background: 'rgba(34,197,94,0.04)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: '#22c55e20' }}>
          <span style={{ color: '#22c55e' }}>⚡</span>
        </div>
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase" style={{ color: '#22c55e90' }}>Прогноз · API-Sports</span>
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
          <div className="flex-1 flex flex-col items-center py-2.5 rounded-lg" style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}>
            <span className="text-[18px] font-mono font-black" style={{ color: accent }}>{pred.home_pct}%</span>
            <span className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider mt-0.5">Хозяева</span>
          </div>
          {pred.draw_pct != null && (
            <div className="flex-1 flex flex-col items-center py-2.5 rounded-lg border border-bg-border bg-bg-elevated">
              <span className="text-[18px] font-mono font-black text-text-muted/60">{pred.draw_pct}%</span>
              <span className="text-[9px] font-mono text-text-muted/40 uppercase tracking-wider mt-0.5">Ничья</span>
            </div>
          )}
          <div className="flex-1 flex flex-col items-center py-2.5 rounded-lg border border-bg-border bg-bg-elevated">
            <span className="text-[18px] font-mono font-black text-text-muted/70">{pred.away_pct}%</span>
            <span className="text-[9px] font-mono text-text-muted/40 uppercase tracking-wider mt-0.5">Гости</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {bestAiVal?.value_rating != null && (
            <div className="px-3 py-1.5 rounded text-[10px] font-mono font-bold"
              style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}35` }}>
              Edge +{bestAiVal.value_rating}% · {bestAiVal.suggested_side ?? pred.winner_name}
            </div>
          )}
          {bestAiVal?.confidence != null && (
            <div className="px-3 py-1.5 rounded text-[10px] font-mono border border-bg-border text-text-muted/60">
              Kelly: {(bestAiVal.confidence * 4.2).toFixed(1)}% банка
            </div>
          )}
          {bkCount > 0 && (
            <div className="px-3 py-1.5 rounded text-[10px] font-mono border border-bg-border text-text-muted/40">
              {bkCount} источников данных
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
  if (!h2h?.length) return null

  const homeWins = h2h.filter(m => {
    const hIsHome = m.teams.home.id === homeId
    const hG = hIsHome ? (m.goals.home ?? 0) : (m.goals.away ?? 0)
    const aG = hIsHome ? (m.goals.away ?? 0) : (m.goals.home ?? 0)
    return hG > aG
  }).length
  const draws    = h2h.filter(m => m.goals.home === m.goals.away).length
  const awayWins = h2h.length - homeWins - draws

  return (
    <Section id="h2h" title={`Head-to-Head · ${h2h.length} встреч`}>
      <div className="flex items-stretch border-b border-bg-border">
        {[
          { label: 'Побед хозяев', sub: homeName, val: homeWins, color: accent },
          { label: 'Ничьих', sub: '', val: draws, color: 'rgba(255,255,255,0.4)' },
          { label: 'Побед гостей', sub: awayName, val: awayWins, color: 'rgba(255,255,255,0.75)' },
        ].map(({ label, sub, val, color }) => (
          <div key={label} className="flex-1 flex flex-col items-center py-5 gap-1 border-r border-bg-border last:border-r-0">
            <span className="text-4xl font-mono font-black leading-none" style={{ color }}>{val}</span>
            <span className="text-[10px] font-mono text-text-muted/50 uppercase tracking-wider text-center">{label}</span>
            {sub && <span className="text-[9px] font-mono text-text-muted/30 truncate max-w-[80px] text-center">{sub}</span>}
          </div>
        ))}
      </div>
      <div className="flex flex-col divide-y divide-bg-border/30 max-h-[300px] overflow-y-auto">
        {h2h.map(m => {
          const hG = m.goals.home ?? 0
          const aG = m.goals.away ?? 0
          const isHome = m.teams.home.id === homeId
          const ours   = isHome ? hG : aG
          const theirs = isHome ? aG : hG
          const result: FormResult = ours > theirs ? 'W' : ours < theirs ? 'L' : 'D'
          return (
            <div key={m.fixture.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-[11px] font-mono text-text-muted/45 w-[80px] shrink-0">
                {new Date(m.fixture.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[13px] text-text-muted/80 truncate text-right flex-1">{m.teams.home.name}</span>
                <span className="text-[14px] font-mono font-bold text-text-primary shrink-0 tabular-nums px-1">
                  {m.goals.home ?? '?'}:{m.goals.away ?? '?'}
                </span>
                <span className="text-[13px] text-text-muted/80 truncate flex-1">{m.teams.away.name}</span>
              </div>
              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: `${FORM_COLOR[result]}28`, color: FORM_COLOR[result] }}>
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
      title={`Турнирная таблица · ${leagueName} · ${seasonLabel}`}
      action={
        <button onClick={() => setExpanded(e => !e)}
          className="text-[10px] font-mono text-text-muted/50 hover:text-text-muted/80 transition-colors">
          {expanded ? 'Свернуть ↑' : 'Развернуть →'}
        </button>
      }
    >
      <div className="flex flex-col">
        <div className="grid px-4 py-2 text-[10px] font-mono uppercase tracking-wide text-text-muted/35"
          style={{ gridTemplateColumns: '28px 1fr 44px 52px 52px' }}>
          <span>#</span><span>Команда</span>
          <span className="text-right">И</span>
          <span className="text-right">О</span>
          <span className="text-right">+/-</span>
        </div>
        <div className="flex flex-col divide-y divide-bg-border/20">
          {visible.map(s => {
            const isHL = highlighted.has(s.team_external_id)
            return (
              <div key={s.id}
                className="grid items-center px-4 py-2.5"
                style={{
                  gridTemplateColumns: '28px 1fr 44px 52px 52px',
                  background: isHL ? `${accent}08` : undefined,
                  borderLeft: isHL ? `2px solid ${accent}` : '2px solid transparent',
                }}>
                <span className="text-[11px] font-mono text-text-muted/50">{s.rank}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.team_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.team_logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 border"
                      style={{ background: isHL ? `${accent}50` : 'transparent', borderColor: isHL ? accent : 'rgba(255,255,255,0.15)' }} />
                  )}
                  <span className={`text-[13px] truncate ${isHL ? 'font-bold' : 'text-text-muted/75'}`}
                    style={isHL ? { color: accent } : {}}>
                    {s.team_name}
                  </span>
                </div>
                <span className="text-[12px] font-mono text-right text-text-muted/55">{s.played}</span>
                <span className="text-[13px] font-mono font-bold text-right"
                  style={isHL ? { color: accent } : { color: 'rgba(255,255,255,0.8)' }}>
                  {s.points}
                </span>
                <span className="text-[12px] font-mono text-right text-text-muted/45">
                  {s.goal_diff > 0 ? '+' : ''}{s.goal_diff}
                </span>
              </div>
            )
          })}
        </div>
        {!expanded && standings.length > SHOW && (
          <button onClick={() => setExpanded(true)}
            className="py-3 text-[12px] font-mono text-text-muted/45 hover:text-text-muted/80 border-t border-bg-border/50 transition-colors">
            Показать всю таблицу ({standings.length} команд)
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
  if (!homeInjuries.length && !awayInjuries.length) return null
  return (
    <Section id="injuries" title="Травмы и дисквалификации">
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
              <p className="px-3 py-4 text-[12px] font-mono text-text-muted/35">Нет данных</p>
            ) : (
              <div className="flex flex-col divide-y divide-bg-border/30">
                {injuries.slice(0, 6).map(inj => (
                  <div key={inj.id} className="flex items-center gap-3 px-3 py-3">
                    <PlayerAvatar name={inj.player_name} photo={inj.player_photo} size={34} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-semibold text-text-primary truncate">{inj.player_name}</span>
                      <span className="text-[10px] font-mono text-text-muted/45 truncate">
                        {inj.type ?? 'Травма'}{inj.reason ? ` · ${inj.reason}` : ''}
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
  const rows = aggregateMarket(odds, tab)
  const bkCount = new Set(odds.filter(o => o.market_type === tab).map(o => o.bookmaker)).size

  if (!rows.length) return (
    <div className="flex justify-center py-8 text-[13px] font-mono text-text-muted/40">Нет данных</div>
  )

  const isDC = (name: string) => name.includes('/') || /draw no bet/i.test(name)
  const isH2H = tab === 'h2h'
  const main = isH2H ? rows.filter(r => !isDC(r.name)) : rows
  const dc   = isH2H ? rows.filter(r => isDC(r.name))  : []

  const renderRow = (row: AggOutcome) => (
    <div key={row.name} className="grid items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
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
        <span>Исход</span>
        <span className="text-right">Лучшее</span>
        <span className="text-right">Avg·{bkCount}</span>
        <span className="text-right" style={{ color: accent }} title="Implied probability — вероятность победы по мнению рынка">Рынок%</span>
      </div>
      {main.length > 0 && (
        <>
          {isH2H && <div className="px-4 pt-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted/35">1X2</div>}
          <div className="flex flex-col divide-y divide-bg-border/20">{main.map(renderRow)}</div>
        </>
      )}
      {dc.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted/35">Победитель · Double Chance</div>
          <div className="flex flex-col divide-y divide-bg-border/20">{dc.map(renderRow)}</div>
        </>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SportEventPage({ id: idProp, onBack }: { id?: string; onBack?: () => void }) {
  const params = useParams<{ id: string }>()
  const id     = idProp ?? params?.id ?? ''
  const router = useRouter()
  const { profile } = useAuthContext()
  const _plan: SubscriptionPlan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const pageRef = useRef<HTMLDivElement>(null)

  const { data, loading } = usePolling(() => sportApi.getEvent(id), 60_000, id)
  const event = data as SportEvent | null

  const sub    = event?.subcategory ?? 'football'
  const accent = SPORT_ACCENT[sub] ?? '#D4A017'

  const raw        = event?.raw_data as Record<string, unknown> | null | undefined
  const fixtureId  = raw?.fixture_id  as number | null | undefined
  const homeTeamId = raw?.home_team_id as number | null | undefined
  const awayTeamId = raw?.away_team_id as number | null | undefined
  const leagueId   = raw?.league_id   as number | null | undefined
  const elapsed    = raw?.elapsed     as number | null | undefined
  const homeLogo   = raw?.home_logo   as string | null | undefined
  const awayLogo   = raw?.away_logo   as string | null | undefined
  const leagueLogo = raw?.league_logo as string | null | undefined
  const venue      = raw?.venue       as string | null | undefined
  const isBasicCard = !fixtureId

  const isLive     = event?.status === 'live'
  const isFinished = event?.status === 'finished'
  const hasScore   = event?.home_score != null && event?.away_score != null

  const [form, setForm]             = useState<{ home_form: FormEntry[] | null; away_form: FormEntry[] | null } | null>(null)
  const [prediction, setPrediction] = useState<SportPrediction | null | undefined>(undefined)
  const [standings, setStandings]   = useState<SportStanding[]>([])
  const [homeInj, setHomeInj]       = useState<SportInjury[]>([])
  const [awayInj, setAwayInj]       = useState<SportInjury[]>([])

  useEffect(() => {
    if (!id) return
    sportApi.getForm(id).then(setForm).catch(() => setForm({ home_form: null, away_form: null }))
    sportApi.getPredictions(id).then(setPrediction).catch(() => setPrediction(null))
  }, [id])

  useEffect(() => {
    if (!leagueId) return
    sportApi.getStandings(leagueId).then(setStandings).catch(() => {})
  }, [leagueId])

  useEffect(() => {
    if (!homeTeamId && !awayTeamId) return
    Promise.all([
      homeTeamId ? sportApi.getInjuries({ teamId: homeTeamId }) : Promise.resolve([]),
      awayTeamId ? sportApi.getInjuries({ teamId: awayTeamId }) : Promise.resolve([]),
    ]).then(([h, a]) => { setHomeInj(h as SportInjury[]); setAwayInj(a as SportInjury[]) }).catch(() => {})
  }, [homeTeamId, awayTeamId])

  const availableTabs = (['h2h', 'totals', 'spreads', 'btts'] as const).filter(t => event?.sport_odds?.some(o => o.market_type === t))
  const [activeTab, setActiveTab] = useState<string>('h2h')

  useEffect(() => {
    if (availableTabs.length && !availableTabs.includes(activeTab as 'h2h' | 'totals' | 'spreads' | 'btts')) {
      setActiveTab(availableTabs[0])
    }
  }, [availableTabs.join('')]) // eslint-disable-line

  const cmp = prediction?.comparison
  const compareRows = cmp ? [
    { label: 'ФОРМА',       home: pct(cmp.form?.home),  away: pct(cmp.form?.away) },
    { label: 'АТАКА',       home: pct(cmp.att?.home),   away: pct(cmp.att?.away) },
    { label: 'ЗАЩИТА',      home: pct(cmp.def?.home),   away: pct(cmp.def?.away) },
    { label: 'H2H',         home: pct(cmp.h2h?.home),   away: pct(cmp.h2h?.away) },
    { label: 'ГОЛЫ / ИГРА', home: pct(cmp.goals?.home), away: pct(cmp.goals?.away) },
    { label: 'ПРОПУЩЕНО',   home: 100 - pct(cmp.def?.home), away: 100 - pct(cmp.def?.away) },
  ].filter(r => r.home + r.away > 0) : []

  const leagueName = event?.league ?? 'Лига'
  const bkCount    = new Set((event?.sport_odds ?? []).map(o => o.bookmaker)).size

  // Build nav items only for sections that have data
  const navItems = [
    { id: 'insight',   label: 'Инсайт',    show: prediction !== null },
    { id: 'compare',   label: 'Сравнение', show: compareRows.length > 0 },
    { id: 'h2h',       label: 'H2H',       show: (prediction?.h2h?.length ?? 0) > 0 },
    { id: 'markets',   label: 'Рынки',     show: (event?.sport_odds?.length ?? 0) > 0 },
    { id: 'standings', label: 'Таблица',   show: standings.length > 0 },
    { id: 'injuries',  label: 'Травмы',    show: homeInj.length > 0 || awayInj.length > 0 },
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
      <p className="text-base font-mono text-text-muted mb-4">Матч не найден</p>
      <button onClick={() => onBack ? onBack() : router.back()} className="text-sm font-mono" style={{ color: accent }}>← Назад</button>
    </div>
  )

  return (
    <div ref={pageRef} className="flex flex-col gap-4 pb-8">

      {/* Back */}
      <button onClick={() => onBack ? onBack() : router.back()}
        className="flex items-center gap-1.5 text-[13px] font-mono text-text-muted/60 hover:text-text-secondary transition-colors self-start">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {leagueName} · все матчи
      </button>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-bg-surface overflow-hidden"
        style={{ borderColor: isLive ? 'rgba(255,50,50,0.35)' : `${accent}22` }}>

        {/* Meta */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border"
          style={isLive ? { background: 'rgba(255,50,50,0.04)' } : {}}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {leagueLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leagueLogo} alt="" className="w-5 h-5 object-contain shrink-0" />
            )}
            <span className="text-[12px] font-mono text-text-muted/65 truncate">
              {leagueName}
              {raw?.round != null && ` · ${String(raw.round)}`}
              {raw?.season != null && ` · ${String(raw.season)}`}
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
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border border-bg-border text-text-muted/45 shrink-0">Завершён</span>
          ) : (
            <span className="text-[11px] font-mono text-text-muted/55 shrink-0">
              {new Date(event.starts_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Matchup */}
        <div className="px-6 pt-8 pb-6">
          <div className="grid items-start gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
            {/* Home */}
            <div className="flex flex-col items-center gap-3">
              <TeamAvatar name={event.home_team} logo={homeLogo} accent={accent} size={72} />
              <p className="text-[14px] font-bold text-text-primary text-center leading-snug max-w-[140px]">{event.home_team}</p>
              <FormDots form={form?.home_form ?? null} align="left" />
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-start pt-2 px-4 gap-1">
              {hasScore ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-5xl font-mono font-black leading-none" style={{ color: isLive ? '#ff5252' : accent }}>{event.home_score}</span>
                    <span className="text-3xl font-mono text-text-muted/20 leading-none">:</span>
                    <span className="text-5xl font-mono font-black leading-none" style={{ color: isLive ? '#ff5252' : accent }}>{event.away_score}</span>
                  </div>
                  {isLive && elapsed != null && (
                    <span className="text-[11px] font-mono text-text-muted/45">{elapsed}' · LIVE</span>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 pt-6">
                  <span className="text-lg font-mono font-bold text-text-muted/20 tracking-[0.25em]">VS</span>
                  <span className="text-[11px] font-mono text-text-muted/35">
                    {new Date(event.starts_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-3">
              <TeamAvatar name={event.away_team} logo={awayLogo} accent={accent} size={72} />
              <p className="text-[14px] font-bold text-text-primary text-center leading-snug max-w-[140px]">{event.away_team}</p>
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

          {venue && <p className="text-center text-[11px] font-mono text-text-muted/30 mt-3">{venue}</p>}
        </div>
      </div>

      {/* ── BASIC CARD NOTICE ───────────────────────────────────────────────── */}
      {isBasicCard && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-bg-border bg-bg-surface">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-[12px] font-mono text-text-muted/50 leading-relaxed">
            Базовая карточка — детальная статистика, форма и AI-аналитика появятся автоматически ближе к дате матча.
          </p>
        </div>
      )}

      {/* ── SECTION NAV ─────────────────────────────────────────────────────── */}
      {navItems.length > 0 && <SectionNav items={navItems} />}

      {/* ── AI INSIGHT ──────────────────────────────────────────────────────── */}
      <AiInsightCard pred={prediction} odds={event.sport_odds ?? []} accent={accent} />

      {/* ── ФОРМА SUMMARY ───────────────────────────────────────────────────── */}
      {(form?.home_form || form?.away_form) && (
        <div className="rounded-xl border border-bg-border bg-bg-surface px-5 py-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted/40 mb-2">Форма (5 игр)</p>
          <div className="flex items-baseline gap-4">
            <span className="text-[18px] font-mono font-bold" style={{ color: accent }}>
              {formSummary(form?.home_form ?? null) || '—'}
            </span>
            <span className="text-[13px] font-mono text-text-muted/30">vs</span>
            <span className="text-[18px] font-mono font-bold text-blue-400">
              {formSummary(form?.away_form ?? null) || '—'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-text-muted/35 mt-1">Хозяева — Гости</p>
        </div>
      )}

      {/* ── COMPARISON ──────────────────────────────────────────────────────── */}
      {compareRows.length > 0 && (
        <div id="compare" className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-16">
          <div className="px-4 py-3 border-b border-bg-border">
            <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-text-muted/60">Сравнение команд</span>
          </div>
          <div className="px-5 py-4">
            <div className="flex justify-between text-[12px] font-mono font-bold mb-3">
              <span style={{ color: accent }}>{event.home_team}</span>
              <span style={{ color: '#3b82f6' }}>{event.away_team}</span>
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
                style={activeTab === tab ? { color: accent } : { color: 'rgba(255,255,255,0.35)' }}>
                {MARKET_TAB_LABELS[tab] ?? tab}{outCount > 0 ? ` ${outCount}` : ''}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: accent }} />
                )}
              </button>
            )
          }) : (
            <span className="text-[12px] font-mono text-text-muted/40 py-2 pb-3">Коэффициенты подгружаются...</span>
          )}
          {bkCount > 0 && (
            <span className="ml-auto text-[10px] font-mono text-text-muted/35 pb-2 shrink-0 pl-2">{bkCount} источников</span>
          )}
        </div>
        <div className="py-1">
          {(event.sport_odds?.length ?? 0) > 0
            ? <MarketTable odds={event.sport_odds!} tab={activeTab} accent={accent} />
            : <div className="px-4 py-5 text-[13px] font-mono text-text-muted/40">Коэффициенты не загружены — обновятся автоматически</div>
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

      {/* ── INJURIES ────────────────────────────────────────────────────────── */}
      {(homeInj.length > 0 || awayInj.length > 0) && (
        <InjuriesSection
          homeInjuries={homeInj}
          awayInjuries={awayInj}
          homeTeam={event.home_team}
          awayTeam={event.away_team}
        />
      )}

      {/* ── LINKED MARKETS ──────────────────────────────────────────────────── */}
      {(event.linked_prediction_markets?.length ?? 0) > 0 && (
        <Section title="Рынки предсказаний">
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
