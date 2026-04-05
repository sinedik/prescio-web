'use client'
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { getCached, setCached } from '../lib/clientCache'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSportWs } from '../hooks/useSportWs'
import { sportApi } from '../lib/api'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { SportEvent, SportOdds, SubscriptionPlan } from '../types/index'
import { useAuthContext } from '../contexts/AuthContext'
import SportEventPage, { type EventMeta } from './SportEventPage'
import type { SidebarLeague } from '../contexts/LiveLayoutContext'

import { LogoFootball, LogoBasketball, LogoTennis, LogoMMA } from '../components/icons/games'
import { useLiveLayout } from '../contexts/LiveLayoutContext'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Sport = 'football' | 'basketball' | 'tennis' | 'mma'

// 'live' | 'YYYY-MM-DD'
type SelectedDate = 'live' | string

const SPORT_ACCENT: Record<Sport, string> = {
  football:   '#e8c032',
  basketball: '#e66414',
  tennis:     '#C8E63C',
  mma:        '#e02020',
}

const SPORTS: { key: Sport; label: string; icon: React.ReactNode }[] = [
  { key: 'football',   label: 'Football',   icon: <LogoFootball size={16} />   },
  { key: 'basketball', label: 'Basketball', icon: <LogoBasketball size={16} /> },
  { key: 'tennis',     label: 'Tennis',     icon: <LogoTennis size={16} />     },
  { key: 'mma',        label: 'MMA',        icon: <LogoMMA size={16} />        },
]

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

function formatDateLabel(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T12:00:00')
  const today = toLocalDateStr(new Date())
  const tomorrow = toLocalDateStr(new Date(Date.now() + 86_400_000))
  if (dateStr === today)    return { weekday: 'Сегодня', day: '', month: '' }
  if (dateStr === tomorrow) return { weekday: 'Завтра',  day: '', month: '' }
  return {
    weekday: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
    day:     String(d.getDate()),
    month:   d.toLocaleDateString('ru-RU', { month: 'short' }),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (name ?? '--').slice(0, 2).toUpperCase()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  if (diff > 0 && diff < 60 * 60_000) return `${Math.round(diff / 60000)}м`
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
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

function Pagination({ current, total, totalEvents, pageStart, pageEnd, onChange, accent }: {
  current: number; total: number; totalEvents: number; pageStart: number; pageEnd: number
  onChange: (p: number) => void; accent?: string
}) {
  if (total <= 1) return null
  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  const a = accent ?? 'rgba(0,200,150,1)'
  return (
    <div className="flex flex-col items-center gap-2 pt-4 pb-2">
      <span className="text-[10px] font-mono text-[#888]">
        Матчи {pageStart}–{pageEnd} из {totalEvents}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(current - 1)} disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-[10px] font-mono text-text-muted/40">···</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)}
              className="w-8 h-8 flex items-center justify-center rounded text-[11px] font-mono transition-all"
              style={p === current
                ? { background: `${a}18`, color: a, border: `1px solid ${a}44` }
                : { color: 'rgb(var(--text-muted))', border: '1px solid transparent' }
              }>{p}</button>
          )
        )}
        <button onClick={() => onChange(current + 1)} disabled={current === total}
          className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Date strip ───────────────────────────────────────────────────────────────
function DateStrip({ dates, selected, onSelect, countByDate, liveCount, accent, syncingDate }: {
  dates: string[]
  selected: SelectedDate
  onSelect: (d: SelectedDate) => void
  countByDate: Map<string, number>
  liveCount: number
  accent: string
  syncingDate?: string | null
}) {
  return (
    <div className="relative -mx-6">
      <div className="flex overflow-x-auto gap-1.5 px-6 pb-2 pt-1 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}>

        {/* Live tab */}
        <button
          onClick={() => onSelect('live')}
          className="flex flex-col items-center px-3 py-2 rounded-lg border shrink-0 transition-all min-w-[52px]"
          style={selected === 'live'
            ? { borderColor: 'rgba(255,50,50,0.5)', background: 'rgba(255,50,50,0.1)', color: '#ff5252' }
            : { borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: liveCount > 0 ? '#ff5252' : 'rgba(255,255,255,0.3)' }
          }
        >
          <div className="flex items-center gap-1">
            {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            <span className="text-[11px] font-mono font-bold">Live</span>
          </div>
          <span className="text-[10px] font-mono mt-0.5" style={{ color: selected === 'live' ? '#ff5252' : liveCount > 0 ? 'rgba(255,82,82,0.6)' : 'rgba(255,255,255,0.2)' }}>
            {liveCount > 0 ? liveCount : '—'}
          </span>
        </button>

        {/* Date tabs */}
        {dates.map(dateStr => {
          const { weekday, day, month } = formatDateLabel(dateStr)
          const count = countByDate.get(dateStr) ?? 0
          const isSelected = selected === dateStr
          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className="flex flex-col items-center px-3 py-2 rounded-lg border shrink-0 transition-all min-w-[52px]"
              style={isSelected
                ? { borderColor: `${accent}55`, background: `${accent}12`, color: accent }
                : { borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: count > 0 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)' }
              }
            >
              <span className="text-[11px] font-mono font-bold capitalize leading-tight">
                {weekday}
              </span>
              {day && (
                <span className="text-[9px] font-mono mt-0.5 leading-none">
                  {day} {month}
                </span>
              )}
              <span className="text-[10px] font-mono mt-0.5"
                style={{ color: isSelected ? accent : count > 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)' }}>
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
        style={{ background: 'linear-gradient(to right, transparent, rgba(8,8,8,0.9))' }} />
    </div>
  )
}

// ─── League grouping ──────────────────────────────────────────────────────────
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
    .map(([league, { events, logo, flag }]) => ({ league, logo, flag, events }))
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

// ─── League divider ───────────────────────────────────────────────────────────
function LeagueDivider({ name, logo, flag, count, liveCount, first }: {
  name: string; logo?: string | null; flag?: string | null; count: number; liveCount: number; first?: boolean
}) {
  const [logoErr, setLogoErr] = useState(false)
  const [flagErr, setFlagErr] = useState(false)

  const icon = flag && !flagErr ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flag} alt="" loading="lazy" onError={() => setFlagErr(true)}
      className="w-[18px] h-[13px] object-cover rounded-[2px] shrink-0" />
  ) : logo && !logoErr ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" loading="lazy" onError={() => setLogoErr(true)}
      className="w-5 h-5 object-contain shrink-0" />
  ) : <div className="w-5 h-5 shrink-0" />

  return (
    <div className={`flex items-center gap-2.5 px-3.5 rounded-lg overflow-hidden ${first ? 'mt-0' : 'mt-5'} mb-1.5`}
      style={{ minHeight: 40, background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(255,255,255,0.08)' }}>
      {icon}
      <span className="text-[13px] font-semibold text-[#e0e0e0] truncate flex-1">
        {name}
      </span>
      {liveCount > 0 && (
        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'rgba(255,50,50,0.12)', color: '#ff5252', border: '1px solid rgba(255,50,50,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          {liveCount}
        </span>
      )}
      <span className="text-[10px] font-mono text-[#888] shrink-0 min-w-[18px] text-right">
        {count}
      </span>
    </div>
  )
}

// ─── Team logo ────────────────────────────────────────────────────────────────
function TeamLogo({ logo, abbr: abbrStr, size, accent }: { logo?: string | null; abbr: string; size: number; accent: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <div className="shrink-0 flex items-center justify-center rounded overflow-hidden border border-bg-border"
      style={{ width: size, height: size, background: `${accent}08` }}>
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

// ─── Odds bar ─────────────────────────────────────────────────────────────────
function OddsBar({ odds, accent, sport }: { odds: Odds3Way; accent: string; sport: Sport }) {
  const showDraw = sport === 'football' && odds.draw != null
  const homeWins = odds.home > odds.away
  const awayWins = odds.away > odds.home
  return (
    <div className="flex gap-1 items-stretch">
      <div className="flex flex-col items-center px-1.5 sm:px-2 py-1.5 rounded-md border transition-all min-w-[36px] sm:min-w-[42px]"
        style={homeWins ? { borderColor: `${accent}55`, background: `${accent}10` } : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <span className="text-[7px] font-mono text-[#888] uppercase tracking-wide mb-0.5">Х</span>
        <span className="text-[12px] font-mono font-semibold leading-none"
          style={{ color: homeWins ? accent : '#ccc' }}>{odds.home}%</span>
      </div>
      {showDraw && (
        <div className="flex flex-col items-center px-1.5 sm:px-2 py-1.5 rounded-md border transition-all min-w-[32px] sm:min-w-[38px]"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <span className="text-[7px] font-mono text-[#888] uppercase tracking-wide mb-0.5">Н</span>
          <span className="text-[12px] font-mono font-semibold leading-none text-[#aaa]">{odds.draw}%</span>
        </div>
      )}
      <div className="flex flex-col items-center px-1.5 sm:px-2 py-1.5 rounded-md border transition-all min-w-[36px] sm:min-w-[42px]"
        style={awayWins ? { borderColor: `${accent}55`, background: `${accent}10` } : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
        <span className="text-[7px] font-mono text-[#888] uppercase tracking-wide mb-0.5">Г</span>
        <span className="text-[12px] font-mono font-semibold leading-none"
          style={{ color: awayWins ? accent : '#ccc' }}>{odds.away}%</span>
      </div>
    </div>
  )
}

// ─── Match Row ────────────────────────────────────────────────────────────────
const SportRow = memo(function SportRow({ event, sport, accent }: {
  event: SportEvent; sport: Sport; accent: string
}) {
  const [expanded, setExpanded] = useState(false)
  const isLive     = event.status === 'live'
  const isFinished = event.status === 'finished'
  const hasScore   = event.home_score != null && event.away_score != null
  const elapsed    = (event.raw_data as Record<string, unknown> | null)?.elapsed as number | null | undefined
  const odds       = extractOdds(event.sport_odds, sport)
  const raw        = event.raw_data as Record<string, unknown> | null
  const homeLogo   = raw?.home_logo as string | null | undefined
  const awayLogo   = raw?.away_logo as string | null | undefined
  const homeLeads  = (event.home_score ?? 0) > (event.away_score ?? 0)
  const awayLeads  = (event.away_score ?? 0) > (event.home_score ?? 0)

  const href = `/sport/${sport}/${event.id}`

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${isLive ? 'rgba(255,50,50,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
      <Link
        href={href}
        className="grid items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2.5 transition-all group relative [grid-template-columns:48px_1fr_auto] sm:[grid-template-columns:64px_1fr_auto]"
        style={{
          background: isLive ? 'rgba(255,50,50,0.04)' : 'rgba(8,8,8,0.55)',
          backdropFilter: 'blur(2px)',
          display: 'grid',
        }}
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: isLive ? '#ff5252' : 'transparent' }} />
        <div className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: isLive ? 'transparent' : accent }} />

        {/* Time / Score */}
        <div className="flex flex-col items-center gap-0.5 pl-1.5">
          {isLive ? (
            <>
              {hasScore && (
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-[18px] font-mono font-black"
                    style={{ color: homeLeads ? '#ff5252' : awayLeads ? 'rgba(255,255,255,0.4)' : '#ff5252' }}>
                    {event.home_score}
                  </span>
                  <span className="text-[12px] font-mono text-[#666]">:</span>
                  <span className="text-[18px] font-mono font-black"
                    style={{ color: awayLeads ? '#ff5252' : homeLeads ? 'rgba(255,255,255,0.4)' : '#ff5252' }}>
                    {event.away_score}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold" style={{ color: '#ff5252' }}>
                  {elapsed != null ? `${elapsed}'` : 'Live'}
                </span>
              </div>
            </>
          ) : isFinished && hasScore ? (
            <>
              <div className="flex items-center gap-1 leading-none">
                <span className="text-[18px] font-mono font-black"
                  style={{ color: homeLeads ? 'rgba(255,255,255,0.85)' : awayLeads ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.65)' }}>
                  {event.home_score}
                </span>
                <span className="text-[12px] font-mono text-text-muted/30">:</span>
                <span className="text-[18px] font-mono font-black"
                  style={{ color: awayLeads ? 'rgba(255,255,255,0.85)' : homeLeads ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.65)' }}>
                  {event.away_score}
                </span>
              </div>
              <span className="text-[8px] font-mono text-[#888] uppercase">ФТ</span>
            </>
          ) : (
            <>
              <span className="text-[13px] font-mono text-text-primary leading-none">{formatTime(event.starts_at)}</span>
            </>
          )}
        </div>

        {/* Teams */}
        <div className="flex flex-col gap-1.5 min-w-0">
          {odds && (
            <div className="flex w-full h-[5px] rounded-full overflow-hidden">
              <div style={{ width: `${odds.home}%`, background: accent, opacity: 0.8, borderRadius: '99px 0 0 99px' }} />
              {odds.draw != null && odds.draw > 0 && (
                <div style={{ width: `${odds.draw}%`, background: 'rgba(89,100,112,0.7)' }} />
              )}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.22)', borderRadius: '0 99px 99px 0' }} />
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <TeamLogo logo={homeLogo} abbr={abbr(event.home_team)} size={24} accent={accent} />
            <span className="text-[13px] font-semibold text-text-primary truncate leading-tight">{event.home_team}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <TeamLogo logo={awayLogo} abbr={abbr(event.away_team)} size={24} accent={accent} />
            <span className="text-[13px] font-semibold text-text-primary truncate leading-tight">{event.away_team}</span>
          </div>
        </div>

        {/* Odds + expand */}
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.preventDefault()}>
          {odds ? (
            <OddsBar odds={odds} accent={accent} sport={sport} />
          ) : (
            <div className="w-2 h-2 rounded-full bg-bg-border/60" />
          )}
          <button
            onClick={e => { e.preventDefault(); setExpanded(v => !v) }}
            className="flex items-center gap-1 px-2 py-1 rounded border transition-all shrink-0"
            style={expanded
              ? { borderColor: `${accent}44`, color: accent, background: `${accent}10` }
              : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
            }
          >
            <span className="text-[9px] font-mono">Коэф.</span>
            <svg className="w-2.5 h-2.5 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>
      </Link>

      {expanded && (
        <div className="px-4 py-3 border-t border-bg-border/50 bg-bg-elevated/30">
          <MatchDetail event={event} sport={sport} accent={accent} />
        </div>
      )}
    </div>
  )
})

// ─── Match detail (expanded) ──────────────────────────────────────────────────
function MatchDetail({ event, sport, accent }: { event: SportEvent; sport: Sport; accent: string }) {
  const allOdds = event.sport_odds ?? []
  if (allOdds.length === 0) return (
    <div className="flex items-center justify-center py-3">
      <span className="text-[10px] font-mono text-text-muted/40">Коэффициенты недоступны</span>
    </div>
  )

  const MARKET_LABELS: Record<string, string> = {
    h2h: sport === 'football' ? '1X2' : 'Победитель',
    spreads: 'Форы', totals: 'Тотал', btts: 'Обе забьют',
  }

  const byMarket = new Map<string, SportOdds[]>()
  for (const o of allOdds) {
    if (!byMarket.has(o.market_type)) byMarket.set(o.market_type, [])
    byMarket.get(o.market_type)!.push(o)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-[10px] font-mono text-[#888]">
        {event.league && <span>{event.league}</span>}
        {(event.raw_data as Record<string, unknown> | null)?.season != null && (
          <><span className="text-text-muted/20">·</span>
          <span>Сезон {String((event.raw_data as Record<string, unknown>).season)}</span></>
        )}
        <span className="text-text-muted/20">·</span>
        <span>{new Date(event.starts_at).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
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
                <p className="text-[8px] font-mono font-bold tracking-[0.1em] uppercase text-[#888]">
                  {MARKET_LABELS[marketType] ?? marketType}
                </p>
                <span className="text-[8px] font-mono text-[#666]">{marketOdds.length} букм.</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(bestByName.entries()).map(([name, { price, bookmaker }]) => (
                  <div key={name} className="flex flex-col items-center px-2.5 py-1.5 rounded border min-w-[56px]"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-[9px] font-mono text-[#888] truncate max-w-[80px] text-center leading-tight mb-0.5">{name}</span>
                    <span className="text-[14px] font-mono font-bold leading-none" style={{ color: accent }}>{price.toFixed(2)}</span>
                    <span className="text-[7px] font-mono text-text-muted/25 mt-0.5 truncate max-w-[64px] text-center">{bookmaker}</span>
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
export function SportScreen({ initialSport, eventId }: { initialSport?: Sport; eventId?: string } = {}) {
  usePageTitle('Sport')
  const router = useRouter()
  const { profile } = useAuthContext()
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

  const { selectedLeague, setSelectedLeague, setLeagues, setLiveCount, setTotalCount } = useLiveLayout()

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

  const [events, setEvents]       = useState<SportEvent[]>(() => getCached<SportEvent[]>(`sport_events:${sport}`) ?? [])
  const [loading, setLoading]     = useState(() => !getCached<SportEvent[]>(`sport_events:${sport}`))
  const [isRefreshing] = useState(false)

  // Initial fetch + refetch on sport/syncVersion change
  useEffect(() => {
    const key = `sport_events:${sport}`
    const cached = getCached<SportEvent[]>(key)
    if (!cached) { setEvents([]); setLoading(true) }

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
    onListUpdate: useCallback((data: { id: string; status: string; home_score: number | null; away_score: number | null }) => {
      setEvents(prev => prev.map(e =>
        e.id === data.id
          ? { ...e, status: data.status as SportEvent['status'], home_score: data.home_score ?? undefined, away_score: data.away_score ?? undefined }
          : e
      ))
    }, []),
  })

  useEffect(() => { setCurrentPage(1) }, [sport, selectedDate, selectedLeague])
  useEffect(() => { setSelectedDate(getCached<SelectedDate>(`sport_date:${sport}`) ?? today) }, [sport, today])

  const showSkeleton = loading
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
  useEffect(() => {
    setLeagues(leagues)
    setLiveCount(liveCount)
    setTotalCount(events.length)
  }, [leagues, liveCount, events.length]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const sportLabel = SPORTS.find(s => s.key === sport)?.label ?? 'Sport'

  const handleDateSelect = useCallback(async (d: SelectedDate) => {
    setSelectedDate(d)
    setCached(`sport_date:${sport}`, d)
    setCurrentPage(1)
    if (d === 'live' || d === today) return
    // Sync only when no data at all for this date (regardless of league filter)
    if ((countByDateAll.get(d) ?? 0) === 0) {
      setSyncingDate(d)
      try {
        await sportApi.syncDate(sport, d)
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

        {/* Page header */}
        <div className="flex items-center gap-0 mb-3 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-3 pb-2"
          style={{ position: 'sticky', top: 200, zIndex: 15, background: 'rgba(8,8,8,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          {eventId ? (
            /* BreadcrumbBar style — same as TeamPage / PlayerPage */
            <div className="flex items-center gap-0 min-w-0">
              <button
                onClick={() => window.history.length > 1 ? router.back() : router.push(`/sport/${sport}`)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors shrink-0 pr-2"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Назад
              </button>
              {matchLeague && (
                <>
                  <span className="text-text-muted/30 text-[11px] mx-1.5">/</span>
                  {matchLeagueId
                    ? <button onClick={() => router.push(`/sport/${sport}/league/${matchLeagueId}`)} className="text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{matchLeague}</button>
                    : <span className="text-[11px] font-medium text-text-muted truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{matchLeague}</span>
                  }
                </>
              )}
              {(matchHome || matchAway) && (
                <>
                  <span className="text-text-muted/30 text-[11px] mx-1.5">/</span>
                  <span className="text-[11px] font-medium text-text-primary truncate max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">{matchHome} — {matchAway}</span>
                </>
              )}
            </div>
          ) : (
            <h1 className="text-xl font-bold tracking-wider uppercase text-text-primary" style={{ fontFamily: 'var(--font-sans)' }}>
              {sportLabel}
            </h1>
          )}
          {isRefreshing && (
            <svg className="w-3 h-3 animate-spin text-text-muted/40 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          )}
        </div>

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
            />
          </div>
        )}

        {/* Content */}
        {eventId ? (
          <SportEventPage id={eventId} onBack={() => window.history.length > 1 ? router.back() : router.push(`/sport/${sport}`)} onLeagueLoad={(meta: EventMeta) => { setMatchLeague(meta.league); setMatchLeagueId(meta.leagueId ?? null); setMatchHome(meta.homeTeam); setMatchAway(meta.awayTeam) }} />
        ) : (
          <>
            {/* Active league filter banner */}
            {selectedLeague && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border border-bg-border bg-bg-surface">
                <svg className="w-3 h-3 text-text-muted/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                <span className="text-[11px] font-mono text-text-muted/50 shrink-0">Лига:</span>
                <span className="text-[11px] font-mono font-bold text-text-primary truncate">{selectedLeague}</span>
                <button onClick={() => setSelectedLeague(null)}
                  className="ml-auto text-[16px] leading-none text-text-muted/40 hover:text-text-muted transition-colors shrink-0">
                  ×
                </button>
              </div>
            )}

            {showSkeleton && (
              <div className="flex flex-col gap-1.5">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className="rounded-lg animate-pulse bg-bg-surface border border-bg-border"
                    style={{ height: 72, animationDelay: `${i * 50}ms` }} />
                ))}
              </div>
            )}

            {!showSkeleton && events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-bg-surface border border-bg-border">
                  <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <p className="text-sm font-mono text-text-muted">События не найдены</p>
                <p className="text-xs font-mono text-text-muted/50 mt-1">Данные синхронизируются</p>
              </div>
            )}

            {!showSkeleton && filteredEvents.length === 0 && events.length > 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-mono text-text-muted/60">Нет матчей на выбранную дату</p>
                <button
                  onClick={() => setSelectedDate(today)}
                  className="mt-3 text-[10px] font-mono px-3 py-1.5 rounded border transition-all"
                  style={{ borderColor: `${accent}44`, color: accent }}
                >
                  Вернуться к сегодня
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
                        <LeagueDivider
                          name={league}
                          logo={logo}
                          flag={flag}
                          count={group.length}
                          liveCount={leagueLiveCount}
                          first={idx === 0}
                        />
                        <div className="flex flex-col gap-1">
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
                    requestAnimationFrame(() => {
                      const el = document.getElementById('live-content')
                      if (!el) return
                      if (el.scrollTop === 0 && el.scrollHeight > el.clientHeight)
                        el.scrollTop = Math.min(80, el.scrollHeight - el.clientHeight)
                      el.scrollTo({ top: 0, behavior: 'smooth' })
                    })
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
