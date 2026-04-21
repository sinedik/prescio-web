'use client'
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { getCached, setCached } from '../lib/clientCache'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSportWs } from '../hooks/useSportWs'
import { useLiveElapsed } from '../hooks/useLiveElapsed'
import { sportApi } from '../lib/api'
import { syncSportDateAction } from '../actions/sport'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { SportEvent, SportOdds, SubscriptionPlan } from '../types/index'
import { useAuthContext } from '../contexts/AuthContext'
import type { EventMeta, EventFastCache } from './SportEventPage'
import type { SidebarLeague } from '../contexts/LiveLayoutContext'

const SportEventPage = dynamic(() => import('./SportEventPage'), {
  loading: () => (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-32 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-64 rounded-lg bg-bg-surface border border-bg-border" />
    </div>
  ),
})

import { mix } from '../components/disciplines'
import { useLiveLayout } from '../contexts/LiveLayoutContext'
import { useLang } from '../contexts/LanguageContext'
import { t as tFn, useT } from '../lib/i18n'
import type { Lang } from '../lib/i18n'
import PrescioLoader from '../components/PrescioLoader'
import { Pagination } from '../components/live/Pagination'
import { GroupDivider } from '../components/live/GroupDivider'
import { ActiveFilterBanner } from '../components/live/ActiveFilterBanner'
import { scrollLiveContentToTop } from '../components/live/scrollLiveContent'
import { useLoaderMinHold } from '../components/live/useLoaderMinHold'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Sport = 'football' | 'basketball' | 'tennis' | 'mma'

// 'live' | 'YYYY-MM-DD'
type SelectedDate = 'live' | string

const SPORT_ACCENT: Record<Sport, string> = {
  football:   'var(--sport-football)',
  basketball: 'var(--sport-basketball)',
  tennis:     'var(--sport-tennis)',
  mma:        'var(--sport-mma)',
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function eventLocalDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns today + N days ahead as 'YYYY-MM-DD' strings */
function buildDateRange(days = 7): string[] {
  const result: string[] = []
  const base = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    result.push(toLocalDateStr(d))
  }
  return result
}

function formatDateLabel(dateStr: string, lang: Lang): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T12:00:00')
  const today = toLocalDateStr(new Date())
  const tomorrow = toLocalDateStr(new Date(Date.now() + 86_400_000))
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  if (dateStr === today)    return { weekday: tFn('sport.today', lang), day: '', month: '' }
  if (dateStr === tomorrow) return { weekday: tFn('sport.tomorrow', lang), day: '', month: '' }
  return {
    weekday: d.toLocaleDateString(locale, { weekday: 'short' }),
    day:     String(d.getDate()),
    month:   d.toLocaleDateString(locale, { month: 'short' }),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (name ?? '--').slice(0, 2).toUpperCase()
}

function formatTime(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  if (diff > 0 && diff < 60 * 60_000) return `${Math.round(diff / 60000)}${lang === 'ru' ? 'м' : 'min'}`
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

// ─── Odds extraction ──────────────────────────────────────────────────────────
interface Odds3Way { home: number; draw: number | null; away: number }

function extractOdds(odds?: SportOdds[], sport?: Sport): Odds3Way | null {
  const h2h = odds?.find(o => o.market_type === 'h2h')
  if (!h2h || h2h.outcomes.length < 2) return null

  const homeOut = h2h.outcomes.find(o => { const n = o.name.toLowerCase(); return n === 'home' || n === '1' })
  const awayOut = h2h.outcomes.find(o => { const n = o.name.toLowerCase(); return n === 'away' || n === '2' })
  const drawOut = h2h.outcomes.find(o => { const n = o.name.toLowerCase(); return n === 'draw' || n === 'x' })
  const nonDraw = h2h.outcomes.filter(o => { const n = o.name.toLowerCase(); return n !== 'draw' && n !== 'x' })

  const home = homeOut ?? nonDraw[0]
  const away = awayOut ?? nonDraw[1]
  if (!home || !away) return null

  const rawHome = 100 / home.price
  const rawAway = 100 / away.price
  const rawDraw = drawOut && sport === 'football' ? 100 / drawOut.price : null
  const sum = rawHome + rawAway + (rawDraw ?? 0)

  return {
    home: Math.round((rawHome / sum) * 100),
    draw: rawDraw != null ? Math.round((rawDraw / sum) * 100) : null,
    away: Math.round((rawAway / sum) * 100),
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const EVENTS_PER_PAGE = 30
type LeagueGroup = { league: string; logo?: string | null; flag?: string | null; events: SportEvent[] }

function paginateGroups(groups: LeagueGroup[]): LeagueGroup[][] {
  const pages: LeagueGroup[][] = []
  let page: LeagueGroup[] = [], count = 0
  for (const g of groups) {
    if (count + g.events.length > EVENTS_PER_PAGE && page.length > 0) {
      pages.push(page); page = [g]; count = g.events.length
    } else {
      page.push(g); count += g.events.length
    }
  }
  if (page.length > 0) pages.push(page)
  return pages
}

// ─── Date strip ───────────────────────────────────────────────────────────────
function DateStrip({ dates, selected, onSelect, countByDate, liveCount, accent, syncingDate, lang }: {
  dates: string[]
  selected: SelectedDate
  onSelect: (d: SelectedDate) => void
  countByDate: Map<string, number>
  liveCount: number
  accent: string
  syncingDate?: string | null
  lang: Lang
}) {
  return (
    <div className="relative -mx-3 sm:-mx-4 md:-mx-6">
      <div className="flex overflow-x-auto gap-1.5 px-3 sm:px-4 md:px-6 pb-2 pt-1 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}>

        {/* Live tab */}
        <button
          onClick={() => onSelect('live')}
          className="flex flex-col items-center px-3 py-2 rounded-lg border shrink-0 transition-all min-w-[52px]"
          style={selected === 'live'
            ? { borderColor: 'rgba(255,50,50,0.5)', background: 'rgba(255,50,50,0.1)', color: '#ff5252' }
            : { borderColor: 'rgba(var(--surface-tint-rgb), 0.07)', background: 'rgba(var(--surface-tint-rgb), 0.03)', color: liveCount > 0 ? '#ff5252' : 'rgb(var(--text-muted))' }
          }
        >
          <div className="flex items-center gap-1">
            {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            <span className="text-[11px] font-mono font-bold">Live</span>
          </div>
          <span className="text-[10px] font-mono mt-0.5" style={{ color: selected === 'live' ? '#ff5252' : liveCount > 0 ? 'rgba(255,82,82,0.6)' : 'rgba(var(--text-muted),0.5)' }}>
            {liveCount > 0 ? liveCount : '—'}
          </span>
        </button>

        {/* Date tabs */}
        {dates.map(dateStr => {
          const { weekday, day, month } = formatDateLabel(dateStr, lang)
          const count = countByDate.get(dateStr) ?? 0
          const isSelected = selected === dateStr
          const AMBER = '#D4A017'
          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className="flex flex-col items-center px-3 py-2 rounded-lg border shrink-0 transition-all min-w-[52px]"
              style={isSelected
                ? { borderColor: 'rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.08)', color: AMBER }
                : { borderColor: 'rgba(var(--surface-tint-rgb), 0.1)', background: 'transparent', color: count > 0 ? 'rgba(var(--surface-tint-rgb),0.5)' : 'rgba(var(--surface-tint-rgb),0.22)' }
              }
            >
              <span className="text-[11px] font-mono font-medium capitalize leading-tight">
                {weekday}
              </span>
              {day && (
                <span className="text-[9px] font-mono mt-0.5 leading-none opacity-70">
                  {day} {month}
                </span>
              )}
              <span className="text-[10px] font-mono mt-0.5"
                style={{ color: isSelected ? AMBER : count > 0 ? 'rgba(var(--surface-tint-rgb),0.4)' : 'rgba(var(--surface-tint-rgb),0.18)' }}>
                {syncingDate === dateStr
                  ? <svg className="w-2.5 h-2.5 animate-spin inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  : count > 0 ? count : '—'
                }
              </span>
            </button>
          )
        })}
      </div>
      {/* right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10"
        style={{ background: 'linear-gradient(to right, transparent, rgba(var(--bg-base-rgb), 0.9))' }} />
    </div>
  )
}

// ─── League grouping ──────────────────────────────────────────────────────────
function sortEventsInGroup(events: SportEvent[]): SportEvent[] {
  const live     = events.filter(e => e.status === 'live')
    .sort((a, b) => {
      const ea = (a.raw_data as Record<string, unknown> | null)?.elapsed as number ?? 0
      const eb = (b.raw_data as Record<string, unknown> | null)?.elapsed as number ?? 0
      return eb - ea
    })
  const upcoming = events.filter(e => e.status !== 'live' && e.status !== 'finished')
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const finished = events.filter(e => e.status === 'finished')
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  return [...live, ...upcoming, ...finished]
}

function groupByLeague(events: SportEvent[]): LeagueGroup[] {
  const map = new Map<string, { events: SportEvent[]; logo?: string | null; flag?: string | null }>()
  for (const e of events) {
    const key = e.league || e.subcategory || 'Unknown'
    if (!map.has(key)) {
      const raw = e.raw_data as Record<string, unknown> | null
      map.set(key, {
        events: [],
        logo:   raw?.league_logo as string | null | undefined,
        flag:   raw?.league_flag as string | null | undefined,
      })
    }
    map.get(key)!.events.push(e)
  }
  return Array.from(map.entries())
    .map(([league, { events, logo, flag }]) => ({ league, logo, flag, events: sortEventsInGroup(events) }))
    .sort((a, b) => {
      const aLive = a.events.some(e => e.status === 'live')
      const bLive = b.events.some(e => e.status === 'live')
      if (aLive && !bLive) return -1
      if (!aLive && bLive) return 1
      const aMin = Math.min(...a.events.map(e => new Date(e.starts_at).getTime()))
      const bMin = Math.min(...b.events.map(e => new Date(e.starts_at).getTime()))
      return aMin - bMin
    })
}

// ─── Team logo ────────────────────────────────────────────────────────────────
function TeamLogo({ logo, abbr: abbrStr, size, accent }: { logo?: string | null; abbr: string; size: number; accent: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <div className="shrink-0 flex items-center justify-center rounded overflow-hidden border border-bg-border"
      style={{ width: size, height: size, background: mix(accent, 3) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" loading="lazy" onError={() => setErr(true)} style={{ width: size * 0.8, height: size * 0.8, objectFit: 'contain' }} />
    </div>
  )
  return (
    <div className="shrink-0 flex items-center justify-center rounded text-[8px] font-bold bg-bg-elevated border border-bg-border text-text-muted"
      style={{ width: size, height: size }}>
      {abbrStr}
    </div>
  )
}

// ─── Odds pills ───────────────────────────────────────────────────────────────
const SUCCESS = '#22c55e'
function OddsPills({ odds, sport }: { odds: Odds3Way; sport: Sport }) {
  const showDraw = sport === 'football' && odds.draw != null
  const max = Math.max(odds.home, odds.away, odds.draw ?? 0)

  const Pill = ({ label, value }: { label: string; value: number }) => {
    const isFav = value === max
    return (
      <div className="flex flex-col items-center text-center"
        style={{
          minWidth: 34,
          padding: '3px 6px',
          borderRadius: 3,
          border: isFav ? `1px solid ${SUCCESS}55` : '0.5px solid rgba(var(--surface-tint-rgb),0.1)',
          background: isFav ? `${SUCCESS}08` : 'rgba(var(--surface-tint-rgb),0.03)',
        }}>
        <span className="text-[7px] font-mono uppercase tracking-wide leading-none mb-0.5"
          style={{ color: isFav ? SUCCESS : 'rgba(var(--surface-tint-rgb),0.3)' }}>
          {label}
        </span>
        <span className="text-[10px] font-mono leading-none tabular-nums"
          style={{ color: isFav ? SUCCESS : 'rgba(var(--surface-tint-rgb),0.55)' }}>
          {value}%
        </span>
      </div>
    )
  }

  return (
    <div className="hidden sm:flex gap-0.5 items-stretch">
      <Pill label="1" value={odds.home} />
      {showDraw && <Pill label="X" value={odds.draw!} />}
      <Pill label="2" value={odds.away} />
    </div>
  )
}

// ─── Match Row ────────────────────────────────────────────────────────────────
const SportRow = memo(function SportRow({ event, sport, accent }: {
  event: SportEvent; sport: Sport; accent: string
}) {
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()
  const { lang } = useLang()
  const t = useT(lang)
  const isLive     = event.status === 'live'
  const isFinished = event.status === 'finished'
  const hasScore   = event.home_score != null && event.away_score != null
  const elapsedAnchor = (event.raw_data as Record<string, unknown> | null)?.elapsed as number | null | undefined
  const statusShort   = (event.raw_data as Record<string, unknown> | null)?.status_short as string | null | undefined
  const elapsed    = useLiveElapsed(elapsedAnchor, event.status, statusShort)
  const odds       = extractOdds(event.sport_odds, sport)
  const raw        = event.raw_data as Record<string, unknown> | null
  const homeLogo   = raw?.home_logo as string | null | undefined
  const awayLogo   = raw?.away_logo as string | null | undefined
  const homeLeads  = (event.home_score ?? 0) > (event.away_score ?? 0)
  const awayLeads  = (event.away_score ?? 0) > (event.home_score ?? 0)

  const href = `/sport/${sport}/${event.id}`

  // Per-state team name color
  const homeNameStyle: React.CSSProperties = isFinished
    ? homeLeads
      ? { color: 'rgb(var(--text-primary))', fontWeight: 500 }
      : { color: 'rgba(var(--surface-tint-rgb),0.32)', fontWeight: 400 }
    : isLive
      ? { color: 'rgb(var(--text-primary))', fontWeight: 400 }
      : { color: 'rgb(var(--text-secondary))', fontWeight: 400 }

  const awayNameStyle: React.CSSProperties = isFinished
    ? awayLeads
      ? { color: 'rgb(var(--text-primary))', fontWeight: 500 }
      : { color: 'rgba(var(--surface-tint-rgb),0.32)', fontWeight: 400 }
    : isLive
      ? { color: 'rgb(var(--text-primary))', fontWeight: 400 }
      : { color: 'rgb(var(--text-secondary))', fontWeight: 400 }

  return (
    <div style={{
      opacity: isFinished ? 0.55 : 1,
      borderLeft: isLive ? '2px solid #ff5252' : '2px solid transparent',
      borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.07)',
    }}>
      <Link
        href={href}
        prefetch={false}
        onMouseEnter={() => router.prefetch(href)}
        className="grid items-center gap-2 transition-colors hover:bg-text-primary/[0.015]"
        style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 28px auto 20px',
          padding: '10px 14px',
          background: isLive ? 'rgba(255,50,50,0.025)' : undefined,
        }}
      >
        {/* Zone 1: Status / Time */}
        <div className="flex flex-col items-center justify-center gap-0.5 shrink-0">
          {isLive ? (
            <>
              <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: '#ff5252' }}>LIVE</span>
              {elapsed != null && (
                <div className="flex items-center gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-mono leading-none" style={{ color: '#D4A017' }}>{elapsed}&apos;</span>
                </div>
              )}
            </>
          ) : isFinished ? (
            <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-center"
              style={{ color: 'rgba(var(--surface-tint-rgb),0.3)' }}>
              {t('sport.ft_abbr')}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-center leading-tight"
              style={{ color: 'rgb(var(--text-secondary))' }}>
              {formatTime(event.starts_at, lang)}
            </span>
          )}
        </div>

        {/* Zone 2: Teams */}
        <div className="flex flex-col gap-[5px] min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamLogo logo={homeLogo} abbr={abbr(event.home_team)} size={14} accent={accent} />
            <span className="text-[12px] truncate leading-tight" style={homeNameStyle}>{event.home_team}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamLogo logo={awayLogo} abbr={abbr(event.away_team)} size={14} accent={accent} />
            <span className="text-[12px] truncate leading-tight" style={awayNameStyle}>{event.away_team}</span>
          </div>
        </div>

        {/* Zone 3: Score */}
        <div className="flex flex-col items-center justify-center gap-[5px] shrink-0">
          {hasScore ? (
            <>
              <span className="text-[13px] font-mono leading-none tabular-nums"
                style={isLive
                  ? { color: '#ff5252', fontWeight: 500 }
                  : isFinished
                    ? { color: homeLeads ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.28)', fontWeight: homeLeads ? 500 : 400 }
                    : { color: 'rgba(var(--surface-tint-rgb),0.3)', fontWeight: 400 }
                }>
                {event.home_score}
              </span>
              <span className="text-[13px] font-mono leading-none tabular-nums"
                style={isLive
                  ? { color: '#ff5252', fontWeight: 500 }
                  : isFinished
                    ? { color: awayLeads ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.28)', fontWeight: awayLeads ? 500 : 400 }
                    : { color: 'rgba(var(--surface-tint-rgb),0.3)', fontWeight: 400 }
                }>
                {event.away_score}
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-mono leading-none" style={{ color: 'rgba(var(--surface-tint-rgb),0.22)' }}>—</span>
              <span className="text-[11px] font-mono leading-none" style={{ color: 'rgba(var(--surface-tint-rgb),0.22)' }}>—</span>
            </>
          )}
        </div>

        {/* Zone 4: Odds pills (hidden for finished) */}
        <div className="flex items-center shrink-0" onClick={e => e.preventDefault()}>
          {!isFinished && odds && <OddsPills odds={odds} sport={sport} />}
        </div>

        {/* Zone 5: Expand arrow */}
        <button
          className="flex items-center justify-center shrink-0 h-full"
          onClick={e => { e.preventDefault(); setExpanded(v => !v) }}
          style={{ color: 'rgba(var(--surface-tint-rgb),0.22)' }}
        >
          <span className="text-[16px] leading-none" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>›</span>
        </button>
      </Link>

      {expanded && (
        <div className="px-[14px] py-3 border-t border-bg-border/30 bg-bg-elevated/20">
          <MatchDetail event={event} sport={sport} accent={accent} />
        </div>
      )}
    </div>
  )
})

// ─── Match detail (expanded) ──────────────────────────────────────────────────
function MatchDetail({ event, sport, accent }: { event: SportEvent; sport: Sport; accent: string }) {
  const { lang } = useLang()
  const t = useT(lang)
  const allOdds = event.sport_odds ?? []
  if (allOdds.length === 0) return (
    <div className="flex items-center justify-center py-3">
      <span className="text-[10px] font-mono text-text-muted/40">{t('sport.odds_unavailable')}</span>
    </div>
  )

  const MARKET_LABELS: Record<string, string> = {
    h2h: sport === 'football' ? '1X2' : t('sport.winner'),
    spreads: t('sport.market.spreads'), totals: t('sport.market.totals'), btts: t('sport.market.btts'),
  }

  const byMarket = new Map<string, SportOdds[]>()
  for (const o of allOdds) {
    if (!byMarket.has(o.market_type)) byMarket.set(o.market_type, [])
    byMarket.get(o.market_type)!.push(o)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted">
        {event.league && <span>{event.league}</span>}
        {(event.raw_data as Record<string, unknown> | null)?.season != null && (
          <><span className="text-text-muted/35">·</span>
          <span>{t('sport.season_label')} {String((event.raw_data as Record<string, unknown>).season)}</span></>
        )}
        <span className="text-text-muted/35">·</span>
        <span>{new Date(event.starts_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="flex flex-col gap-2">
        {Array.from(byMarket.entries()).map(([marketType, marketOdds]) => {
          const bestByName = new Map<string, { price: number; bookmaker: string }>()
          for (const book of marketOdds)
            for (const outcome of book.outcomes) {
              const existing = bestByName.get(outcome.name)
              if (!existing || outcome.price > existing.price)
                bestByName.set(outcome.name, { price: outcome.price, bookmaker: book.bookmaker })
            }
          return (
            <div key={marketType}>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[8px] font-mono font-bold tracking-[0.1em] uppercase text-text-muted">
                  {MARKET_LABELS[marketType] ?? marketType}
                </p>
                <span className="text-[8px] font-mono text-text-muted">{marketOdds.length} {t('sport.bk_abbr')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(bestByName.entries()).map(([name, { price, bookmaker }]) => (
                  <div key={name} className="flex flex-col items-center px-2.5 py-1.5 rounded border min-w-[56px]"
                    style={{ borderColor: 'rgba(var(--surface-tint-rgb),0.08)', background: 'rgba(var(--surface-tint-rgb),0.03)' }}>
                    <span className="text-[9px] font-mono text-text-muted truncate max-w-[80px] text-center leading-tight mb-0.5">{name}</span>
                    <span className="text-[14px] font-mono font-bold leading-none" style={{ color: accent }}>{price.toFixed(2)}</span>
                    <span className="text-[7px] font-mono text-text-muted/40 mt-0.5 truncate max-w-[64px] text-center">{bookmaker}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function SportScreen({ initialSport, eventId, initialEvents, initialEventFull }: { initialSport?: Sport; eventId?: string; initialEvents?: SportEvent[]; initialEventFull?: unknown } = {}) {
  usePageTitle('Sport')
  const router = useRouter()
  const { profile } = useAuthContext()
  const { lang } = useLang()
  const t = useT(lang)
  const _plan = (profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')) as SubscriptionPlan

  const sport  = initialSport ?? 'football'
  const accent = SPORT_ACCENT[sport]

  // Date strip: 30 days from today
  const dateRange = useMemo(() => buildDateRange(30), [])
  const today     = useMemo(() => toLocalDateStr(new Date()), [])

  const [selectedDate, setSelectedDate] = useState<SelectedDate>(() => getCached<SelectedDate>(`sport_date:${sport}`) ?? today)
  const [currentPage, setCurrentPage]   = useState(1)
  const [matchLeague, setMatchLeague]     = useState('')
  const [matchLeagueId, setMatchLeagueId] = useState<number | null>(null)
  const [matchHome, setMatchHome]         = useState('')
  const [matchAway, setMatchAway]         = useState('')
  const [syncingDate, setSyncingDate]   = useState<string | null>(null)
  const [syncVersion, setSyncVersion]   = useState(0)

  const { selectedLeague, setSelectedLeague, setLeagues, setLiveCount, setTotalCount, setTodayCount } = useLiveLayout()

  // Fetch 30-day window from server (today → +30 days), plus live events
  const fetchParams = useMemo(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 30)
    to.setHours(23, 59, 59, 999)
    return {
      subcategory:   sport,
      limit:         100,
      starts_after:  from.toISOString(),
      starts_before: to.toISOString(),
    }
  }, [sport])

  const [events, setEvents]       = useState<SportEvent[]>(() => {
    const cached = getCached<SportEvent[]>(`sport_events:${sport}`)
    if (cached) return cached
    if (initialEvents && initialEvents.length) {
      setCached(`sport_events:${sport}`, initialEvents)
      return initialEvents
    }
    return []
  })
  const [loading, setLoading]     = useState(() => !getCached<SportEvent[]>(`sport_events:${sport}`) && !(initialEvents && initialEvents.length))
  const [isRefreshing] = useState(false)

  // Initial fetch + refetch on sport/syncVersion change
  useEffect(() => {
    const key = `sport_events:${sport}`
    const cached = getCached<SportEvent[]>(key)
    // Don't clear SSR-provided events — only show skeleton when we have nothing at all
    if (!cached && !(initialEvents && initialEvents.length)) { setEvents([]); setLoading(true) }

    sportApi.getEvents(fetchParams)
      .then(res => {
        const evts = res.events ?? []
        setEvents(evts)
        setCached(key, evts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sport, syncVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // WS: patch score/status in-place without re-fetching the full list
  useSportWs({
    subscribeList: true,
    onListUpdate: useCallback((data: { id: string; status: string; home_score: number | null; away_score: number | null; elapsed: number | null; status_short: string | null }) => {
      setEvents(prev => prev.map(e =>
        e.id === data.id
          ? { ...e, status: data.status as SportEvent['status'], home_score: data.home_score ?? undefined, away_score: data.away_score ?? undefined, raw_data: { ...(e.raw_data as Record<string, unknown> | null ?? {}), elapsed: data.elapsed, status_short: data.status_short } }
          : e
      ))
    }, []),
  })

  useEffect(() => { setCurrentPage(1) }, [sport, selectedDate, selectedLeague])
  useEffect(() => { setSelectedDate(getCached<SelectedDate>(`sport_date:${sport}`) ?? today) }, [sport, today])

  const showSkeleton = useLoaderMinHold(loading)
  void isRefreshing // kept for future use

  const liveCount = events.filter(e => e.status === 'live').length

  // Count events per date — league-aware for DateStrip display
  const countByDate = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>()
    const source = selectedLeague
      ? events.filter(e => (e.league || e.subcategory || '') === selectedLeague)
      : events
    for (const e of source) {
      if (e.status === 'live') continue // live counted separately
      const d = eventLocalDate(e.starts_at)
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    return map
  }, [events, selectedLeague])

  // Unfiltered counts for sync decision (don't sync when data exists globally)
  const countByDateAll = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>()
    for (const e of events) {
      if (e.status === 'live') continue
      const d = eventLocalDate(e.starts_at)
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    return map
  }, [events])

  const leagues = useMemo<SidebarLeague[]>(() => {
    const seen = new Map<string, { flag: string | null; leagueId: number | null }>()
    for (const e of events) {
      const name = e.league || e.subcategory || ''
      if (!name || seen.has(name)) continue
      const raw = e.raw_data as Record<string, unknown> | null
      seen.set(name, {
        flag: (raw?.league_flag as string | null | undefined) ?? null,
        leagueId: (raw?.league_id as number | null | undefined) ?? null,
      })
    }
    return Array.from(seen.entries())
      .map(([name, { flag, leagueId }]) => ({ name, flag, leagueId }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [events])
  const todayCount = useMemo(() => {
    const today = toLocalDateStr(new Date())
    return events.filter(e => eventLocalDate(e.starts_at) === today).length
  }, [events])
  useEffect(() => {
    setLeagues(leagues)
    setLiveCount(liveCount)
    setTotalCount(events.length)
    setTodayCount(todayCount)
  }, [leagues, liveCount, events.length, todayCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEvents = useMemo(() => {
    let result = selectedLeague
      ? events.filter(e => (e.league || e.subcategory || '') === selectedLeague)
      : events
    if (selectedDate === 'live') {
      result = result.filter(e => e.status === 'live')
    } else {
      result = result.filter(e => eventLocalDate(e.starts_at) === selectedDate)
    }
    return result
  }, [events, selectedLeague, selectedDate])

  const allGroups  = useMemo(() => groupByLeague(filteredEvents), [filteredEvents])
  const pages      = useMemo(() => paginateGroups(allGroups), [allGroups])
  const totalPages = pages.length
  const pageGroups = pages[currentPage - 1] ?? []

  const eventsBefore = pages.slice(0, currentPage - 1).reduce((sum, pg) => sum + pg.reduce((s, g) => s + g.events.length, 0), 0)
  const eventsOnPage = pageGroups.reduce((sum, g) => sum + g.events.length, 0)
  const pageStart    = filteredEvents.length > 0 ? eventsBefore + 1 : 0
  const pageEnd      = eventsBefore + eventsOnPage

  const handleDateSelect = useCallback(async (d: SelectedDate) => {
    setSelectedDate(d)
    setCached(`sport_date:${sport}`, d)
    setCurrentPage(1)
    if (d === 'live' || d === today) return
    // Sync only when no data at all for this date (regardless of league filter)
    if ((countByDateAll.get(d) ?? 0) === 0) {
      setSyncingDate(d)
      try {
        await syncSportDateAction(sport, d)
        setSyncVersion(v => v + 1)
      } catch { /* ignore */ } finally {
        setSyncingDate(null)
      }
    }
  }, [countByDateAll, sport, today])

  // Reset selected date when league changes — if current date has no data for new league
  useEffect(() => {
    if (selectedDate === 'live' || selectedDate === today) return
    if ((countByDate.get(selectedDate) ?? 0) === 0) {
      setSelectedDate(today)
      setCurrentPage(1)
    }
  }, [selectedLeague]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <main className="flex-1 min-w-0 px-3 sm:px-4 md:px-6 pb-5 pt-0">

        {/* Page header — breadcrumbs only when viewing a match */}
        {eventId && (
          <div className="flex items-center gap-0 mb-3 pt-3 pb-2 sport-sticky-header"
            style={{ position: 'sticky', zIndex: 15, background: 'rgba(var(--bg-base-rgb), 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-center gap-0 min-w-0">
              <button
                onClick={() => window.history.length > 1 ? router.back() : router.push(`/sport/${sport}`)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors shrink-0 pr-2"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                {t('sport.back')}
              </button>
              {matchLeague && (
                <>
                  <span className="text-text-muted/45 text-[11px] mx-1.5">/</span>
                  {matchLeagueId
                    ? <button onClick={() => router.push(`/sport/${sport}/league/${matchLeagueId}`)} className="text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{matchLeague}</button>
                    : <span className="text-[11px] font-medium text-text-muted truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{matchLeague}</span>
                  }
                </>
              )}
              {(matchHome || matchAway) && (
                <>
                  <span className="text-text-muted/45 text-[11px] mx-1.5">/</span>
                  <span className="text-[11px] font-medium text-text-primary truncate max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">{matchHome} — {matchAway}</span>
                </>
              )}
            </div>
            {isRefreshing && (
              <svg className="w-3 h-3 animate-spin text-text-muted/40 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            )}
          </div>
        )}

        {/* Date strip — hidden inside match */}
        {!showSkeleton && !eventId && (
          <div className="mb-3">
            <DateStrip
              dates={dateRange}
              selected={selectedDate}
              onSelect={handleDateSelect}
              countByDate={countByDate}
              liveCount={liveCount}
              accent={accent}
              syncingDate={syncingDate}
              lang={lang}
            />
          </div>
        )}

        {/* Content */}
        {eventId ? (
          <SportEventPage id={eventId} initialFast={initialEventFull as EventFastCache | undefined} onBack={() => window.history.length > 1 ? router.back() : router.push(`/sport/${sport}`)} onLeagueLoad={(meta: EventMeta) => { setMatchLeague(meta.league); setMatchLeagueId(meta.leagueId ?? null); setMatchHome(meta.homeTeam); setMatchAway(meta.awayTeam) }} />
        ) : (
          <>
            {selectedLeague && !showSkeleton && (
              <ActiveFilterBanner
                label={t('sport.league_filter')}
                value={selectedLeague}
                onClear={() => setSelectedLeague(null)}
              />
            )}

            {showSkeleton && (
              <PrescioLoader color={accent} state="loading" label={t('sport.loading_matches')} />
            )}

            {!showSkeleton && events.length === 0 && (
              <PrescioLoader
                color={accent}
                state="idle"
                label={t('sport.no_events')}
                sublabel={t('sport.data_syncing')}
              />
            )}

            {!showSkeleton && filteredEvents.length === 0 && events.length > 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-mono text-text-muted/60">{t('sport.no_matches_date')}</p>
                <button
                  onClick={() => setSelectedDate(today)}
                  className="mt-3 text-[10px] font-mono px-3 py-1.5 rounded border transition-all"
                  style={{ borderColor: mix(accent, 27), color: accent }}
                >
                  {t('sport.back_to_today')}
                </button>
              </div>
            )}

            {!showSkeleton && filteredEvents.length > 0 && (
              <>
                <div className="flex flex-col gap-0">
                  {pageGroups.map(({ league, logo, flag, events: group }, idx) => {
                    const leagueLiveCount = group.filter(e => e.status === 'live').length
                    return (
                      <div key={league}>
                        <GroupDivider
                          name={league}
                          logo={logo}
                          flag={flag}
                          count={group.length}
                          liveCount={leagueLiveCount}
                          first={idx === 0}
                        />
                        <div className="flex flex-col rounded-b-lg overflow-hidden"
                          style={{ border: '0.5px solid rgba(var(--surface-tint-rgb),0.07)', borderTop: 'none' }}>
                          {group.map(e => (
                            <SportRow
                              key={e.id}
                              event={e}
                              sport={sport}
                              accent={accent}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Pagination
                  current={currentPage}
                  total={totalPages}
                  totalEvents={filteredEvents.length}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  accent={accent}
                  onChange={p => {
                    flushSync(() => setCurrentPage(p))
                    scrollLiveContentToTop()
                  }}
                />
              </>
            )}
          </>
        )}

      </main>
    </ErrorBoundary>
  )
}
