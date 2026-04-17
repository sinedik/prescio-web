'use client'
import { useState, useEffect, useMemo } from 'react'
import { getCached, setCached } from '../lib/clientCache'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { sportApi } from '../lib/api'
import type { SportTeam, SportStanding, SportInjury, SportSquadPlayer, TeamFixture, SportTopScorer } from '../types/index'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

const RESULT_COLOR = { W: '#61DF6E', D: '#596470', L: '#E55E5B' }
const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 }

const LEAGUE_NAMES: Record<number, string> = {
  39:  'Premier League', 140: 'La Liga',      78:  'Bundesliga',
  135: 'Serie A',        61:  'Ligue 1',       2:   'Champions League',
  3:   'Europa League',  88:  'Eredivisie',    94:  'Primeira Liga',
}

const ACCENT = 'rgb(var(--sport-football-rgb))'
const ACCENT_MIX = (pct: number) => `color-mix(in srgb, ${ACCENT} ${pct}%, transparent)`

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string) {
  const w = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : (name ?? '--').slice(0, 2).toUpperCase()
}

function TeamLogo({ logo, name, size = 80 }: { logo?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={name} loading="lazy" onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain' }} />
  )
  return (
    <div className="flex items-center justify-center rounded-xl border border-bg-border font-bold text-text-muted"
      style={{ width: size, height: size, fontSize: size * 0.22, background: 'rgba(var(--surface-tint-rgb),0.04)' }}>
      {abbr(name)}
    </div>
  )
}

function PlayerAvatar({ name, photo }: { name: string; photo?: string | null }) {
  const [err, setErr] = useState(false)
  if (photo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name} loading="lazy" onError={() => setErr(true)}
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

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden scroll-mt-[284px]">
      <div className="px-4 py-3 border-b border-bg-border">
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-text-secondary">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Section Nav ─────────────────────────────────────────────────────────────
function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const el = document.getElementById('team-scroll-root')
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id) },
      { threshold: 0.25, rootMargin: '-284px 0px -60% 0px' }
    )
    items.forEach(({ id }) => { const target = document.getElementById(id); if (target) observer.observe(target) })
    return () => observer.disconnect()
  }, [items])

  const scroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <div className="sticky top-[242px] z-10 rounded-xl border border-bg-border overflow-hidden"
      style={{ background: 'rgba(var(--bg-base-rgb), 0.94)', backdropFilter: 'blur(12px)' }}>
      <div className="px-3 py-2 flex gap-1 overflow-x-auto">
        {items.map(({ id, label }) => (
          <button key={id} onClick={() => scroll(id)}
            className="px-3 py-1.5 rounded-full text-[11px] font-mono whitespace-nowrap transition-all shrink-0"
            style={active === id
              ? { background: ACCENT_MIX(10), color: ACCENT, fontWeight: 700, border: `1px solid ${ACCENT_MIX(20)}` }
              : { background: 'rgba(var(--surface-tint-rgb), 0.04)', color: 'rgb(var(--text-muted))', border: '1px solid transparent' }
            }>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Recent fixtures ──────────────────────────────────────────────────────────
function FixtureRow({ f }: { f: TeamFixture }) {
  const { lang } = useLang()
  const t = useT(lang)
  const finished = ['FT','AET','PEN','WO','AWD'].includes(f.status)
  const color = RESULT_COLOR[f.result]
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border/30 last:border-0 hover:bg-text-primary/[0.02] transition-colors">
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
        style={{ background: color, color: f.result === 'W' ? '#052010' : '#fff' }}>
        {f.result}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {f.opponent_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.opponent_logo} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full border border-bg-border shrink-0" />
        )}
        <span className="text-[13px] font-semibold truncate text-text-primary">{f.opponent}</span>
        <span className="text-[10px] font-mono shrink-0"
          style={{ color: f.is_home ? ACCENT : '#888' }}>{f.is_home ? t('team.home_abbr') : t('team.away_abbr')}</span>
      </div>
      {finished && f.my_goals != null ? (
        <span className="text-[14px] font-mono font-bold shrink-0 tabular-nums text-text-primary">
          {f.my_goals}:{f.opp_goals}
        </span>
      ) : (
        <span className="text-[11px] font-mono text-text-muted shrink-0">—</span>
      )}
      <div className="flex flex-col items-end shrink-0">
        <span className="text-[10px] font-mono text-text-muted truncate max-w-[120px] text-right" title={f.league}>{f.league}</span>
        <span className="text-[9px] font-mono text-text-muted">
          {new Date(f.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  )
}

// ─── Squad section ────────────────────────────────────────────────────────────
function SquadSection({ squad, sport }: { squad: SportSquadPlayer[]; sport: string }) {
  const { lang } = useLang()
  const t = useT(lang)
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
  const posLabel = (pos: string) => {
    const map: Record<string, () => string> = {
      G: () => t('team.pos.goalkeeper'),
      D: () => t('team.pos.defender'),
      M: () => t('team.pos.midfielder'),
      F: () => t('team.pos.forward'),
    }
    return map[pos[0]]?.() ?? pos
  }

  return (
    <Section id="squad" title={lang === 'ru' ? `Состав · ${squad.length} игроков` : `Squad · ${squad.length} players`}>
      <div className="flex flex-col">
        {sorted.map(([pos, players]) => (
          <div key={pos}>
            <div className="px-4 py-2 border-b border-bg-border/30 bg-bg-elevated/30">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                {posLabel(pos)} · {players.length}
              </span>
            </div>
            {/* Two-column grid for squad players */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-bg-border/20">
              {players.map(p => (
                <Link key={p.player_id} href={`/sport/${sport}/player/${p.player_id}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border/20 hover:bg-text-primary/[0.02] transition-colors">
                  <PlayerAvatar name={p.player_name} photo={p.player_photo} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-semibold truncate hover:underline decoration-dotted underline-offset-2">
                      {p.player_name}
                    </span>
                    {p.age && <span className="text-[10px] font-mono text-text-muted">{p.age} {t('player.age_label')}</span>}
                  </div>
                  <span className="text-[13px] font-mono font-bold text-text-muted w-7 text-right shrink-0">
                    {p.number != null ? p.number : '—'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Injuries section ─────────────────────────────────────────────────────────
function InjuriesSection({ injuries }: { injuries: SportInjury[] }) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!injuries.length) return null
  return (
    <Section id="injuries" title={t('sport.title.injuries')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-bg-border">
        {injuries.slice(0, 8).map(inj => (
          <div key={inj.id} className="flex items-center gap-3 px-4 py-3 border-b border-bg-border/20">
            <PlayerAvatar name={inj.player_name ?? '?'} photo={inj.player_photo} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold truncate">{inj.player_name}</span>
              <span className="text-[10px] font-mono text-text-muted">
                {inj.type ?? t('team.injury_default')}{inj.reason ? ` · ${inj.reason}` : ''}
              </span>
            </div>
            {inj.fixture_date && (
              <span className="text-[10px] font-mono text-text-muted shrink-0">
                {new Date(inj.fixture_date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })}
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
  const { lang } = useLang()
  const t = useT(lang)
  const leagueName = leagueId ? LEAGUE_NAMES[leagueId] : null
  if (!scorers.length) return null
  const sectionTitle = leagueName
    ? (lang === 'ru' ? `Бомбардиры · ${leagueName}` : `Top scorers · ${leagueName}`)
    : t('team.scorers_league')
  return (
    <Section id="topscorers" title={sectionTitle}>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-bg-border">
        {scorers.slice(0, 10).map((s, i) => (
          <Link key={s.player_id} href={`/sport/${sport}/player/${s.player_id}`}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border/20 hover:bg-text-primary/[0.02] transition-colors">
            <span className="text-[13px] font-mono font-bold w-5 text-right shrink-0"
              style={{ color: i < 3 ? ACCENT : 'rgba(var(--surface-tint-rgb),0.3)' }}>
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
                <span className="text-[10px] font-mono text-text-muted truncate">{s.team_name}</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[15px] font-mono font-black leading-none" style={{ color: ACCENT }}>{s.goals}</span>
                <span className="text-[8px] font-mono uppercase text-text-muted mt-0.5">{t('team.goal_abbr')}</span>
              </div>
              {s.assists > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-[13px] font-mono font-bold leading-none text-text-secondary">{s.assists}</span>
                  <span className="text-[8px] font-mono uppercase text-text-muted mt-0.5">{t('team.assist_abbr')}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  )
}

// ─── Left sidebar profile card ────────────────────────────────────────────────
function ProfileCard({ team, standing, recentForm, leagueName }: {
  team: SportTeam
  standing: SportStanding | null
  recentForm: ('W'|'D'|'L')[]
  leagueName: string | null
}) {
  const { lang } = useLang()
  const t = useT(lang)
  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
      {/* Logo + name */}
      <div className="flex flex-col items-center gap-3 px-6 py-6 border-b border-bg-border/50"
        style={{ background: ACCENT_MIX(4) }}>
        <TeamLogo logo={team.logo} name={team.name} size={96} />
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-[20px] font-bold text-text-primary leading-tight">{team.name}</h1>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-text-muted">
            {team.country && <span>{team.country}</span>}
            {team.founded && <><span className="text-text-muted/35">·</span><span>{t('sport.founded')} {team.founded}</span></>}
          </div>
          {team.venue_name && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-text-muted">
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              <span className="truncate">{team.venue_name}{team.venue_capacity ? ` · ${team.venue_capacity.toLocaleString()}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      {recentForm.length > 0 && (
        <div className="flex flex-col items-center gap-2 px-6 py-4 border-b border-bg-border/50">
          <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{t('team.recent')} {recentForm.length}</span>
          <div className="flex gap-1.5">
            {recentForm.map((r, i) => (
              <div key={i} className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: RESULT_COLOR[r], color: r === 'W' ? '#052010' : '#fff' }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standing */}
      {standing && (
        <div className="flex flex-col">
          {leagueName && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">{leagueName}</p>
            </div>
          )}
          {/* Primary stats grid */}
          <div className="grid grid-cols-3 border-b border-bg-border/50">
            {[
              { label: t('team.rank'),   value: standing.rank,   accent: ACCENT },
              { label: t('team.points'), value: standing.points, accent: ACCENT },
              { label: t('team.wins'),   value: standing.wins,   accent: '#61DF6E' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-3 border-r border-bg-border/50 last:border-r-0">
                <span className="text-[20px] font-mono font-black leading-none" style={{ color: s.accent }}>
                  {s.value}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted mt-1">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 border-b border-bg-border/50">
            {[
              { label: t('team.draws_abbr'),   value: standing.draws },
              { label: t('team.losses_abbr'),  value: standing.losses,        accent: '#E55E5B' },
              { label: t('team.goals_for'),     value: standing.goals_for },
              { label: t('team.goals_against'), value: standing.goals_against },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-2.5 border-r border-bg-border/50 last:border-r-0">
                <span className="text-[15px] font-mono font-black leading-none"
                  style={{ color: s.accent ?? 'rgba(var(--surface-tint-rgb),0.6)' }}>
                  {s.value}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-[10px] font-mono text-text-muted">{t('sport.th.played')} {standing.played}</span>
            <span className="text-text-muted/35 text-[10px]">·</span>
            <span className="text-[10px] font-mono"
              style={{ color: standing.goal_diff > 0 ? '#61DF6E' : standing.goal_diff < 0 ? '#E55E5B' : '#888' }}>
              GD {standing.goal_diff > 0 ? '+' : ''}{standing.goal_diff}
            </span>
            {standing.form && (
              <>
                <span className="text-text-muted/35 text-[10px]">·</span>
                <span className="text-[10px] font-mono text-text-muted">{t('sport.th.form')} {standing.form}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function TeamSkeleton() {
  return (
    <div className="grid gap-4 md:gap-6 pb-8 pt-5 animate-pulse grid-cols-1 md:grid-cols-[300px,1fr]">
      <div className="flex flex-col gap-4">
        <div className="h-72 rounded-xl bg-bg-surface border border-bg-border" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-10 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="h-48 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="h-96 rounded-xl bg-bg-surface border border-bg-border" />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type TeamCacheData = { team: SportTeam|null; standing: SportStanding|null; injuries: SportInjury[]; squad: SportSquadPlayer[]; fixtures: TeamFixture[] }

export default function TeamPage({ teamId, initialData }: { teamId: number; initialData?: TeamCacheData }) {
  const router   = useRouter()
  const pathname = usePathname()
  const sport    = pathname.split('/')[2] ?? 'football'
  const { lang } = useLang()
  const t = useT(lang)

  if (initialData && !getCached<TeamCacheData>(`team:${teamId}`)) {
    setCached(`team:${teamId}`, initialData)
  }
  const _tc = useMemo(() => getCached<TeamCacheData>(`team:${teamId}`), [teamId])

  const [team, setTeam]             = useState<SportTeam | null>(_tc?.team ?? null)
  const [standing, setStanding]     = useState<SportStanding | null>(_tc?.standing ?? null)
  const [injuries, setInjuries]     = useState<SportInjury[]>(_tc?.injuries ?? [])
  const [squad, setSquad]           = useState<SportSquadPlayer[]>(_tc?.squad ?? [])
  const [fixtures, setFixtures]     = useState<TeamFixture[]>(_tc?.fixtures ?? [])
  const [topScorers, setTopScorers] = useState<SportTopScorer[]>([])
  const [loading, setLoading]       = useState(!_tc)
  const [loadError, setLoadError]   = useState(false)

  const handleBack = () => {
    if (window.history.length > 1) router.back()
    else router.push(`/sport/${sport}`)
  }

  useEffect(() => {
    if (!teamId) return
    const key = `team:${teamId}`
    const cached = getCached<TeamCacheData>(key)
    if (!cached) { setLoading(true); setLoadError(false) }

    Promise.all([
      sportApi.getTeam(teamId),
      sportApi.getTeamFixtures(teamId, 15),
    ]).then(([profile, fixt]) => {
      const mainStanding = profile.standings?.[0] ?? null
      setTeam(profile.team)
      setStanding(mainStanding)
      setInjuries(profile.injuries ?? [])
      setSquad(profile.squad ?? [])
      setFixtures(fixt)
      setCached(key, { team: profile.team, standing: mainStanding, injuries: profile.injuries ?? [], squad: profile.squad ?? [], fixtures: fixt })
      if (mainStanding?.league_id) {
        sportApi.getTopScorers(mainStanding.league_id).then(setTopScorers).catch(() => {})
      }
    }).catch(() => { if (!cached) setLoadError(true) })
      .finally(() => setLoading(false))
  }, [teamId])

  const recentForm = fixtures.slice(-5).map(f => f.result)
  const leagueId   = standing?.league_id
  const leagueName = leagueId ? LEAGUE_NAMES[leagueId] : null

  const navItems = [
    { id: 'fixtures',   label: t('team.nav.fixtures'),      show: fixtures.length > 0 },
    { id: 'topscorers', label: t('sport.section.scorers'),  show: topScorers.length > 0 },
    { id: 'squad',      label: t('sport.section.squad'),    show: squad.length > 0 },
    { id: 'injuries',   label: t('sport.section.injuries'), show: injuries.length > 0 },
  ].filter(n => n.show)

  // ── Breadcrumb bar ──────────────────────────────────────────────────────────
  const BreadcrumbBar = () => (
    <div className="sport-sticky-header sticky z-20 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-2.5 flex items-center gap-2 border-b border-bg-border"
      style={{ background: 'rgba(var(--bg-base-rgb), 0.92)', backdropFilter: 'blur(12px)' }}>
      <button onClick={handleBack}
        className="flex items-center gap-1.5 text-[13px] font-mono text-text-muted hover:text-text-primary transition-colors shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {t('sport.back')}
      </button>
      {(leagueName || team?.name) && (
        <>
          <span className="text-text-muted/40 text-[12px]">/</span>
          {leagueName && leagueId
            ? <Link href={`/sport/${sport}/league/${leagueId}`} className="text-[12px] font-mono text-text-muted hover:text-text-secondary transition-colors truncate">{leagueName}</Link>
            : leagueName && <span className="text-[12px] font-mono text-text-muted truncate">{leagueName}</span>
          }
          {team?.name && leagueName && <span className="text-text-muted/40 text-[12px]">/</span>}
          {team?.name && <span className="text-[12px] font-mono text-text-primary truncate">{team.name}</span>}
        </>
      )}
    </div>
  )

  if (loading) return (
    <div className="px-3 sm:px-4 md:px-6" id="team-scroll-root">
      <BreadcrumbBar />
      <TeamSkeleton />
    </div>
  )

  if (!team || loadError) return (
    <div className="px-3 sm:px-4 md:px-6" id="team-scroll-root">
      <BreadcrumbBar />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm font-mono text-text-muted">
          {loadError ? t('sport.team_load_error') : t('sport.team_not_found')}
        </p>
      </div>
    </div>
  )

  return (
    <div className="px-3 sm:px-4 md:px-6" id="team-scroll-root">
      <BreadcrumbBar />

      <div className="grid gap-4 md:gap-6 pb-8 pt-5 grid-cols-1 md:grid-cols-[300px,1fr]">

        {/* ── LEFT: sticky profile ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 md:sticky md:self-start" style={{ top: 242 }}>
          <ProfileCard
            team={team}
            standing={standing}
            recentForm={recentForm}
            leagueName={leagueName}
          />
        </div>

        {/* ── RIGHT: main content ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">

          {navItems.length > 1 && <SectionNav items={navItems} />}

          {fixtures.length > 0 && (
            <Section id="fixtures" title={lang === 'ru' ? `История матчей · последние ${fixtures.length}` : `Match history · last ${fixtures.length}`}>
              <div className="flex flex-col">
                {[...fixtures].reverse().map(f => <FixtureRow key={f.fixture_id} f={f} />)}
              </div>
            </Section>
          )}

          <TopScorersSection scorers={topScorers} leagueId={leagueId} sport={sport} />

          <SquadSection squad={squad} sport={sport} />

          <InjuriesSection injuries={injuries} />

        </div>
      </div>
    </div>
  )
}
