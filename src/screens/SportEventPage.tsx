'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { sportApi } from '../lib/api'
import { getCached, setCached } from '../lib/clientCache'
import { useAuthContext } from '../contexts/AuthContext'
import { useSportWs } from '../hooks/useSportWs'
import { useLiveElapsed } from '../hooks/useLiveElapsed'
import type { SportEvent, SportOdds, SportPrediction, SportStanding, SportInjury, SubscriptionPlan, SportLineup, SportFixtureStat, SportMatchEvent, SportTopScorer } from '../types/index'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
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
type FormEntry  = { result: FormResult; home: string; away: string; score: string; date: string }
type MainTab    = 'overview' | 'stats' | 'lineups' | 'betting' | 'table'

const FORM_COLOR: Record<FormResult, string> = { W: '#61DF6E', D: '#596470', L: '#E55E5B' }
const AWAY_BAR = 'rgba(var(--surface-tint-rgb),0.28)'

const MAIN_TABS: { id: MainTab; ru: string; en: string }[] = [
  { id: 'overview', ru: 'ОБЗОР',      en: 'OVERVIEW'  },
  { id: 'stats',    ru: 'СТАТИСТИКА', en: 'STATS'     },
  { id: 'lineups',  ru: 'СОСТАВЫ',    en: 'LINEUPS'   },
  { id: 'betting',  ru: 'БЕТТИНГ',    en: 'BETTING'   },
  { id: 'table',    ru: 'ТАБЛИЦА',    en: 'TABLE'     },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string) {
  const w = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : (name ?? '--').slice(0, 2).toUpperCase()
}
function pct(s: string | undefined) { return parseFloat(s ?? '0') || 0 }
function pluralRu(n: number, one: string, few: string, many: string) {
  const m = n % 100, last = n % 10
  if (m >= 11 && m <= 19) return `${n} ${many}`
  if (last === 1) return `${n} ${one}`
  if (last >= 2 && last <= 4) return `${n} ${few}`
  return `${n} ${many}`
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

// ─── HeroTeamLogo ─────────────────────────────────────────────────────────────
function HeroTeamLogo({ logo, name, accent }: { logo?: string | null; name: string; accent: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <div className="rounded-full shrink-0 flex items-center justify-center overflow-hidden"
      style={{ width: 48, height: 48, background: mix(accent, 4), border: '1px solid rgba(var(--surface-tint-rgb),0.12)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" loading="lazy" onError={() => setErr(true)} style={{ width: 34, height: 34, objectFit: 'contain' }} />
    </div>
  )
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center font-bold"
      style={{ width: 48, height: 48, background: mix(accent, 6), border: '1px solid rgba(var(--surface-tint-rgb),0.12)', color: accent, fontSize: 12 }}>
      {abbr(name)}
    </div>
  )
}

// ─── MatchHero ────────────────────────────────────────────────────────────────
function MatchHero({ event, elapsed, homeLogo, awayLogo, leagueLogo, isLive, isFinished, hasScore, accent, lang, raw, matchStats, homeForm }: {
  event: SportEvent; elapsed: number | null | undefined
  homeLogo?: string | null; awayLogo?: string | null; leagueLogo?: string | null
  isLive: boolean; isFinished: boolean; hasScore: boolean
  accent: string; lang: Lang; raw: Record<string, unknown> | null | undefined
  matchStats: SportFixtureStat[]
  homeForm: FormEntry[] | null
}) {
  const t = useT(lang)
  const ru = lang === 'ru'

  // ── Context bar data ────────────────────────────────────────────────────────
  const parseStatVal = (v: unknown): number => parseFloat(String(v ?? '0').replace('%', '')) || 0

  // Half-time score — try common API-football field paths
  const htRaw = (raw?.score as { halftime?: { home: number | null; away: number | null } } | null)?.halftime
    ?? (raw?.halftime as { home: number | null; away: number | null } | null)
    ?? null
  const htHome = htRaw?.home ?? null
  const htAway = htRaw?.away ?? null
  const hasHT  = htHome != null && htAway != null

  let possession:    { home: number; away: number } | null = null
  let shotsOnTarget: { home: number; away: number } | null = null

  if (matchStats.length >= 2) {
    const hStats = matchStats[0].stats
    const aStats = matchStats[1].stats
    if (hStats.ball_possession != null || aStats.ball_possession != null) {
      possession = { home: parseStatVal(hStats.ball_possession), away: parseStatVal(aStats.ball_possession) }
    }
    if (hStats.shots_on_goal != null || aStats.shots_on_goal != null) {
      shotsOnTarget = { home: parseStatVal(hStats.shots_on_goal), away: parseStatVal(aStats.shots_on_goal) }
    }
  }

  const showContextBar = (isLive || isFinished) && (hasHT || possession != null || shotsOnTarget != null || (homeForm?.length ?? 0) > 0)

  const DIM  = 'rgba(var(--surface-tint-rgb),0.28)'
  const DIM2 = 'rgba(var(--surface-tint-rgb),0.18)'

  return (
    <div className="px-3 sm:px-4 md:px-6"
      style={{ background: 'rgb(var(--bg-base))', borderBottom: '1px solid rgba(var(--surface-tint-rgb),0.08)' }}>

      {/* ── Row 1: Meta bar ─────────────────────────────────────────���─ */}
      <div className="flex items-center justify-between gap-2" style={{ minHeight: 32, paddingTop: 6, paddingBottom: 4 }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {leagueLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leagueLogo} alt="" loading="lazy" className="w-3.5 h-3.5 object-contain shrink-0 opacity-60" />
          )}
          <span className="text-[9px] font-mono truncate" style={{ color: DIM, letterSpacing: '0.04em' }}>
            {event.league ?? ''}
            {raw?.season != null && <span style={{ color: DIM2 }}> · {String(raw.season)}</span>}
          </span>
        </div>
        {isLive ? (
          <span className="text-[8px] font-mono font-bold px-1.5 py-[3px] rounded shrink-0 tracking-wider"
            style={{ background: 'rgba(255,50,50,0.12)', color: '#ff5252', border: '0.5px solid rgba(255,50,50,0.28)' }}>
            ● LIVE
          </span>
        ) : isFinished ? (
          <span className="text-[9px] font-mono uppercase tracking-[0.08em] shrink-0" style={{ color: DIM }}>{t('sport.finished_label')}</span>
        ) : (
          <span className="text-[9px] font-mono shrink-0" style={{ color: DIM }}>
            {new Date(event.starts_at).toLocaleTimeString(ru ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Row 2: Scoreboard ───────────────────────────────────────── */}
      <div className="flex items-center" style={{ minHeight: 90, paddingBottom: showContextBar ? 8 : 10, paddingTop: 2 }}>

        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0 px-1">
          <HeroTeamLogo logo={homeLogo} name={event.home_team} accent={accent} />
          <span className="text-[12px] text-center leading-tight w-full truncate"
            style={{ color: 'rgb(var(--text-secondary))' }}>
            {event.home_team}
          </span>
        </div>

        {/* Score center */}
        <div className="flex flex-col items-center justify-center gap-0.5 shrink-0" style={{ width: 116 }}>
          <span className="text-[8px] font-mono uppercase tracking-[0.12em]" style={{ color: DIM }}>
            {ru ? 'СЧЁТ' : 'SCORE'}
          </span>
          {hasScore ? (
            <div className="flex items-baseline gap-1 leading-none">
              <span className="text-[44px] font-mono tabular-nums leading-none"
                style={{ color: 'rgb(var(--text-primary))', fontWeight: 500 }}>
                {event.home_score}
              </span>
              <span className="text-[22px] font-mono leading-none" style={{ color: DIM2, fontWeight: 300 }}>:</span>
              <span className="text-[44px] font-mono tabular-nums leading-none"
                style={{ color: 'rgb(var(--text-primary))', fontWeight: 500 }}>
                {event.away_score}
              </span>
            </div>
          ) : (
            <div className="flex items-center leading-none gap-1">
              <span className="text-[28px] font-mono leading-none" style={{ color: DIM2, fontWeight: 300 }}>—</span>
              <span className="text-[16px] font-mono leading-none" style={{ color: DIM2, fontWeight: 300 }}>:</span>
              <span className="text-[28px] font-mono leading-none" style={{ color: DIM2, fontWeight: 300 }}>—</span>
            </div>
          )}
          {isLive && elapsed != null && (
            <span className="text-[14px] font-mono leading-none mt-0.5" style={{ color: '#D4A017', fontWeight: 500 }}>
              {elapsed}&apos;
            </span>
          )}
          {isFinished && (
            <span className="text-[9px] font-mono uppercase tracking-[0.08em] mt-0.5" style={{ color: DIM }}>
              {t('sport.ft_abbr')}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0 px-1">
          <HeroTeamLogo logo={awayLogo} name={event.away_team} accent={accent} />
          <span className="text-[12px] text-center leading-tight w-full truncate"
            style={{ color: 'rgb(var(--text-secondary))' }}>
            {event.away_team}
          </span>
        </div>
      </div>

      {/* ── Row 3: Context bar ──────────────────────────────────────── */}
      {showContextBar && (
        <div className="flex" style={{ borderTop: '0.5px solid rgba(var(--surface-tint-rgb),0.08)', minHeight: 36 }}>

          {/* 1-Й ТАЙМ */}
          {hasHT && (
            <div className="flex-1 flex flex-col items-center justify-center py-1.5 border-r"
              style={{ borderColor: 'rgba(var(--surface-tint-rgb),0.07)' }}>
              <span className="text-[8px] font-mono uppercase tracking-[0.08em] mb-0.5" style={{ color: DIM2 }}>
                {ru ? '1-Й ТАЙМ' : 'HT'}
              </span>
              <span className="text-[12px] font-mono tabular-nums" style={{ color: 'rgb(var(--text-secondary))' }}>
                {htHome} : {htAway}
              </span>
            </div>
          )}

          {/* ВЛАДЕНИЕ */}
          {possession != null && (
            <div className="flex-1 flex flex-col items-center justify-center py-1.5 border-r"
              style={{ borderColor: 'rgba(var(--surface-tint-rgb),0.07)' }}>
              <span className="text-[8px] font-mono uppercase tracking-[0.08em] mb-0.5" style={{ color: DIM2 }}>
                {ru ? 'ВЛАДЕНИЕ' : 'POSS'}
              </span>
              <div className="flex items-center gap-0.5 text-[12px] font-mono tabular-nums">
                <span style={{ color: possession.home >= possession.away ? '#D4A017' : 'rgb(var(--text-secondary))' }}>
                  {possession.home}%
                </span>
                <span style={{ color: DIM2 }}>:</span>
                <span style={{ color: possession.away > possession.home ? '#D4A017' : 'rgb(var(--text-secondary))' }}>
                  {possession.away}%
                </span>
              </div>
            </div>
          )}

          {/* УДАРЫ В ЦЕЛЬ */}
          {shotsOnTarget != null && (
            <div className="flex-1 flex flex-col items-center justify-center py-1.5 border-r"
              style={{ borderColor: 'rgba(var(--surface-tint-rgb),0.07)' }}>
              <span className="text-[8px] font-mono uppercase tracking-[0.08em] mb-0.5" style={{ color: DIM2 }}>
                {ru ? 'УД. В ЦЕЛЬ' : 'SOT'}
              </span>
              <div className="flex items-center gap-0.5 text-[12px] font-mono tabular-nums">
                <span style={{ color: shotsOnTarget.home >= shotsOnTarget.away ? '#D4A017' : 'rgb(var(--text-secondary))' }}>
                  {shotsOnTarget.home}
                </span>
                <span style={{ color: DIM2 }}>:</span>
                <span style={{ color: shotsOnTarget.away > shotsOnTarget.home ? '#D4A017' : 'rgb(var(--text-secondary))' }}>
                  {shotsOnTarget.away}
                </span>
              </div>
            </div>
          )}

          {/* ФОРМА (home only, 5 squares) */}
          {(homeForm?.length ?? 0) > 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-1.5">
              <span className="text-[8px] font-mono uppercase tracking-[0.08em] mb-1" style={{ color: DIM2 }}>
                {ru ? 'ФОРМА' : 'FORM'}
              </span>
              <div className="flex gap-[3px]">
                {(homeForm ?? []).slice(0, 5).map((f, i) => (
                  <div key={i} title={`${f.home} ${f.score} ${f.away}`}
                    style={{ width: 10, height: 10, borderRadius: 2, background: FORM_COLOR[f.result], flexShrink: 0 }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ─── MatchTabBar ──────────────────────────────────────────────────────────────
function MatchTabBar({ active, onChange, accent, lang }: {
  active: MainTab; onChange: (t: MainTab) => void; accent: string; lang: Lang
}) {
  return (
    <div className="relative" style={{ background: 'rgb(var(--bg-base))', borderBottom: '1px solid rgb(var(--bg-border))' }}>
      <div className="flex overflow-x-auto px-1 sm:px-2 md:px-3" style={{ scrollbarWidth: 'none' }}>
        {MAIN_TABS.map(tab => {
          const isActive = tab.id === active
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className="relative px-3 py-2.5 text-[11px] font-mono font-bold tracking-wide whitespace-nowrap shrink-0 transition-colors"
              style={{ color: isActive ? accent : 'rgba(var(--surface-tint-rgb),0.38)' }}>
              {lang === 'ru' ? tab.ru : tab.en}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: accent }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
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

// ─── PlayerAvatar ─────────────────────────────────────────────────────────────
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
function FormDots({ form, align = 'left', labeled = false }: {
  form: FormEntry[] | null; align?: 'left' | 'right'; labeled?: boolean
}) {
  const dots: (FormEntry | null)[] = form ?? Array(5).fill(null)
  const sz = labeled ? 18 : 16
  return (
    <div className={`flex gap-0.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {dots.map((f, i) => f ? (
        <div key={i} title={`${f.home} ${f.score} ${f.away}`}
          className="shrink-0 flex items-center justify-center font-mono font-bold"
          style={{ width: sz, height: sz, background: FORM_COLOR[f.result], borderRadius: 3, fontSize: 7, color: 'rgba(0,0,0,0.65)' }}>
          {labeled ? f.result : ''}
        </div>
      ) : (
        <div key={i} className="shrink-0 border border-bg-border bg-bg-elevated animate-pulse"
          style={{ width: sz, height: sz, borderRadius: 3 }} />
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
    <div id={id} className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-bg-border/50">
        <span className="text-[9px] font-mono tracking-[0.1em] uppercase text-text-muted/50">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── FormBlock ────────────────────────────────────────────────────────────────
function FormBlock({ home_form, away_form, homeName, awayName }: {
  home_form: FormEntry[] | null; away_form: FormEntry[] | null
  homeName: string; awayName: string
}) {
  const { lang } = useLang()
  const summarize = (form: FormEntry[] | null) => {
    if (!form?.length) return null
    const w = form.filter(f => f.result === 'W').length
    const d = form.filter(f => f.result === 'D').length
    const l = form.filter(f => f.result === 'L').length
    return `${w}W · ${d}D · ${l}L`
  }
  const hint = lang === 'ru' ? '← новее' : '← recent'
  return (
    <Section title={lang === 'ru' ? 'ФОРМА' : 'FORM'} action={
      <span className="text-[9px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.25)' }}>{hint}</span>
    }>
      <div className="flex flex-col divide-y divide-bg-border/30">
        {([
          { name: homeName, form: home_form },
          { name: awayName, form: away_form },
        ] as const).map(({ name, form }) => {
          const summary = summarize(form)
          return (
            <div key={name} className="flex items-center gap-2.5 px-3 py-2.5">
              <span className="text-[10px] font-mono truncate shrink-0"
                style={{ width: 80, color: 'rgba(var(--surface-tint-rgb),0.45)' }}>
                {name}
              </span>
              <FormDots form={form} labeled />
              {summary && (
                <span className="text-[9px] font-mono ml-auto shrink-0 tabular-nums"
                  style={{ color: 'rgba(var(--surface-tint-rgb),0.25)' }}>
                  {summary}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── MiniStatsBlock ───────────────────────────────────────────────────────────
const MINI_STAT_KEYS = ['ball_possession', 'shots_on_goal', 'total_shots', 'corner_kicks', 'fouls']

function MiniStatsBlock({ stats, accent, onMore, homeName, awayName }: {
  stats: SportFixtureStat[]; accent: string; onMore: () => void
  homeName?: string; awayName?: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  if (stats.length < 2) return null
  const home = stats[0], away = stats[1]

  const STAT_LABELS: Record<string, string> = {
    ball_possession: t('stat.ball_possession'),
    shots_on_goal:   t('stat.shots_on_goal'),
    total_shots:     t('stat.total_shots'),
    corner_kicks:    t('stat.corner_kicks'),
    fouls:           t('stat.fouls'),
  }
  const parseVal = (v: string | number | null | undefined): number =>
    parseFloat(String(v ?? '0').replace('%', '')) || 0

  const rows = MINI_STAT_KEYS.map(key => {
    const hv = home.stats[key], av = away.stats[key]
    if (hv == null && av == null) return null
    return { key, label: STAT_LABELS[key], hRaw: hv, aRaw: av, hVal: parseVal(hv), aVal: parseVal(av) }
  }).filter(Boolean) as Array<{ key: string; label: string; hRaw: unknown; aRaw: unknown; hVal: number; aVal: number }>

  if (!rows.length) return null

  return (
    <Section title={t('sport.title.match_stats')}
      action={
        <button onClick={onMore} className="text-[9px] font-mono hover:opacity-70 transition-opacity"
          style={{ color: 'rgba(var(--surface-tint-rgb),0.35)' }}>
          {lang === 'ru' ? 'подробнее →' : 'more →'}
        </button>
      }>
      {(homeName || awayName) && (
        <div className="flex items-center justify-between px-3 pt-2.5 pb-0">
          <span className="text-[10px] font-mono font-semibold" style={{ color: accent, opacity: 0.85 }}>
            {abbr(homeName ?? '')}
          </span>
          <span className="text-[10px] font-mono font-semibold" style={{ color: 'rgba(var(--surface-tint-rgb),0.4)' }}>
            {abbr(awayName ?? '')}
          </span>
        </div>
      )}
      <div className="px-3 py-2 flex flex-col">
        {rows.map(r => {
          const total  = r.hVal + r.aVal || 1
          const hPct   = Math.round((r.hVal / total) * 100)
          const aPct   = 100 - hPct
          const hLeads = r.hVal >= r.aVal
          return (
            <div key={r.key} className="flex items-center gap-2 min-h-[34px]">
              <span className="text-[12px] font-mono w-9 text-right tabular-nums shrink-0"
                style={{ color: hLeads ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.35)', fontWeight: hLeads ? 600 : 400 }}>
                {String(r.hRaw ?? 0)}
              </span>
              <div className="flex flex-1 h-[3px] rounded-full overflow-hidden">
                <div style={{ width: `${hPct}%`, background: accent, borderRadius: '99px 0 0 99px', opacity: hLeads ? 1 : 0.5 }} />
                <div style={{ flex: 1, background: AWAY_BAR, opacity: 0.4, borderRadius: '0 99px 99px 0' }} />
              </div>
              <span className="text-[9px] font-mono uppercase tracking-[0.08em] w-[82px] text-center shrink-0"
                style={{ color: 'rgba(var(--surface-tint-rgb),0.35)' }}>
                {r.label}
              </span>
              <div className="flex flex-1 h-[3px] rounded-full overflow-hidden flex-row-reverse">
                <div style={{ width: `${aPct}%`, background: AWAY_BAR, borderRadius: '99px 0 0 99px', opacity: !hLeads ? 1 : 0.5 }} />
                <div style={{ flex: 1, background: AWAY_BAR, opacity: 0.15, borderRadius: '0 99px 99px 0' }} />
              </div>
              <span className="text-[12px] font-mono w-9 tabular-nums shrink-0"
                style={{ color: !hLeads ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.3)', fontWeight: !hLeads ? 600 : 400 }}>
                {String(r.aRaw ?? 0)}
              </span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─── OddsOverviewBlock ────────────────────────────────────────────────────────
function OddsOverviewBlock({ odds, accent, sport, onMore, homeName, awayName, isLive }: {
  odds: SportOdds[]; accent: string; sport: string; onMore: () => void
  homeName?: string; awayName?: string; isLive?: boolean
}) {
  const { lang } = useLang()
  const t = useT(lang)
  const rows = aggregateMarket(odds, 'h2h')
  if (!rows.length) return null

  const isFootball = sport === 'football'
  const home = rows.find(o => /^home$/i.test(o.name) || o.name === '1') ?? rows[0]
  const away = rows.find(o => /^away$/i.test(o.name) || o.name === '2') ?? rows[rows.length - 1]
  const draw = isFootball ? (rows.find(o => /^draw$/i.test(o.name) || o.name === 'X') ?? null) : null
  const display = [home, ...(draw ? [draw] : []), away].filter(Boolean) as AggOutcome[]
  const maxImp = Math.max(...display.map(o => o.implied))
  const bkCount = new Set(odds.filter(o => o.market_type === 'h2h').map(o => o.bookmaker)).size

  const outcomeLabel = (name: string) => {
    if (/^home$/i.test(name) || name === '1') return homeName ?? '1'
    if (/^away$/i.test(name) || name === '2') return awayName ?? '2'
    if (/^draw$/i.test(name) || name === 'X') return lang === 'ru' ? 'Ничья' : 'Draw'
    return name
  }
  const outcomeBarBg = (name: string) => {
    if (/^home$/i.test(name) || name === '1') return accent
    if (/^draw$/i.test(name) || name === 'X') return 'rgba(89,100,112,0.6)'
    return AWAY_BAR
  }

  return (
    <Section title={lang === 'ru' ? 'КОЭФФИЦИЕНТЫ' : 'ODDS'}
      action={
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,50,50,0.12)', color: '#ff5252', border: '0.5px solid rgba(255,50,50,0.3)' }}>
              ● LIVE
            </span>
          )}
          <button onClick={onMore} className="text-[9px] font-mono hover:opacity-70 transition-opacity"
            style={{ color: 'rgba(var(--surface-tint-rgb),0.35)' }}>
            {lang === 'ru' ? 'подробнее →' : 'more →'}
          </button>
        </div>
      }>
      <div className="px-3 pt-3 pb-2 flex gap-2">
        {display.map(outcome => {
          const isFav = outcome.implied === maxImp
          return (
            <div key={outcome.name} className="flex-1 flex flex-col items-center py-2.5 rounded-lg gap-0.5"
              style={isFav
                ? { border: `1.5px solid ${accent}55`, background: `${accent}08` }
                : { border: '1px solid rgba(var(--surface-tint-rgb),0.08)' }
              }>
              <span className="text-[18px] font-mono leading-none font-semibold"
                style={{ color: isFav ? accent : 'rgb(var(--text-primary))' }}>
                {outcome.best.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono tabular-nums"
                style={{ color: isFav ? accent : 'rgba(var(--surface-tint-rgb),0.4)' }}>
                {outcome.implied}%
              </span>
              <span className="text-[8px] font-mono text-center px-1 truncate w-full mt-0.5"
                style={{ color: 'rgba(var(--surface-tint-rgb),0.35)' }}>
                {outcomeLabel(outcome.name)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex h-[3px] mx-3 mb-2 rounded-full overflow-hidden gap-px">
        {display.map((o, i) => (
          <div key={i} style={{ flex: o.implied, background: outcomeBarBg(o.name) }} />
        ))}
      </div>
      {bkCount > 0 && (
        <div className="px-3 pb-2.5 text-[9px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.25)' }}>
          {lang === 'ru'
            ? pluralRu(bkCount, 'букмекер', 'букмекера', 'букмекеров')
            : `${bkCount} ${t('sport.market.sources')}`}
        </div>
      )}
    </Section>
  )
}

// ─── AI Insight ───────────────────────────────────────────────────────────────
function AiInsightCard({ pred, odds, accent }: {
  pred: SportPrediction | null | undefined; odds: SportOdds[]; accent: string
}) {
  const { lang } = useLang()
  const t = useT(lang)

  if (pred === undefined) return (
    <Section title={lang === 'ru' ? 'ПРОГНОЗ' : 'FORECAST'}>
      <div className="px-3 py-4 flex flex-col gap-2.5">
        {[88, 65, 44].map((w, i) => (
          <div key={i} className="h-2 rounded animate-pulse bg-bg-elevated" style={{ width: `${w}%` }} />
        ))}
      </div>
    </Section>
  )
  if (!pred) return null

  const bkCount = new Set(odds.map(o => o.bookmaker)).size
  const bestAiVal = odds.map(o => o.ai_value).filter(Boolean).sort((a, b) => (b?.confidence ?? 0) - (a?.confidence ?? 0))[0]
  const maxPct = Math.max(pred.home_pct, pred.away_pct)
  const confidence = maxPct >= 60 ? t('sport.high_confidence') : maxPct >= 50 ? t('sport.medium_confidence') : t('sport.low_confidence')
  const confidenceColor = maxPct >= 60 ? '#22c55e' : maxPct >= 50 ? '#D4A017' : 'rgba(var(--surface-tint-rgb),0.45)'
  const advice = pred.advice ?? (pred.winner_name ? `${pred.winner_name}. ${pred.winner_comment ?? ''}`.trim() : null)

  const outcomes = [
    { label: t('sport.home'), pct: pred.home_pct },
    ...(pred.draw_pct != null ? [{ label: t('sport.draw'), pct: pred.draw_pct }] : []),
    { label: t('sport.away'), pct: pred.away_pct },
  ]
  const maxOutcomePct = Math.max(...outcomes.map(o => o.pct))

  const srcLabel = lang === 'ru'
    ? pluralRu(bkCount, 'источник', 'источника', 'источников')
    : `${bkCount} ${t('sport.data_sources')}`

  return (
    <Section title={lang === 'ru' ? 'ПРОГНОЗ' : 'FORECAST'} action={
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: confidenceColor }} />
        <span className="text-[9px] font-mono" style={{ color: confidenceColor }}>{confidence}</span>
        {bkCount > 0 && (
          <span className="text-[9px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.25)' }}>· {srcLabel}</span>
        )}
      </div>
    }>
      <div className="px-3 py-3 flex flex-col gap-3">
        {advice && <p className="text-[13px] text-text-primary leading-relaxed">{advice}</p>}

        <div className="flex flex-col gap-1.5">
          {outcomes.map(o => (
            <div key={o.label} className="flex items-center gap-2">
              <span className="text-[9px] font-mono shrink-0" style={{ width: 56, color: 'rgba(var(--surface-tint-rgb),0.45)' }}>
                {o.label}
              </span>
              <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(var(--surface-tint-rgb),0.08)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((o.pct / (maxOutcomePct || 100)) * 100)}%`,
                    background: o.pct === maxOutcomePct ? accent : 'rgba(var(--surface-tint-rgb),0.22)',
                  }} />
              </div>
              <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ width: 36, textAlign: 'right',
                color: o.pct === maxOutcomePct ? accent : 'rgba(var(--surface-tint-rgb),0.4)',
                fontWeight: o.pct === maxOutcomePct ? 600 : 400 }}>
                {o.pct}%
              </span>
            </div>
          ))}
        </div>

        {bestAiVal?.value_rating != null && (
          <div className="flex flex-wrap gap-1.5">
            <div className="px-2.5 py-1 rounded text-[9px] font-mono font-semibold"
              style={{ background: `${accent}14`, color: accent, border: `0.5px solid ${accent}40` }}>
              Edge +{bestAiVal.value_rating}% · {bestAiVal.suggested_side ?? pred.winner_name}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

// ─── H2H ──────────────────────────────────────────────────────────────────────
function H2HSection({ h2h, homeId, awayId, homeName, awayName, accent }: {
  h2h: SportPrediction['h2h']; homeId: number | null; awayId: number | null
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
  const total    = homeWins + draws + awayWins || 1
  const homeWinPct = Math.round((homeWins / total) * 100)
  const drawPct    = Math.round((draws / total) * 100)
  const awayWinPct = 100 - homeWinPct - drawPct

  return (
    <Section id="h2h" title={lang === 'ru' ? `Head-to-Head · ${h2h.length} встреч` : `Head-to-Head · ${h2h.length} matches`}>
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
      <div className="flex h-1.5 mx-4 my-3 rounded-full overflow-hidden gap-px">
        {homeWinPct > 0 && <div style={{ width: `${homeWinPct}%`, background: accent }} />}
        {drawPct > 0    && <div style={{ width: `${drawPct}%`, background: '#596470' }} />}
        {awayWinPct > 0 && <div style={{ flex: 1, background: AWAY_BAR }} />}
      </div>
      <div className="flex flex-col divide-y divide-bg-border/30 max-h-[300px] overflow-y-auto">
        {h2h.map(m => {
          const hG = m.goals.home ?? 0, aG = m.goals.away ?? 0
          const isHomeMatch = m.teams.home.id === homeId
          const ours = isHomeMatch ? hG : aG, theirs = isHomeMatch ? aG : hG
          const result: FormResult = ours > theirs ? 'W' : ours < theirs ? 'L' : 'D'
          const homeWon = hG > aG, awayWon = aG > hG
          return (
            <div key={m.fixture.id} className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
              <span className="text-[11px] font-mono text-text-muted w-[80px] shrink-0">
                {new Date(m.fixture.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-[13px] truncate text-right flex-1 ${homeWon ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>{m.teams.home.name}</span>
                <span className="text-[14px] font-mono font-bold text-text-primary shrink-0 tabular-nums px-1">{m.goals.home ?? '?'}:{m.goals.away ?? '?'}</span>
                <span className={`text-[13px] truncate flex-1 ${awayWon ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>{m.teams.away.name}</span>
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
  const visible = expanded ? standings : (() => {
    const idxs = standings.map((s, i) => highlighted.has(s.team_external_id) ? i : -1).filter(i => i >= 0)
    if (!idxs.length) return standings.slice(0, SHOW)
    const min = Math.max(0, Math.min(...idxs) - 1)
    const max = Math.min(standings.length - 1, Math.max(...idxs) + 1)
    return standings.slice(min, max + 1)
  })()

  const seasonYear  = standings[0]?.season
  const seasonLabel = seasonYear ? `${seasonYear}/${String(seasonYear + 1).slice(-2)}` : ''

  return (
    <Section id="standings"
      title={lang === 'ru' ? `Турнирная таблица · ${leagueName} · ${seasonLabel}` : `Standings · ${leagueName} · ${seasonLabel}`}
      action={
        <button onClick={() => setExpanded(e => !e)} className="text-[10px] font-mono text-text-muted/50 hover:text-text-muted/80 transition-colors">
          {expanded ? t('sport.standings.collapse') : t('sport.standings.expand')}
        </button>
      }>
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
              <div key={s.id} className="grid items-center px-4 py-2.5"
                style={{ gridTemplateColumns: '28px 1fr 44px 52px 52px', background: isHL ? mix(accent, 3) : undefined, borderLeft: isHL ? `2px solid ${accent}` : '2px solid transparent' }}>
                <span className="text-[11px] font-mono text-text-muted/50">{s.rank}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.team_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.team_logo} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full shrink-0 border"
                      style={{ background: isHL ? mix(accent, 31) : 'transparent', borderColor: isHL ? accent : 'rgba(var(--surface-tint-rgb),0.15)' }} />
                  )}
                  <span className={`text-[13px] truncate ${isHL ? 'font-bold' : 'text-text-secondary'}`} style={isHL ? { color: accent } : {}}>
                    {s.team_name}
                  </span>
                </div>
                <span className="text-[12px] font-mono text-right text-text-muted">{s.played}</span>
                <span className="text-[13px] font-mono font-bold text-right" style={isHL ? { color: accent } : { color: 'rgb(var(--text-primary))' }}>{s.points}</span>
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
  homeInjuries: SportInjury[]; awayInjuries: SportInjury[]; homeTeam: string; awayTeam: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!homeInjuries.length && !awayInjuries.length) return null
  return (
    <Section id="injuries" title={t('sport.title.injuries')}>
      <div className="grid grid-cols-2 divide-x divide-bg-border">
        {[{ team: homeTeam, injuries: homeInjuries }, { team: awayTeam, injuries: awayInjuries }].map(({ team, injuries }) => (
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
  const rows     = aggregateMarket(odds, tab)
  const bkCount  = new Set(odds.filter(o => o.market_type === tab).map(o => o.bookmaker)).size
  if (!rows.length) return <div className="flex justify-center py-8 text-[13px] font-mono text-text-muted/40">{t('common.no_data')}</div>

  const isDC   = (name: string) => name.includes('/') || /draw no bet/i.test(name)
  const isH2H  = tab === 'h2h'
  const main   = isH2H ? rows.filter(r => !isDC(r.name)) : rows
  const dc     = isH2H ? rows.filter(r => isDC(r.name))  : []

  const renderRow = (row: AggOutcome) => (
    <div key={row.name} className="grid items-center px-3 py-2.5 hover:bg-text-primary/[0.02] transition-colors"
      style={{ gridTemplateColumns: '1fr 72px 56px' }}>
      <span className="text-[11px] font-mono text-text-secondary truncate pr-2">{row.name}</span>
      <span className="text-[13px] font-mono text-right text-text-primary tabular-nums" style={{ fontWeight: 500 }}>{row.best.toFixed(2)}</span>
      <span className="text-[10px] font-mono text-right tabular-nums" style={{ color: 'rgba(var(--surface-tint-rgb),0.35)' }}>{row.implied}%</span>
    </div>
  )

  return (
    <div>
      <div className="grid px-3 py-2 text-[9px] font-mono uppercase tracking-[0.08em] border-b border-bg-border/30"
        style={{ gridTemplateColumns: '1fr 72px 56px', color: 'rgba(var(--surface-tint-rgb),0.3)' }}>
        <span>{t('sport.market.outcome')}</span>
        <span className="text-right">{t('sport.market.best')} · {bkCount}</span>
        <span className="text-right">%</span>
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
    { label: t('sport.ha.home_wdl'),     homeVal: home ? `${home.home_wins}/${home.home_draws}/${home.home_losses}` : '—', awayVal: away ? `${away.home_wins}/${away.home_draws}/${away.home_losses}` : '—' },
    { label: t('sport.ha.away_wdl'),     homeVal: home ? `${home.away_wins}/${home.away_draws}/${home.away_losses}` : '—', awayVal: away ? `${away.away_wins}/${away.away_draws}/${away.away_losses}` : '—' },
    { label: t('sport.ha.goals_scored'), homeVal: home?.goals_for ?? '—', awayVal: away?.goals_for ?? '—' },
    { label: t('sport.ha.goals_conceded'), homeVal: home?.goals_against ?? '—', awayVal: away?.goals_against ?? '—' },
    { label: t('sport.ha.goal_diff'),    homeVal: home ? (home.goal_diff > 0 ? `+${home.goal_diff}` : home.goal_diff) : '—', awayVal: away ? (away.goal_diff > 0 ? `+${away.goal_diff}` : away.goal_diff) : '—' },
    { label: t('sport.ha.form'),         homeVal: home?.form ?? '—', awayVal: away?.form ?? '—' },
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
            <span className="text-[13px] font-mono font-semibold w-16 text-left" style={{ color: accent }}>{r.homeVal}</span>
            <span className="text-[10px] font-mono text-text-muted/40 uppercase tracking-wide text-center flex-1 px-2">{r.label}</span>
            <span className="text-[13px] font-mono font-semibold w-16 text-right text-text-muted/65">{r.awayVal}</span>
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
    if (status === 'scheduled') return (
      <Section id="lineups" title={t('sport.title.lineups')}>
        <p className="px-4 py-5 text-[12px] font-mono text-text-muted/35">{t('sport.lineup_pending')}</p>
      </Section>
    )
    return null
  }
  const home = lineups[0], away = lineups[1]
  const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 }
  const sortPlayers = (players: SportLineup['start_xi']) =>
    [...players].sort((a, b) => (POS_ORDER[a.pos ?? ''] ?? 9) - (POS_ORDER[b.pos ?? ''] ?? 9))

  const PlayerRow = ({ p, align }: { p: SportLineup['start_xi'][0]; align: 'left' | 'right' }) => (
    <Link href={`/sport/${sub}/player/${p.id}`}
      className={`flex items-center gap-2 py-1.5 hover:bg-text-primary/[0.02] rounded transition-colors cursor-pointer ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className="flex items-center justify-center w-5 h-5 rounded text-[11px] font-mono shrink-0 border border-bg-border/50"
        style={{ color: 'rgba(var(--surface-tint-rgb),0.35)' }}>
        {p.number ?? '—'}
      </span>
      <span className="text-[13px] text-text-primary truncate hover:underline decoration-dotted underline-offset-2">{p.name}</span>
      {p.pos && (
        <span className="shrink-0 text-[9px] font-mono px-1 py-0.5 rounded border border-bg-border/50"
          style={{ color: 'rgba(var(--surface-tint-rgb),0.3)' }}>
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
          <span className="text-[11px] font-mono font-bold" style={{ color: '#D4A017' }}>{team.formation}</span>
        )}
        {team.coach_name && (
          <span className="text-[9px] font-mono truncate" style={{ color: 'rgba(var(--surface-tint-rgb),0.28)' }}>{team.coach_name}</span>
        )}
      </div>
      <div className="flex flex-col">
        {sortPlayers(team.start_xi).map(p => <PlayerRow key={p.id} p={p} align={align} />)}
      </div>
      {team.substitutes.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-3 mb-1.5">
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--surface-tint-rgb),0.1)' }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.1em]" style={{ color: 'rgba(var(--surface-tint-rgb),0.28)' }}>
              {lang === 'ru' ? 'Скамейка' : 'Bench'}
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--surface-tint-rgb),0.1)' }} />
          </div>
          {team.substitutes.map(p => (
            <Link key={p.id} href={`/sport/${sub}/player/${p.id}`}
              className={`flex items-center gap-2 py-1 opacity-40 hover:opacity-65 transition-opacity ${align === 'right' ? 'flex-row-reverse' : ''}`}>
              <span className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-mono border border-bg-border/40 shrink-0"
                style={{ color: 'rgba(var(--surface-tint-rgb),0.28)' }}>
                {p.number ?? '—'}
              </span>
              <span className="text-[11px] text-text-muted/55 truncate hover:underline decoration-dotted underline-offset-2">{p.name}</span>
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

// ─── Match Events ─────────────────────────────────────────────────────────────
function MatchEventsSection({ events, homeTeamId, accent, status, homeName, awayName }: {
  events: SportMatchEvent[]; homeTeamId: number | null | undefined; accent: string; status?: string
  homeName?: string; awayName?: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!events.length) {
    if (status === 'live' || status === 'finished') return (
      <Section id="match-events" title={t('sport.title.match_events')}>
        <p className="px-4 py-5 text-[12px] font-mono text-text-muted/35">{t('sport.no_match_events')}</p>
      </Section>
    )
    return null
  }
  const isHome = (e: SportMatchEvent) => e.team_id === homeTeamId
  const homeAbbr = homeName ? abbr(homeName) : null
  const awayAbbr = awayName ? abbr(awayName) : null

  const getIconConfig = (type: string, detail?: string | null) => {
    const isRed = detail?.toLowerCase().includes('red')
    if (type === 'Goal')         return { letter: 'G', bg: 'rgba(34,197,94,0.14)',           fg: '#22c55e' }
    if (type === 'Card' && isRed) return { letter: 'R', bg: 'rgba(239,68,68,0.14)',           fg: '#ef4444' }
    if (type === 'Card')          return { letter: 'Y', bg: 'rgba(234,179,8,0.14)',            fg: '#eab308' }
    if (type === 'subst')         return { letter: 'S', bg: 'rgba(var(--surface-tint-rgb),0.07)', fg: 'rgba(var(--surface-tint-rgb),0.35)' }
    return                               { letter: '·', bg: 'transparent',                    fg: 'rgba(var(--surface-tint-rgb),0.2)' }
  }

  return (
    <Section id="match-events" title={t('sport.title.match_events')}>
      <div className="flex flex-col divide-y divide-bg-border/[0.12] max-h-[360px] overflow-y-auto">
        {events.map((e, i) => {
          const home = isHome(e)
          const isGoal = e.type === 'Goal'
          const { letter, bg, fg } = getIconConfig(e.type, e.detail)
          const minute = e.minute != null ? `${e.minute}${e.extra ? `+${e.extra}` : ''}'` : '—'
          const teamAbbr = home ? homeAbbr : awayAbbr

          return (
            <div key={i} className="grid items-center px-3 py-2 min-h-[36px]"
              style={{
                gridTemplateColumns: '28px 1fr 22px 1fr',
                gap: '4px 6px',
                background: isGoal ? 'rgba(34,197,94,0.03)' : undefined,
              }}>
              <span className="text-[10px] font-mono tabular-nums" style={{ color: '#D4A017' }}>
                {minute}
              </span>
              <div className="flex flex-col items-end min-w-0">
                {home && (
                  <>
                    <span className="text-[11px] font-mono truncate"
                      style={{ color: isGoal ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.55)', fontWeight: isGoal ? 600 : 400 }}>
                      {e.player ?? '—'}
                    </span>
                    {e.assist && (
                      <span className="text-[8px] font-mono truncate" style={{ color: 'rgba(var(--surface-tint-rgb),0.28)' }}>↗ {e.assist}</span>
                    )}
                    {teamAbbr && (
                      <span className="text-[8px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.22)' }}>{teamAbbr}</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center justify-center rounded-full shrink-0 self-center"
                style={{ width: 20, height: 20, background: bg, border: `0.5px solid ${fg}55` }}>
                <span className="text-[8px] font-mono font-bold" style={{ color: fg }}>{letter}</span>
              </div>
              <div className="flex flex-col min-w-0">
                {!home && (
                  <>
                    <span className="text-[11px] font-mono truncate"
                      style={{ color: isGoal ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.55)', fontWeight: isGoal ? 600 : 400 }}>
                      {e.player ?? '—'}
                    </span>
                    {e.assist && (
                      <span className="text-[8px] font-mono truncate" style={{ color: 'rgba(var(--surface-tint-rgb),0.28)' }}>↗ {e.assist}</span>
                    )}
                    {teamAbbr && (
                      <span className="text-[8px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.22)' }}>{teamAbbr}</span>
                    )}
                  </>
                )}
              </div>
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
    if (status === 'live' || status === 'finished') return (
      <Section id="match-stats" title={t('sport.title.match_stats')}>
        <p className="px-4 py-5 text-[12px] font-mono text-text-muted/35">{t('sport.stats_unavailable')}</p>
      </Section>
    )
    return null
  }
  const home = stats[0], away = stats[1]
  const STAT_LABELS: Record<string, string> = {
    ball_possession: t('stat.ball_possession'), shots_on_goal: t('stat.shots_on_goal'),
    total_shots: t('stat.total_shots'), blocked_shots: t('stat.blocked_shots'),
    shots_insidebox: t('stat.shots_insidebox'), shots_outsidebox: t('stat.shots_outsidebox'),
    corner_kicks: t('stat.corner_kicks'), offsides: t('stat.offsides'),
    fouls: t('stat.fouls'), yellow_cards: t('stat.yellow_cards'), red_cards: t('stat.red_cards'),
    goalkeeper_saves: t('stat.goalkeeper_saves'), total_passes: t('stat.total_passes'),
    passes_accurate: t('stat.passes_accurate'), passes: t('stat.passes'),
    expected_goals: t('stat.expected_goals'),
  }
  const parseVal = (v: string | number | null | undefined): number =>
    parseFloat(String(v ?? '0').replace('%', '')) || 0
  const rows = Object.keys(STAT_LABELS).map(key => {
    const hv = home.stats[key], av = away.stats[key]
    if (hv == null && av == null) return null
    return { key, label: STAT_LABELS[key], hRaw: hv, aRaw: av, hVal: parseVal(hv), aVal: parseVal(av) }
  }).filter(Boolean) as { key: string; label: string; hRaw: unknown; aRaw: unknown; hVal: number; aVal: number }[]
  if (!rows.length) return null

  const STAT_GROUPS: { labelRu: string; labelEn: string; keys: string[] }[] = [
    { labelRu: 'Атака',    labelEn: 'Attack',      keys: ['total_shots','shots_on_goal','shots_insidebox','shots_outsidebox','expected_goals'] },
    { labelRu: 'Защита',   labelEn: 'Defence',     keys: ['blocked_shots','goalkeeper_saves','offsides'] },
    { labelRu: 'Владение', labelEn: 'Possession',  keys: ['ball_possession','total_passes','passes_accurate','passes'] },
    { labelRu: 'Дисциплина', labelEn: 'Discipline', keys: ['fouls','yellow_cards','red_cards'] },
  ]

  const StatRow = ({ r }: { r: typeof rows[0] }) => {
    const total  = r.hVal + r.aVal || 1
    const hPct   = Math.round((r.hVal / total) * 100)
    const aPct   = 100 - hPct
    const hLeads = r.hVal >= r.aVal
    const isXg   = r.key === 'expected_goals'
    return (
      <div className="flex items-center gap-2 min-h-[38px]">
        <span className="text-[13px] font-mono w-10 text-right tabular-nums shrink-0"
          style={{ color: hLeads ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.3)', fontWeight: hLeads ? 500 : 400 }}>
          {String(r.hRaw ?? 0)}
        </span>
        <div className="flex flex-1 h-[3px] rounded-full overflow-hidden">
          <div style={{ width: `${hPct}%`, background: accent, borderRadius: '99px 0 0 99px', opacity: hLeads ? 1 : 0.4 }} />
          <div style={{ flex: 1, background: AWAY_BAR, borderRadius: '0 99px 99px 0' }} />
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.08em] w-28 text-center shrink-0"
          style={{ color: isXg ? '#D4A017' : 'rgba(var(--surface-tint-rgb),0.3)' }}>
          {r.label}
        </span>
        <div className="flex flex-1 h-[3px] rounded-full overflow-hidden flex-row-reverse">
          <div style={{ width: `${aPct}%`, background: AWAY_BAR, borderRadius: '99px 0 0 99px', opacity: !hLeads ? 1 : 0.4 }} />
          <div style={{ flex: 1, background: accent, opacity: 0.12, borderRadius: '0 99px 99px 0' }} />
        </div>
        <span className="text-[11px] font-mono w-10 tabular-nums shrink-0"
          style={{ color: !hLeads ? 'rgba(var(--surface-tint-rgb),0.6)' : 'rgba(var(--surface-tint-rgb),0.28)' }}>
          {String(r.aRaw ?? 0)}
        </span>
      </div>
    )
  }

  return (
    <Section id="match-stats" title={t('sport.title.match_stats')}>
      <div className="flex flex-col">
        {STAT_GROUPS.map(group => {
          const groupRows = rows.filter(r => group.keys.includes(r.key))
          if (!groupRows.length) return null
          return (
            <div key={group.labelRu}>
              <div className="px-3 pt-3 pb-1.5 border-b border-bg-border/30">
                <span className="text-[9px] font-mono uppercase tracking-[0.1em]" style={{ color: 'rgba(var(--surface-tint-rgb),0.28)' }}>
                  {lang === 'ru' ? group.labelRu : group.labelEn}
                </span>
              </div>
              <div className="px-3 py-1 flex flex-col">
                {groupRows.map(r => <StatRow key={r.key} r={r} />)}
              </div>
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
              <span className="text-[13px] font-semibold truncate hover:underline decoration-dotted underline-offset-2">{s.player_name}</span>
              {s.team_name && <span className="text-[10px] font-mono text-text-muted/40 truncate">{s.team_name}</span>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[15px] font-mono leading-none" style={{ color: accent, fontWeight: 500 }}>{s.goals}</span>
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

// ─── Detail skeleton ──────────────────────────────────────────────────────────
function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[90, 120, 80].map((h, i) => (
        <div key={i} className="rounded-xl border border-bg-border bg-bg-surface animate-pulse" style={{ height: h, animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export interface EventMeta { league: string; leagueId?: number | null; homeTeam: string; awayTeam: string }

export default function SportEventPage({ id: idProp, onBack, onLeagueLoad, initialFast }: {
  id?: string; onBack?: () => void; onLeagueLoad?: (meta: EventMeta) => void; initialFast?: EventFastCache
}) {
  const params = useParams<{ id: string }>()
  const id     = idProp ?? params?.id ?? ''
  const router = useRouter()
  const { profile } = useAuthContext()
  const _plan: SubscriptionPlan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const pageRef = useRef<HTMLDivElement>(null)
  const { lang } = useLang()
  const t = useT(lang)

  // SSR seed
  if (initialFast && id && !getCached<EventFastCache>(`event_fast:${id}`)) {
    setCached(`event_fast:${id}`, initialFast)
  }
  const _fc = id ? getCached<EventFastCache>(`event_fast:${id}`) : null
  const _dc = id ? getCached<EventDetailsCache>(`event_details:${id}`) : null

  const [event,       setEvent]       = useState<SportEvent | null>(_fc?.event ?? null)
  const [loading,     setLoading]     = useState(!_fc)
  const [form,        setForm]        = useState<{ home_form: FormEntry[] | null; away_form: FormEntry[] | null } | null>(_fc?.form ?? null)
  const [prediction,  setPrediction]  = useState<SportPrediction | null | undefined>(_fc?.prediction)
  const [standings,   setStandings]   = useState<SportStanding[]>(_dc?.standings ?? [])
  const [homeInj,     setHomeInj]     = useState<SportInjury[]>(_dc?.homeInj ?? [])
  const [awayInj,     setAwayInj]     = useState<SportInjury[]>(_dc?.awayInj ?? [])
  const [lineups,     setLineups]     = useState<SportLineup[]>(_dc?.lineups ?? [])
  const [matchStats,  setMatchStats]  = useState<SportFixtureStat[]>(_dc?.matchStats ?? [])
  const [matchEvents, setMatchEvents] = useState<SportMatchEvent[]>(_dc?.matchEvents ?? [])
  const [topScorers,  setTopScorers]  = useState<SportTopScorer[]>(_dc?.topScorers ?? [])
  const [dataError,   setDataError]   = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(!_dc)

  const [activeMainTab,      setActiveMainTab]      = useState<MainTab>('overview')
  const [activeBettingMarket, setActiveBettingMarket] = useState<string>('h2h')

  // ── Fast load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    if (!getCached<EventFastCache>(`event_fast:${id}`)) setLoading(true)
    sportApi.getEventFull(id)
      .then(({ event: ev, form: f, prediction: p }) => {
        setEvent(ev); setForm(f); setPrediction(p)
        setCached(`event_fast:${id}`, { event: ev, form: f, prediction: p })
        if (ev.league && onLeagueLoad) onLeagueLoad({ league: ev.league, leagueId: ev.raw_data?.league_id as number | null | undefined, homeTeam: ev.home_team, awayTeam: ev.away_team })
      })
      .catch(() => setDataError(true))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cache hit: fire onLeagueLoad once ────────────────────────────────────────
  useEffect(() => {
    if (_fc?.event && onLeagueLoad) {
      const ev = _fc.event
      onLeagueLoad({ league: ev.league ?? '', leagueId: ev.raw_data?.league_id as number | null | undefined, homeTeam: ev.home_team, awayTeam: ev.away_team })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Heavy load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    if (!getCached<EventDetailsCache>(`event_details:${id}`)) setDetailsLoading(true)
    sportApi.getEventDetails(id)
      .then(({ standings: s, topScorers: ts, homeInjuries: hi, awayInjuries: ai, lineups: l, stats: st, matchEvents: me }) => {
        setStandings(s); setTopScorers(ts); setHomeInj(hi); setAwayInj(ai)
        setLineups(l); setMatchStats(st); setMatchEvents(me)
        setCached(`event_details:${id}`, { standings: s, topScorers: ts, homeInj: hi, awayInj: ai, lineups: l, matchStats: st, matchEvents: me })
      })
      .catch(() => {})
      .finally(() => setDetailsLoading(false))
  }, [id])

  // ── WebSocket ────────────────────────────────────────────────────────────────
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
        const idx  = odds.findIndex(o => o.bookmaker === incoming.bookmaker && o.market_type === incoming.market_type)
        if (idx === -1) return { ...prev, sport_odds: [...odds, incoming] }
        const updated = [...odds]; updated[idx] = incoming
        return { ...prev, sport_odds: updated }
      })
    }, []),
  })

  const sub    = event?.subcategory ?? 'football'
  const accent = SPORT_ACCENT[sub] ?? '#D4A017'

  const raw           = event?.raw_data as Record<string, unknown> | null | undefined
  const fixtureId     = raw?.fixture_id   as number | null | undefined
  const homeTeamId    = raw?.home_team_id as number | null | undefined
  const awayTeamId    = raw?.away_team_id as number | null | undefined
  const leagueId      = raw?.league_id    as number | null | undefined
  const elapsedAnchor = raw?.elapsed      as number | null | undefined
  const statusShort   = raw?.status_short as string | null | undefined
  const homeLogo      = raw?.home_logo    as string | null | undefined
  const awayLogo      = raw?.away_logo    as string | null | undefined
  const leagueLogo    = raw?.league_logo  as string | null | undefined
  const isBasicCard   = !fixtureId

  const isLive     = event?.status === 'live'
  const isFinished = event?.status === 'finished'
  const hasScore   = event?.home_score != null && event?.away_score != null
  const elapsed    = useLiveElapsed(elapsedAnchor, event?.status, statusShort)

  const availableBettingMarkets = (['h2h', 'totals', 'spreads', 'btts'] as const)
    .filter(m => event?.sport_odds?.some(o => o.market_type === m))

  useEffect(() => {
    if (availableBettingMarkets.length && !availableBettingMarkets.includes(activeBettingMarket as 'h2h' | 'totals' | 'spreads' | 'btts')) {
      setActiveBettingMarket(availableBettingMarkets[0])
    }
  }, [availableBettingMarkets.join('')]) // eslint-disable-line

  const cmp = prediction?.comparison
  const compareRows = cmp ? [
    { label: t('sport.compare.form'),     home: pct(cmp.form?.home),   away: pct(cmp.form?.away)  },
    { label: t('sport.compare.attack'),   home: pct(cmp.att?.home),    away: pct(cmp.att?.away)   },
    { label: t('sport.compare.defense'),  home: pct(cmp.def?.home),    away: pct(cmp.def?.away)   },
    { label: 'H2H',                        home: pct(cmp.h2h?.home),    away: pct(cmp.h2h?.away)   },
    { label: t('sport.compare.goals'),    home: pct(cmp.goals?.home),  away: pct(cmp.goals?.away) },
    { label: t('sport.compare.conceded'), home: 100 - pct(cmp.def?.home), away: 100 - pct(cmp.def?.away) },
  ].filter(r => r.home + r.away > 0) : []

  const leagueName = event?.league ?? t('sport.league_default')
  const bkCount    = new Set((event?.sport_odds ?? []).map(o => o.bookmaker)).size

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (loading && !event) return (
    <div className="flex flex-col gap-4 animate-pulse pt-3">
      <div className="h-3 w-40 bg-bg-elevated rounded" />
      <div className="bg-bg-surface border border-bg-border rounded-xl h-20" />
      <div className="bg-bg-surface border border-bg-border rounded-xl h-10" />
      <div className="bg-bg-surface border border-bg-border rounded-xl h-64" />
    </div>
  )

  if (!event) return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="text-base font-mono text-text-muted mb-4">{t('sport.not_found')}</p>
      <button onClick={() => onBack ? onBack() : router.back()} className="text-sm font-mono" style={{ color: accent }}>
        ← {t('sport.back')}
      </button>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div ref={pageRef} className="flex flex-col pb-8">

      {/* Back button — scrolls with content, only in standalone mode */}
      {!onBack && (
        <button onClick={() => { if (leagueId) router.push(`/sport/${sub}/league/${leagueId}`); else router.push(`/sport/${sub}`) }}
          className="flex items-center gap-1.5 text-[13px] font-mono text-text-muted/60 hover:text-text-secondary transition-colors self-start pt-3 pb-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {leagueName} · {t('sport.all_matches')}
        </button>
      )}

      {/* ── STICKY HERO + TABS ─────────────────────────────────────────────── */}
      <div className="-mx-3 sm:-mx-4 md:-mx-6" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
        <MatchHero
          event={event}
          elapsed={elapsed}
          homeLogo={homeLogo}
          awayLogo={awayLogo}
          leagueLogo={leagueLogo}
          isLive={isLive}
          isFinished={isFinished}
          hasScore={hasScore}
          accent={accent}
          lang={lang}
          raw={raw}
          matchStats={matchStats}
          homeForm={form?.home_form ?? null}
        />
        <MatchTabBar active={activeMainTab} onChange={setActiveMainTab} accent={accent} lang={lang} />
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────────────────── */}
      <div className="mt-4">

        {/* ── ОБЗОР ──────────────────────────────────────────────────────── */}
        {activeMainTab === 'overview' && (
          <div className="flex flex-col gap-4">
            {isBasicCard && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-bg-border bg-bg-surface">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-[12px] font-mono text-text-muted/50 leading-relaxed">{t('sport.basic_card')}</p>
              </div>
            )}

            {sub !== 'football' && (
              <AiInsightCard pred={prediction} odds={event.sport_odds ?? []} accent={accent} />
            )}

            {prediction === null && fixtureId && sub !== 'football' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-bg-border bg-bg-surface text-[11px] font-mono text-text-muted/45">
                <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                {t('sport.forecast_updating')}
              </div>
            )}

            {sub === 'football' ? (
              <div className="flex flex-col gap-4">
                <MatchEventsSection events={matchEvents} homeTeamId={homeTeamId} accent={accent} status={event.status} homeName={event.home_team} awayName={event.away_team} />
                {matchStats.length >= 2 && (
                  <MiniStatsBlock stats={matchStats} accent={accent} onMore={() => setActiveMainTab('stats')} homeName={event.home_team} awayName={event.away_team} />
                )}
                {(event.sport_odds?.length ?? 0) > 0 && (
                  <OddsOverviewBlock odds={event.sport_odds!} accent={accent} sport={sub} onMore={() => setActiveMainTab('betting')} homeName={event.home_team} awayName={event.away_team} isLive={isLive} />
                )}
                {(form?.home_form || form?.away_form) && (
                  <FormBlock
                    home_form={form?.home_form ?? null}
                    away_form={form?.away_form ?? null}
                    homeName={event.home_team}
                    awayName={event.away_team}
                  />
                )}
                <AiInsightCard pred={prediction} odds={event.sport_odds ?? []} accent={accent} />
                {prediction === null && fixtureId && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-bg-border bg-bg-surface text-[11px] font-mono text-text-muted/45">
                    <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                    {t('sport.forecast_updating')}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                  <MatchEventsSection events={matchEvents} homeTeamId={homeTeamId} accent={accent} status={event.status} homeName={event.home_team} awayName={event.away_team} />
                  {(form?.home_form || form?.away_form) && (
                    <FormBlock
                      home_form={form?.home_form ?? null}
                      away_form={form?.away_form ?? null}
                      homeName={event.home_team}
                      awayName={event.away_team}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {matchStats.length >= 2 && (
                    <MiniStatsBlock stats={matchStats} accent={accent} onMore={() => setActiveMainTab('stats')} homeName={event.home_team} awayName={event.away_team} />
                  )}
                  {(event.sport_odds?.length ?? 0) > 0 && (
                    <OddsOverviewBlock odds={event.sport_odds!} accent={accent} sport={sub} onMore={() => setActiveMainTab('betting')} homeName={event.home_team} awayName={event.away_team} isLive={isLive} />
                  )}
                </div>
              </div>
            )}

            {dataError && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-[12px] font-mono text-red-400/70">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {t('sport.data_error')}
              </div>
            )}
          </div>
        )}

        {/* ── СТАТИСТИКА ─────────────────────────────────────────────────── */}
        {activeMainTab === 'stats' && (
          <div className="flex flex-col gap-4">
            <MatchStatsSection stats={matchStats} accent={accent} status={event.status} />

            {compareRows.length > 0 && (
              <div id="compare" className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-bg-border">
                  <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-text-secondary">{t('sport.title.compare')}</span>
                </div>
                <div className="px-5 py-4">
                  <div className="flex justify-between text-[12px] font-mono font-bold mb-1">
                    <span style={{ color: accent }}>{event.home_team}</span>
                    <span className="text-text-primary">{event.away_team}</span>
                  </div>
                  {compareRows.map(r => (
                    <CompareBar key={r.label} label={r.label} homeVal={r.home} awayVal={r.away} accent={accent} />
                  ))}
                </div>
              </div>
            )}

            {prediction?.h2h && (
              <H2HSection h2h={prediction.h2h} homeId={homeTeamId ?? null} awayId={awayTeamId ?? null}
                homeName={event.home_team} awayName={event.away_team} accent={accent} />
            )}

            {standings.length > 0 && (
              <HomeAwaySplit standings={standings} homeId={homeTeamId} awayId={awayTeamId}
                homeName={event.home_team} awayName={event.away_team} accent={accent} />
            )}

            {detailsLoading && !matchStats.length && !standings.length && <DetailsSkeleton />}
          </div>
        )}

        {/* ── СОСТАВЫ ────────────────────────────────────────────────────── */}
        {activeMainTab === 'lineups' && (
          <div className="flex flex-col gap-4">
            <LineupsSection lineups={lineups} accent={accent} status={event.status} sub={sub} />
            <InjuriesSection homeInjuries={homeInj} awayInjuries={awayInj}
              homeTeam={event.home_team} awayTeam={event.away_team} />
            {detailsLoading && !lineups.length && <DetailsSkeleton />}
          </div>
        )}

        {/* ── БЕТТИНГ ────────────────────────────────────────────────────── */}
        {activeMainTab === 'betting' && (
          <div className="flex flex-col gap-4">
            {availableBettingMarkets.length > 0 ? (
              availableBettingMarkets.map(tab => (
                <Section key={tab} title={MARKET_TAB_KEYS[tab] ? t(MARKET_TAB_KEYS[tab]) : tab}
                  action={bkCount > 0 ? (
                    <span className="text-[10px] font-mono text-text-muted/35">{bkCount} {t('sport.market.sources')}</span>
                  ) : undefined}>
                  <MarketTable odds={event.sport_odds!} tab={tab} accent={accent} />
                </Section>
              ))
            ) : (
              <div className="flex flex-col items-center py-16">
                <p className="text-[13px] font-mono text-text-muted/40">{t('sport.market.no_odds')}</p>
              </div>
            )}

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
        )}

        {/* ── ТАБЛИЦА ────────────────────────────────────────────────────── */}
        {activeMainTab === 'table' && (
          <div className="flex flex-col gap-4">
            {standings.length > 0 ? (
              <>
                <StandingsSection standings={standings} homeId={homeTeamId ?? null} awayId={awayTeamId ?? null}
                  leagueName={leagueName} accent={accent} />
                <TopScorersSection scorers={topScorers} accent={accent} sub={sub} />
              </>
            ) : detailsLoading ? (
              <DetailsSkeleton />
            ) : (
              <div className="flex flex-col items-center py-16">
                <p className="text-[13px] font-mono text-text-muted/40">{t('common.no_data')}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
