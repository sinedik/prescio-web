'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sportApi } from '../lib/api'
import { getCached, setCached } from '../lib/clientCache'
import type { LeaguePageData, SportStanding, SportTopScorer, LeagueFixture } from '../types/index'

const ACCENT = '#e8c032'

const DESCRIPTION_COLOR: Record<string, string> = {
  'Champions League':  '#3b82f6',
  'UEFA Champions':    '#3b82f6',
  'Europa League':     '#f97316',
  'UEFA Europa':       '#f97316',
  'Conference League': '#22c55e',
  'Relegation':        '#e55e5b',
  'Relegation Play-off':'#f97316',
  'Promotion':         '#22c55e',
}

function descriptionColor(desc: string | null): string | null {
  if (!desc) return null
  for (const [key, color] of Object.entries(DESCRIPTION_COLOR)) {
    if (desc.includes(key)) return color
  }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string) {
  const w = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : (name ?? '--').slice(0, 2).toUpperCase()
}

function TeamLogo({ logo, name, size = 20 }: { logo?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={name} loading="lazy" onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain' }} />
  )
  return (
    <div className="flex items-center justify-center rounded font-bold text-text-muted shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36, background: 'rgba(255,255,255,0.06)' }}>
      {abbr(name)}
    </div>
  )
}

function FormDots({ form }: { form: string | null }) {
  if (!form) return null
  const chars = form.split('').slice(-5)
  const color = (c: string) => c === 'W' ? '#61DF6E' : c === 'D' ? '#596470' : '#E55E5B'
  return (
    <div className="flex gap-[3px]">
      {chars.map((c, i) => (
        <div key={i} className="w-[6px] h-[6px] rounded-full" style={{ background: color(c) }} />
      ))}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-[84px]">
      <div className="px-4 py-3 border-b border-bg-border">
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-[#aaa]">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Standings table ──────────────────────────────────────────────────────────
function StandingsTable({ standings, sport }: { standings: SportStanding[]; sport: string }) {
  if (!standings.length) return (
    <div className="px-4 py-8 text-center text-[12px] font-mono text-text-muted/50">Нет данных</div>
  )
  let lastDesc: string | null = undefined as unknown as null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] font-mono min-w-[560px]">
        <thead>
          <tr className="border-b border-bg-border/40">
            <th className="text-left pl-4 pr-2 py-2.5 text-[#666] font-medium w-8">#</th>
            <th className="text-left px-2 py-2.5 text-[#666] font-medium">Команда</th>
            <th className="text-center px-2 py-2.5 text-[#666] font-medium w-8 hidden sm:table-cell">И</th>
            <th className="text-center px-2 py-2.5 text-[#666] font-medium w-8">В</th>
            <th className="text-center px-2 py-2.5 text-[#666] font-medium w-8">Н</th>
            <th className="text-center px-2 py-2.5 text-[#666] font-medium w-8">П</th>
            <th className="text-center px-2 py-2.5 text-[#666] font-medium w-14 hidden md:table-cell">Г</th>
            <th className="text-center px-2 py-2.5 text-[#666] font-medium w-8">РГ</th>
            <th className="text-center px-2 py-2.5 text-[#666] font-medium w-9 font-bold text-text-muted">О</th>
            <th className="text-center pr-4 pl-2 py-2.5 text-[#666] font-medium hidden lg:table-cell">Форма</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(s => {
            const color = descriptionColor(s.description)
            const showBand = s.description !== lastDesc && color !== null
            lastDesc = s.description
            return (
              <tr key={s.id}
                className="border-b border-bg-border/20 hover:bg-white/[0.02] transition-colors"
                style={color ? { borderLeft: `2px solid ${color}` } : { borderLeft: '2px solid transparent' }}
              >
                <td className="pl-4 pr-2 py-2.5 text-[#888] tabular-nums">{s.rank}</td>
                <td className="px-2 py-2.5">
                  <Link href={`/sport/${sport}/team/${s.team_external_id}`}
                    className="flex items-center gap-2 hover:text-text-secondary transition-colors group">
                    <TeamLogo logo={s.team_logo} name={s.team_name} size={18} />
                    <span className="group-hover:underline decoration-dotted underline-offset-2 truncate max-w-[140px]">{s.team_name}</span>
                    {s.description && color && (
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded hidden lg:inline-block"
                        style={{ background: `${color}18`, color }}>
                        {s.description.replace('Promotion ', '').replace('Relegation', 'REL').replace(' Play-off', ' PO')}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="text-center px-2 py-2.5 text-[#bbb] tabular-nums hidden sm:table-cell">{s.played}</td>
                <td className="text-center px-2 py-2.5 text-[#bbb] tabular-nums">{s.wins}</td>
                <td className="text-center px-2 py-2.5 text-[#bbb] tabular-nums">{s.draws}</td>
                <td className="text-center px-2 py-2.5 text-[#bbb] tabular-nums">{s.losses}</td>
                <td className="text-center px-2 py-2.5 text-[#bbb] tabular-nums hidden md:table-cell">
                  {s.goals_for}:{s.goals_against}
                </td>
                <td className="text-center px-2 py-2.5 tabular-nums"
                  style={{ color: s.goal_diff > 0 ? '#61DF6E' : s.goal_diff < 0 ? '#E55E5B' : '#888' }}>
                  {s.goal_diff > 0 ? '+' : ''}{s.goal_diff}
                </td>
                <td className="text-center px-2 py-2.5 font-bold text-text-primary tabular-nums">{s.points}</td>
                <td className="pr-4 pl-2 py-2.5 hidden lg:table-cell">
                  <FormDots form={s.form} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Top scorers ──────────────────────────────────────────────────────────────
function TopScorersSection({ scorers, sport }: { scorers: SportTopScorer[]; sport: string }) {
  if (!scorers.length) return null
  return (
    <Section id="scorers" title={`Бомбардиры · топ ${scorers.length}`}>
      <div className="grid grid-cols-2 divide-x divide-bg-border/30">
        {scorers.map((s, i) => (
          <Link key={i} href={`/sport/${sport}/player/${s.player_id}`}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border/20 hover:bg-white/[0.025] transition-colors last:border-0 group">
            <span className="text-[11px] font-mono text-[#666] w-5 shrink-0 tabular-nums">{i + 1}</span>
            <PlayerPhoto photo={s.player_photo} name={s.player_name} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12px] font-medium truncate group-hover:underline decoration-dotted underline-offset-2">{s.player_name}</span>
              <span className="text-[10px] font-mono text-[#888] truncate">{s.team_name}</span>
            </div>
            <span className="text-[14px] font-mono font-bold shrink-0" style={{ color: ACCENT }}>{s.goals}</span>
          </Link>
        ))}
      </div>
    </Section>
  )
}

function PlayerPhoto({ photo, name }: { photo?: string | null; name: string }) {
  const [err, setErr] = useState(false)
  if (photo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name} loading="lazy" onError={() => setErr(true)}
      className="w-7 h-7 rounded-full object-cover border border-bg-border shrink-0" />
  )
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
      style={{ background: 'rgba(255,255,255,0.06)', color: '#888' }}>
      {abbr(name)}
    </div>
  )
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function FixtureRow({ f, sport }: { f: LeagueFixture; sport: string }) {
  const isLive = f.status === 'live'
  const isFinished = f.status === 'finished'
  const date = new Date(f.starts_at)
  const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  return (
    <Link href={`/sport/${sport}/${f.id}`}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border/20 hover:bg-white/[0.025] transition-colors last:border-0">
      {/* Date/time */}
      <div className="w-16 shrink-0 text-right">
        {isLive ? (
          <span className="text-[10px] font-mono font-bold" style={{ color: '#e55e5b' }}>LIVE</span>
        ) : isFinished ? (
          <span className="text-[10px] font-mono text-[#666]">FT</span>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-[#888]">{dateStr}</span>
            <span className="text-[10px] font-mono text-[#666]">{timeStr}</span>
          </div>
        )}
      </div>

      {/* Home */}
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className="text-[12px] font-medium truncate text-right">{f.home_team}</span>
        <TeamLogo logo={f.home_logo} name={f.home_team} size={18} />
      </div>

      {/* Score */}
      <div className="w-16 shrink-0 text-center">
        {isFinished || isLive ? (
          <span className="text-[13px] font-mono font-bold" style={{ color: isLive ? '#e55e5b' : 'rgba(255,255,255,0.85)' }}>
            {f.home_score ?? 0} — {f.away_score ?? 0}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-[#666]">vs</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamLogo logo={f.away_logo} name={f.away_team} size={18} />
        <span className="text-[12px] font-medium truncate">{f.away_team}</span>
      </div>
    </Link>
  )
}

function FixturesSection({ fixtures, sport }: { fixtures: LeagueFixture[]; sport: string }) {
  const live     = fixtures.filter(f => f.status === 'live')
  const upcoming = fixtures.filter(f => f.status === 'scheduled')
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const results  = fixtures.filter(f => f.status === 'finished' || f.status === 'canceled')
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())

  const defaultTab = live.length > 0 ? 'live' : upcoming.length > 0 ? 'upcoming' : 'results'
  const [tab, setTab] = useState<'upcoming' | 'live' | 'results'>(defaultTab)

  if (!fixtures.length) return null

  const TABS = [
    { id: 'upcoming' as const, label: 'Предстоящие', count: upcoming.length },
    { id: 'live'     as const, label: 'Live',         count: live.length },
    { id: 'results'  as const, label: 'Результаты',  count: results.length },
  ]
  const items = tab === 'live' ? live : tab === 'upcoming' ? upcoming : results

  return (
    <Section id="fixtures" title="Матчи">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-bg-border/30">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono transition-colors
              ${tab === t.id
                ? 'bg-white/[0.08] text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
              }`}
          >
            {t.id === 'live' && t.count > 0
              ? <span className="w-1.5 h-1.5 rounded-full bg-[#e55e5b] animate-pulse" />
              : null
            }
            {t.label}
            <span className={`text-[10px] tabular-nums ${tab === t.id ? 'opacity-50' : 'opacity-30'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {items.length > 0
          ? items.map(f => <FixtureRow key={f.id} f={f} sport={sport} />)
          : <div className="px-4 py-8 text-center text-[12px] font-mono text-text-muted/40">Нет матчей</div>
        }
      </div>
    </Section>
  )
}

// ─── League card (left sidebar) ───────────────────────────────────────────────
function LeagueCard({ data, sport }: { data: LeaguePageData; sport: string }) {
  const { meta, standings } = data
  const teamsCount = standings.length
  const totalGoals = standings.reduce((s, t) => s + (t.goals_for ?? 0), 0)
  const avgGoals = teamsCount > 0 ? (totalGoals / standings.reduce((s, t) => s + (t.played ?? 0), 0) * 2).toFixed(2) : null
  const leader = standings[0]

  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
      {/* Logo + name */}
      <div className="flex flex-col items-center gap-3 px-6 py-6 border-b border-bg-border/50">
        {meta.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.logo} alt={meta.name ?? ''} loading="eager"
            style={{ width: 80, height: 80, objectFit: 'contain' }} />
        ) : (
          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: ACCENT }}>
            {meta.name?.slice(0, 2).toUpperCase() ?? '??'}
          </div>
        )}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[15px] font-bold text-text-primary leading-tight">{meta.name ?? 'Лига'}</span>
          {meta.flag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.flag} alt="" loading="lazy" className="h-3 opacity-60 mt-0.5" />
          )}
          <span className="text-[11px] font-mono text-[#888]">Сезон {meta.season}/{String(meta.season + 1).slice(-2)}</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 divide-x divide-bg-border/30 border-b border-bg-border/50">
        {[
          { label: 'Команды', value: teamsCount || '—' },
          { label: 'Туров', value: standings[0]?.played ?? '—' },
          { label: 'Гол/матч', value: avgGoals ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-3 gap-0.5">
            <span className="text-[14px] font-mono font-bold text-text-primary">{value}</span>
            <span className="text-[9px] font-mono text-[#888] uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {/* Leader */}
      {leader && (
        <div className="px-4 py-3 border-b border-bg-border/30">
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-widest mb-2">Лидер</p>
          <Link href={`/sport/${sport}/team/${leader.team_external_id}`}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <TeamLogo logo={leader.team_logo} name={leader.team_name} size={24} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12px] font-medium truncate">{leader.team_name}</span>
              <span className="text-[10px] font-mono text-[#888]">{leader.points} очков</span>
            </div>
            <FormDots form={leader.form} />
          </Link>
        </div>
      )}

      {/* Top 5 standings preview */}
      {standings.length > 0 && (
        <div className="px-3 py-2">
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-widest mb-1.5 px-1">Топ-5</p>
          {standings.slice(0, 5).map(s => {
            const color = descriptionColor(s.description)
            return (
              <Link key={s.id} href={`/sport/${sport}/team/${s.team_external_id}`}
                className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-white/[0.03] transition-colors">
                <span className="text-[10px] font-mono text-[#666] w-4 tabular-nums">{s.rank}</span>
                {color && <div className="w-1 h-3.5 rounded-full shrink-0" style={{ background: color }} />}
                <TeamLogo logo={s.team_logo} name={s.team_name} size={16} />
                <span className="text-[11px] truncate flex-1">{s.team_name}</span>
                <span className="text-[11px] font-mono font-bold text-text-primary">{s.points}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LeagueSkeleton() {
  return (
    <div className="grid gap-6 pb-8 pt-5" style={{ gridTemplateColumns: '280px 1fr' }}>
      <div className="rounded-xl border border-bg-border bg-bg-surface h-[400px] animate-pulse" />
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-bg-border bg-bg-surface h-[320px] animate-pulse" />
        <div className="rounded-xl border border-bg-border bg-bg-surface h-[200px] animate-pulse" />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  leagueId: number
  sport: string
}

export default function LeaguePage({ leagueId, sport }: Props) {
  const router = useRouter()
  const cacheKey = `league:${leagueId}:${sport}`
  const [data, setData]       = useState<LeaguePageData | null>(() => getCached<LeaguePageData>(cacheKey))
  const [loading, setLoading] = useState(() => !getCached<LeaguePageData>(cacheKey))
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const key = `league:${leagueId}:${sport}`
    const cached = getCached<LeaguePageData>(key)
    if (!cached) { setData(null); setLoading(true) }
    setNotFound(false)

    sportApi.getLeague(leagueId, sport)
      .then(d => {
        const isEmpty = !d.meta.name && !d.standings.length && !d.fixtures.length
        if (!isEmpty) { setData(d); setCached(key, d) }
        else if (!cached) setNotFound(true)
      })
      .catch(() => { if (!cached) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [leagueId, sport])

  const BreadcrumbBar = () => (
    <div className="sticky top-[200px] z-20 -mx-6 px-6 py-2.5 flex items-center gap-2 border-b border-bg-border"
      style={{ background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      <button onClick={() => router.push(`/sport/${sport}`)}
        className="flex items-center gap-1.5 text-[12px] font-mono text-text-muted/60 hover:text-text-secondary transition-colors shrink-0">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Назад
      </button>
      {data?.meta.name && (
        <>
          <span className="text-text-muted/25 text-[12px]">/</span>
          <span className="text-[12px] font-mono text-[#888] truncate">{data.meta.name}</span>
        </>
      )}
    </div>
  )

  if (loading) return (
    <div className="px-6">
      <BreadcrumbBar />
      <LeagueSkeleton />
    </div>
  )

  if (notFound || !data) return (
    <div className="px-6">
      <BreadcrumbBar />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm font-mono text-text-muted">Лига не найдена</p>
      </div>
    </div>
  )

  return (
    <div className="px-6">
      <BreadcrumbBar />

      <div className="grid gap-6 pb-8 pt-5" style={{ gridTemplateColumns: '280px 1fr' }}>

        {/* ── LEFT: sticky league card ─────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 242, alignSelf: 'start' }}>
          <LeagueCard data={data} sport={sport} />
        </div>

        {/* ── RIGHT: main content ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">

          <Section id="standings" title={`Таблица · ${data.meta.name ?? 'Лига'}`}>
            <StandingsTable standings={data.standings} sport={sport} />
          </Section>

          <TopScorersSection scorers={data.topScorers} sport={sport} />

          <FixturesSection fixtures={data.fixtures} sport={sport} />

        </div>
      </div>
    </div>
  )
}
