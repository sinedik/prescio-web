'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { sportApi } from '../lib/api'
import type { SportTeam, SportStanding, SportInjury, SportSquadPlayer, TeamFixture, SportTopScorer } from '../types/index'

const RESULT_COLOR = { W: '#61DF6E', D: '#596470', L: '#E55E5B' }
const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 }
const POS_LABEL: Record<string, string> = { G: 'Вратарь', D: 'Защитник', M: 'Полузащитник', F: 'Нападающий' }

const LEAGUE_NAMES: Record<number, string> = {
  39:  'Premier League', 140: 'La Liga',      78:  'Bundesliga',
  135: 'Serie A',        61:  'Ligue 1',       2:   'Champions League',
  3:   'Europa League',  88:  'Eredivisie',    94:  'Primeira Liga',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string) {
  const w = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : (name ?? '--').slice(0, 2).toUpperCase()
}

function TeamLogo({ logo, name, size = 80 }: { logo?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={name} onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain' }} />
  )
  return (
    <div className="flex items-center justify-center rounded-xl border border-bg-border font-bold text-text-muted"
      style={{ width: size, height: size, fontSize: size * 0.22, background: 'rgba(255,255,255,0.04)' }}>
      {abbr(name)}
    </div>
  )
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function Chip({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-xl border border-bg-border bg-bg-surface min-w-[64px]">
      <span className="text-[18px] font-mono font-black leading-none" style={{ color: accent ?? 'rgba(255,255,255,0.85)' }}>
        {value}
      </span>
      <span className="text-[9px] font-mono uppercase tracking-widest text-[#888] mt-1">{label}</span>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-14">
      <div className="px-4 py-3 border-b border-bg-border">
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-[#aaa]">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Section Nav ─────────────────────────────────────────────────────────────
function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id) },
      { threshold: 0.25, rootMargin: '-56px 0px -60% 0px' }
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
            ? { background: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 700 }
            : { background: 'rgba(255,255,255,0.04)', color: '#888' }
          }>
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Recent fixtures ──────────────────────────────────────────────────────────
function FixtureRow({ f }: { f: TeamFixture }) {
  const finished = ['FT','AET','PEN','WO','AWD'].includes(f.status)
  const color = RESULT_COLOR[f.result]
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border/30 last:border-0">
      {/* Result badge */}
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
        style={{ background: color, color: f.result === 'W' ? '#052010' : '#fff' }}>
        {f.result}
      </div>

      {/* Opponent */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {f.opponent_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.opponent_logo} alt="" className="w-5 h-5 object-contain shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full border border-bg-border shrink-0" />
        )}
        <span className="text-[13px] font-semibold truncate text-white">{f.opponent}</span>
        <span className="text-[10px] font-mono text-[#888] shrink-0">{f.is_home ? 'Д' : 'В'}</span>
      </div>

      {/* Score */}
      {finished && f.my_goals != null ? (
        <span className="text-[14px] font-mono font-bold shrink-0 tabular-nums text-white">
          {f.my_goals}:{f.opp_goals}
        </span>
      ) : (
        <span className="text-[11px] font-mono text-[#666] shrink-0">—</span>
      )}

      {/* League + Date */}
      <div className="flex flex-col items-end shrink-0">
        <span className="text-[10px] font-mono text-[#888] truncate max-w-[120px] text-right" title={f.league}>{f.league}</span>
        <span className="text-[9px] font-mono text-[#666]">
          {new Date(f.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  )
}

// ─── Squad section ────────────────────────────────────────────────────────────
function SquadSection({ squad, sport }: { squad: SportSquadPlayer[]; sport: string }) {
  if (!squad.length) return null
  const grouped = squad.reduce<Record<string, SportSquadPlayer[]>>((acc, p) => {
    const pos = p.position ?? 'Unknown'
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(p)
    return acc
  }, {})
  const sorted = Object.entries(grouped).sort(
    ([a], [b]) => (POS_ORDER[a[0]] ?? 9) - (POS_ORDER[b[0]] ?? 9)
  )

  return (
    <Section id="squad" title={`Состав · ${squad.length} игроков`}>
      <div className="flex flex-col">
        {sorted.map(([pos, players]) => (
          <div key={pos}>
            <div className="px-4 py-2 border-b border-bg-border/30 bg-bg-elevated/30">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#888]">
                {POS_LABEL[pos[0]] ?? pos}
              </span>
            </div>
            {players.map(p => (
              <Link key={p.player_id} href={`/sport/${sport}/player/${p.player_id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border/20 last:border-0 hover:bg-white/[0.02] transition-colors">
                <PlayerAvatar name={p.player_name} photo={p.player_photo} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold truncate hover:underline decoration-dotted underline-offset-2">
                    {p.player_name}
                  </span>
                  {p.age && <span className="text-[10px] font-mono text-[#888]">{p.age} лет</span>}
                </div>
                <span className="text-[13px] font-mono font-bold text-[#888] w-7 text-right shrink-0">
                  {p.number != null ? p.number : '—'}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </Section>
  )
}

function PlayerAvatar({ name, photo }: { name: string; photo?: string | null }) {
  const [err, setErr] = useState(false)
  if (photo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name} onError={() => setErr(true)}
      className="w-8 h-8 rounded-full object-cover shrink-0 border border-bg-border" />
  )
  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']
  const color = COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
      style={{ background: `${color}22`, border: `1.5px solid ${color}55`, color }}>
      {abbr(name)}
    </div>
  )
}

// ─── Injuries section ─────────────────────────────────────────────────────────
function InjuriesSection({ injuries }: { injuries: SportInjury[] }) {
  if (!injuries.length) return null
  return (
    <Section id="injuries" title="Травмы и дисквалификации">
      <div className="flex flex-col">
        {injuries.map(inj => (
          <div key={inj.id} className="flex items-center gap-3 px-4 py-3 border-b border-bg-border/20 last:border-0">
            <PlayerAvatar name={inj.player_name ?? '?'} photo={inj.player_photo} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold truncate">{inj.player_name}</span>
              <span className="text-[10px] font-mono text-[#888]">
                {inj.type ?? 'Травма'}{inj.reason ? ` · ${inj.reason}` : ''}
              </span>
            </div>
            {inj.fixture_date && (
              <span className="text-[10px] font-mono text-[#888] shrink-0">
                {new Date(inj.fixture_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Top Scorers ──────────────────────────────────────────────────────────────
function TopScorersSection({ scorers, leagueId, sport }: { scorers: SportTopScorer[]; leagueId?: number | null; sport: string }) {
  const leagueName = leagueId ? LEAGUE_NAMES[leagueId] : null
  if (!scorers.length) {
    if (leagueId && !leagueName) return null // unsupported league, no fallback needed
    return null
  }
  const ACCENT = '#e8c032'
  return (
    <Section id="topscorers" title={leagueName ? `Бомбардиры · ${leagueName}` : 'Бомбардиры лиги'}>
      <div className="flex flex-col">
        {scorers.slice(0, 10).map((s, i) => (
          <Link key={s.player_id} href={`/sport/${sport}/player/${s.player_id}`}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border/20 last:border-0 hover:bg-white/[0.02] transition-colors">
            <span className="text-[13px] font-mono font-bold w-5 text-right shrink-0"
              style={{ color: i < 3 ? ACCENT : 'rgba(255,255,255,0.3)' }}>
              {i + 1}
            </span>
            {s.player_photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.player_photo} alt={s.player_name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-bg-border" />
            ) : (
              <div className="w-7 h-7 rounded-full border border-bg-border shrink-0 bg-bg-elevated" />
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold truncate hover:underline decoration-dotted underline-offset-2">
                {s.player_name}
              </span>
              {s.team_name && (
                <span className="text-[10px] font-mono text-[#888] truncate">{s.team_name}</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[15px] font-mono font-black leading-none" style={{ color: ACCENT }}>{s.goals}</span>
                <span className="text-[8px] font-mono uppercase text-[#888] mt-0.5">гол</span>
              </div>
              {s.assists > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-[13px] font-mono font-bold leading-none text-[#ccc]">{s.assists}</span>
                  <span className="text-[8px] font-mono uppercase text-[#888] mt-0.5">пас</span>
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
export default function TeamPage({ teamId }: { teamId: number }) {
  const router   = useRouter()
  const pathname = usePathname()
  // Extract sport from URL: /sport/football/team/196 → 'football'
  const sport    = pathname.split('/')[2] ?? 'football'

  const [team, setTeam]         = useState<SportTeam | null>(null)
  const [standing, setStanding] = useState<SportStanding | null>(null)
  const [injuries, setInjuries] = useState<SportInjury[]>([])
  const [squad, setSquad]       = useState<SportSquadPlayer[]>([])
  const [fixtures, setFixtures] = useState<TeamFixture[]>([])
  const [topScorers, setTopScorers] = useState<SportTopScorer[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)

  const handleBack = () => {
    if (window.history.length > 1) router.back()
    else router.push('/sport/football')
  }

  useEffect(() => {
    if (!teamId) return
    setLoading(true)
    setLoadError(false)
    Promise.all([
      sportApi.getTeam(teamId),
      sportApi.getTeamFixtures(teamId, 15),
    ]).then(([profile, fixt]) => {
      setTeam(profile.team)
      const mainStanding = profile.standings?.[0] ?? null
      setStanding(mainStanding)
      setInjuries(profile.injuries ?? [])
      setSquad(profile.squad ?? [])
      setFixtures(fixt)
      if (mainStanding?.league_id) {
        sportApi.getTopScorers(mainStanding.league_id).then(setTopScorers).catch(() => {})
      }
    }).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }, [teamId])

  const BackBar = () => (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 flex items-center gap-2 border-b border-bg-border"
      style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)' }}>
      <button onClick={handleBack}
        className="flex items-center gap-1.5 text-[13px] font-mono text-[#888] hover:text-white transition-colors">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Назад
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col max-w-2xl mx-auto px-4">
      <BackBar />
      <div className="flex flex-col gap-4 animate-pulse py-6">
        <div className="h-24 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="h-40 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="h-96 rounded-xl bg-bg-surface border border-bg-border" />
      </div>
    </div>
  )

  if (!team || loadError) return (
    <div className="flex flex-col max-w-2xl mx-auto px-4">
      <BackBar />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm font-mono text-text-muted">{loadError ? 'Ошибка загрузки — попробуйте обновить страницу' : 'Команда не найдена'}</p>
      </div>
    </div>
  )

  const recentForm = fixtures.slice(-5).map(f => f.result)
  const leagueId   = standing?.league_id
  const leagueName = leagueId ? LEAGUE_NAMES[leagueId] : null

  // Section nav — only show sections with content
  const navItems = [
    { id: 'fixtures',    label: 'Матчи',        show: fixtures.length > 0 },
    { id: 'topscorers',  label: 'Бомбардиры',   show: topScorers.length > 0 },
    { id: 'squad',       label: 'Состав',        show: squad.length > 0 },
    { id: 'injuries',    label: 'Травмы',        show: injuries.length > 0 },
  ].filter(n => n.show)

  return (
    <div className="flex flex-col max-w-2xl mx-auto px-4">
      <BackBar />
      <div className="flex flex-col gap-4 pb-8 pt-5">

      {/* ── HERO ── */}
      <div className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-6">
          <TeamLogo logo={team.logo} name={team.name} size={80} />
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-2xl font-bold text-text-primary truncate">{team.name}</h1>
            <div className="flex items-center gap-3 text-[12px] font-mono text-[#999] flex-wrap">
              {team.country && <span>{team.country}</span>}
              {team.founded && <><span className="text-text-muted/20">·</span><span>осн. {team.founded}</span></>}
              {team.venue_name && <><span className="text-text-muted/20">·</span><span className="truncate max-w-[180px]">{team.venue_name}</span></>}
              {team.venue_capacity && <><span className="text-text-muted/20">·</span><span>{team.venue_capacity.toLocaleString()} мест</span></>}
            </div>
            {/* Form dots */}
            {recentForm.length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
                  Последние {recentForm.length}
                </span>
                <div className="flex gap-1.5">
                  {recentForm.map((r, i) => (
                    <div key={i} className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ background: RESULT_COLOR[r], color: r === 'W' ? '#052010' : '#fff' }}>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        {standing && (
          <div className="border-t border-bg-border/50">
            {leagueName && (
              <div className="px-6 pt-3 pb-1">
                <p className="text-[10px] font-mono text-[#888] uppercase tracking-widest">{leagueName}</p>
              </div>
            )}
            {/* Primary stats — horizontal row with dividers */}
            <div className="flex border-b border-bg-border/50">
              {[
                { label: 'Место',  value: standing.rank,   accent: '#e8c032' },
                { label: 'Очки',   value: standing.points, accent: '#e8c032' },
                { label: 'Победы', value: standing.wins,   accent: '#61DF6E' },
                { label: 'Ничьи',  value: standing.draws,  accent: undefined },
                { label: 'Пор.',   value: standing.losses, accent: '#E55E5B' },
              ].map(s => (
                <div key={s.label} className="flex-1 flex flex-col items-center py-3.5 border-r border-bg-border/50 last:border-r-0">
                  <span className="text-[20px] font-mono font-black leading-none"
                    style={{ color: s.accent ?? 'rgba(255,255,255,0.85)' }}>
                    {s.value}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#888] mt-1">{s.label}</span>
                </div>
              ))}
            </div>
            {/* Secondary stats — small chips row */}
            <div className="flex items-center gap-2 px-5 py-2.5">
              {[
                { label: 'И', value: standing.played },
                { label: 'ГЗ', value: standing.goals_for },
                { label: 'ГП', value: standing.goals_against },
                { label: 'GD', value: standing.goal_diff > 0 ? `+${standing.goal_diff}` : standing.goal_diff },
              ].map(s => (
                <span key={s.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#bbb' }}>
                  <span className="text-[#888]">{s.label}</span>
                  <span className="font-bold">{s.value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION NAV ── */}
      {navItems.length > 1 && <SectionNav items={navItems} />}

      {/* ── RECENT FIXTURES ── */}
      {fixtures.length > 0 && (
        <Section id="fixtures" title={`История матчей · последние ${fixtures.length}`}>
          <div className="flex flex-col">
            {[...fixtures].reverse().map(f => <FixtureRow key={f.fixture_id} f={f} />)}
          </div>
        </Section>
      )}

      {/* ── TOP SCORERS ── */}
      <TopScorersSection scorers={topScorers} leagueId={leagueId} sport={sport} />

      {/* ── SQUAD ── */}
      <SquadSection squad={squad} sport={sport} />

      {/* ── INJURIES ── */}
      <InjuriesSection injuries={injuries} />

      </div>
    </div>
  )
}
