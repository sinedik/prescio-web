'use client'
import { useMemo } from 'react'
import type { SportEvent } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'
import { useOddsHistory, type OddsHistoryPoint } from '../../hooks/useOddsHistory'

type Sport = 'football' | 'basketball' | 'tennis' | 'mma' | 'other'

interface Props {
  event: SportEvent
}

function detectSport(event: SportEvent): Sport {
  const sub = (event.subcategory ?? '').toLowerCase()
  if (sub.includes('football') || sub.includes('soccer')) return 'football'
  if (sub.includes('basket')) return 'basketball'
  if (sub.includes('tennis')) return 'tennis'
  if (sub.includes('mma') || sub.includes('ufc')) return 'mma'
  return 'other'
}

interface SeriesPoint { t: number; price: number }
interface Series { label: string; side: 'home' | 'draw' | 'away'; points: SeriesPoint[] }

function buildSeries(history: OddsHistoryPoint[], sport: Sport): Series[] {
  // Use first bookmaker with h2h only; average across bookmakers would also work.
  const h2h = history.filter((h) => h.market_type === 'h2h')
  if (!h2h.length) return []
  const bookmakers = Array.from(new Set(h2h.map((h) => h.bookmaker)))
  const bk = bookmakers[0]
  const byBk = h2h.filter((h) => h.bookmaker === bk)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

  const sides: { key: 'home' | 'draw' | 'away'; match: (n: string) => boolean; label: (t: (k: never) => string, eventSide: 'home' | 'away') => string }[] = [
    { key: 'home', match: (n) => n === 'home' || n === '1', label: () => 'home' },
    { key: 'draw', match: (n) => n === 'draw' || n === 'x', label: () => 'draw' },
    { key: 'away', match: (n) => n === 'away' || n === '2', label: () => 'away' },
  ]

  const series: Series[] = sides
    .filter((s) => s.key !== 'draw' || sport === 'football')
    .map((s) => {
      const points: SeriesPoint[] = []
      for (const row of byBk) {
        const outcome = row.outcomes.find((o) => s.match(o.name.toLowerCase()))
        if (!outcome || !(outcome.price > 0)) continue
        points.push({ t: new Date(row.recorded_at).getTime(), price: outcome.price })
      }
      return { label: s.key, side: s.key, points }
    })
    .filter((s) => s.points.length > 0)

  return series
}

function Sparkline({ points, trend }: { points: SeriesPoint[]; trend: 'up' | 'down' | 'flat' }) {
  if (points.length < 2) {
    return (
      <div
        className="w-full"
        style={{ height: 32, background: 'rgb(var(--bg-elevated))', borderRadius: 3 }}
      />
    )
  }
  const W = 120
  const H = 32
  const min = Math.min(...points.map((p) => p.price))
  const max = Math.max(...points.map((p) => p.price))
  const range = max - min || 1
  const xs = points.map((p, i) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W))
  const ys = points.map((p) => H - ((p.price - min) / range) * H)
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const color =
    trend === 'up' ? 'rgb(var(--accent))' : trend === 'down' ? 'rgb(var(--danger))' : 'rgb(var(--text-muted))'
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2" fill={color} />
    </svg>
  )
}

function Milestones({ points }: { points: SeriesPoint[] }) {
  const { lang } = useLang()
  const tr = useT(lang)
  if (points.length === 0) return null
  const open = points[0].price
  const now = points[points.length - 1].price
  const low = Math.min(...points.map((p) => p.price))
  const high = Math.max(...points.map((p) => p.price))
  const fmt = (v: number) => v.toFixed(2)
  const drift = now - open
  const driftCls = drift > 0 ? 'text-accent' : drift < 0 ? 'text-danger' : 'text-text-muted'
  const driftSign = drift > 0 ? '+' : ''
  return (
    <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums">
      <span className="text-text-muted">
        {tr('match_detail.odds.open')} <span className="text-text-secondary">{fmt(open)}</span>
      </span>
      <span className="text-text-muted">
        {tr('match_detail.odds.low')} <span className="text-text-secondary">{fmt(low)}</span>
      </span>
      <span className="text-text-muted">
        {tr('match_detail.odds.high')} <span className="text-text-secondary">{fmt(high)}</span>
      </span>
      <span className="text-text-muted">
        {tr('match_detail.odds.now')} <span className="text-text-primary font-bold">{fmt(now)}</span>
      </span>
      <span className={`${driftCls} ml-auto`}>{driftSign}{fmt(drift)}</span>
    </div>
  )
}

export default function SportMatchOddsMovement({ event }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  const sport = detectSport(event)
  const { data, isLoading } = useOddsHistory(event.id, 50)

  const series = useMemo(() => buildSeries(data, sport), [data, sport])

  if (isLoading && series.length === 0) {
    return (
      <section
        className="mt-3 rounded-lg p-4"
        style={{
          background: 'rgb(var(--bg-surface))',
          border: '1px solid rgb(var(--bg-border))',
        }}
      >
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted">
          {tr('match_detail.odds.title')}
        </h3>
        <p className="text-[11px] font-mono text-text-muted mt-3">
          {tr('common.loading')}
        </p>
      </section>
    )
  }

  if (series.length === 0) return null

  const labels: Record<'home' | 'draw' | 'away', string> = {
    home: tr('sport_card.home'),
    draw: tr('sport_card.draw'),
    away: tr('sport_card.away'),
  }

  return (
    <section
      className="mt-3 rounded-lg p-4"
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '1px solid rgb(var(--bg-border))',
      }}
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted mb-3">
        {tr('match_detail.odds.title')}
      </h3>
      <div className="flex flex-col gap-3">
        {series.map((s) => {
          const open = s.points[0].price
          const now = s.points[s.points.length - 1].price
          const drift = now - open
          const trend: 'up' | 'down' | 'flat' =
            Math.abs(drift) < 0.01 ? 'flat' : drift > 0 ? 'up' : 'down'
          return (
            <div key={s.side} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-secondary">
                  {labels[s.side]}
                </span>
              </div>
              <Sparkline points={s.points} trend={trend} />
              <Milestones points={s.points} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
