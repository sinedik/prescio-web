'use client'
import { useState, useEffect } from 'react'
import { getCached, setCached } from '../lib/clientCache'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { sportApi } from '../lib/api'
import type { PlayerProfile, PlayerStats } from '../types/index'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import type { TranslationKey } from '../lib/i18n'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string) {
  const w = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : (name ?? '--').slice(0, 2).toUpperCase()
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

function nationalityFlag(nat: string): string {
  const map: Record<string, string> = {
    'Brazil': '🇧🇷', 'France': '🇫🇷', 'Spain': '🇪🇸', 'Germany': '🇩🇪',
    'Argentina': '🇦🇷', 'Portugal': '🇵🇹', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Italy': '🇮🇹',
    'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Croatia': '🇭🇷', 'Uruguay': '🇺🇾',
    'Colombia': '🇨🇴', 'Mexico': '🇲🇽', 'Senegal': '🇸🇳', 'Morocco': '🇲🇦',
    'Poland': '🇵🇱', 'Denmark': '🇩🇰', 'Switzerland': '🇨🇭', 'Sweden': '🇸🇪',
    'Norway': '🇳🇴', 'Austria': '🇦🇹', 'Czech Republic': '🇨🇿', 'Serbia': '🇷🇸',
    'Slovakia': '🇸🇰', 'Hungary': '🇭🇺', 'Greece': '🇬🇷', 'Turkey': '🇹🇷',
    'Ghana': '🇬🇭', 'Nigeria': '🇳🇬', "Ivory Coast": '🇨🇮', 'Algeria': '🇩🇿',
    'Egypt': '🇪🇬', 'Cameroon': '🇨🇲', 'Japan': '🇯🇵', 'South Korea': '🇰🇷',
    'Australia': '🇦🇺', 'USA': '🇺🇸', 'United States': '🇺🇸', 'Canada': '🇨🇦',
    'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'Ireland': '🇮🇪', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬', 'Finland': '🇫🇮',
    'Ecuador': '🇪🇨', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Venezuela': '🇻🇪',
    'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Costa Rica': '🇨🇷', 'Panama': '🇵🇦',
    'Saudi Arabia': '🇸🇦', 'Iran': '🇮🇷', 'Qatar': '🇶🇦', 'Mali': '🇲🇱',
    'Burkina Faso': '🇧🇫', 'Guinea': '🇬🇳', 'Tunisia': '🇹🇳', 'Zimbabwe': '🇿🇼',
  }
  return map[nat] ?? ''
}

const POS_KEY: Record<string, TranslationKey> = {
  Goalkeeper: 'team.pos.goalkeeper',
  Defender:   'team.pos.defender',
  Midfielder: 'team.pos.midfielder',
  Attacker:   'team.pos.forward',
  Forward:    'team.pos.forward',
}

// ─── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-bg-border/30 last:border-0">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-mono font-bold" style={{ color: accent ?? 'rgba(var(--surface-tint-rgb),0.9)' }}>
          {value}
        </span>
        {sub && <span className="text-[10px] font-mono text-text-muted">{sub}</span>}
      </div>
    </div>
  )
}

// ─── Rating ring ──────────────────────────────────────────────────────────────
function RatingRing({ rating, accent, size = 72 }: { rating: string | null; accent: string; size?: number }) {
  const { lang } = useLang()
  const t = useT(lang)
  if (!rating) return null
  const val = parseFloat(rating)
  const color = val >= 7.5 ? '#61DF6E' : val >= 6.5 ? accent : '#E55E5B'
  const r = size * 0.39, stroke = size * 0.055
  const circ = 2 * Math.PI * r
  const dash = circ * (val / 10)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(var(--surface-tint-rgb),0.08)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fill={color} fontSize={size * 0.19} fontWeight="800" fontFamily="monospace">
          {rating}
        </text>
      </svg>
      <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted">{t('player.rating')}</span>
    </div>
  )
}

// ─── Player photo ─────────────────────────────────────────────────────────────
function PlayerPhoto({ photo, name, accent, size = 96 }: { photo: string | null; name: string; accent: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (photo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name} loading="eager" onError={() => setErr(true)}
      className="rounded-2xl object-cover shrink-0 border-2"
      style={{ width: size, height: size, borderColor: `color-mix(in srgb, ${accent} 19%, transparent)` }} />
  )
  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']
  const color = COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return (
    <div className="rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0"
      style={{ width: size, height: size, background: `${color}20`, border: `2px solid ${color}40`, color }}>
      {abbr(name)}
    </div>
  )
}

// ─── Left sidebar profile ─────────────────────────────────────────────────────
function ProfileSidebar({ player, mainStat, accent, sport }: {
  player: PlayerProfile
  mainStat: PlayerStats | undefined
  accent: string
  sport: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  const position = mainStat?.games.position ?? ''
  const flag = player.nationality ? nationalityFlag(player.nationality) : ''

  return (
    <div className="flex flex-col gap-4">
      {/* Bio card */}
      <div className="rounded-xl border bg-bg-surface overflow-hidden" style={{ borderColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
        {/* Photo + name */}
        <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-bg-border/50"
          style={{ background: `color-mix(in srgb, ${accent} 4%, transparent)` }}>
          <PlayerPhoto photo={player.photo} name={player.name} accent={accent} size={96} />
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[18px] font-bold text-text-primary leading-tight">{player.name}</h1>
            {position && (
              <span className="px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide"
                style={{ borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`, color: accent, background: `color-mix(in srgb, ${accent} 6%, transparent)` }}>
                {POS_KEY[position] ? t(POS_KEY[position]) : position}
              </span>
            )}
            {mainStat?.team && (
              <Link href={`/sport/${sport}/team/${mainStat.team.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-bg-border hover:border-text-muted/30 hover:text-text-secondary transition-colors text-[12px]">
                {mainStat.team.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainStat.team.logo} alt="" loading="lazy" className="w-4 h-4 object-contain" />
                )}
                <span className="font-medium">{mainStat.team.name}</span>
                <svg className="w-3 h-3 text-text-muted/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </Link>
            )}
          </div>
        </div>

        {/* Physical info */}
        <div className="flex flex-col divide-y divide-bg-border/20 px-4 py-1">
          {player.age && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px] text-text-muted">{t('player.age_field')}</span>
              <span className="text-[13px] font-mono font-semibold text-text-primary">{player.age} {t('player.age_label')}</span>
            </div>
          )}
          {player.nationality && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px] text-text-muted">{t('player.nationality')}</span>
              <span className="text-[13px] font-mono font-semibold text-text-primary">{flag && `${flag} `}{player.nationality}</span>
            </div>
          )}
          {player.height && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px] text-text-muted">{t('player.height')}</span>
              <span className="text-[13px] font-mono font-semibold text-text-primary">{player.height}</span>
            </div>
          )}
          {player.weight && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px] text-text-muted">{t('player.weight')}</span>
              <span className="text-[13px] font-mono font-semibold text-text-primary">{player.weight}</span>
            </div>
          )}
          {player.birth_date && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px] text-text-muted">{t('player.birth_date')}</span>
              <span className="text-[12px] font-mono text-text-primary">
                {new Date(player.birth_date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
          {player.injured && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[12px] text-text-muted">{t('player.status')}</span>
              <span className="text-[12px] font-mono font-bold text-red-400">{t('player.injured')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rating ring card */}
      {mainStat?.games.rating && (
        <div className="rounded-xl border border-bg-border bg-bg-surface px-4 py-5 flex flex-col items-center gap-1">
          <RatingRing rating={mainStat.games.rating} accent={accent} size={80} />
          <p className="text-[10px] font-mono text-text-muted text-center mt-1">
            {t('player.avg_rating')} · {mainStat.league.name}
          </p>
        </div>
      )}

      {/* Season summary */}
      {mainStat && (
        <div className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-bg-border">
            <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-text-secondary">
              {t('sport.season_label')} {mainStat.season}/{String((mainStat.season ?? 0) + 1).slice(-2)}
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-bg-border/50">
            {[
              { label: t('player.games'),   value: mainStat.games.appearances ?? '—' },
              { label: t('player.minutes'), value: mainStat.games.minutes ?? '—' },
              { label: t('player.goals'),   value: mainStat.goals.total ?? '—', accent },
              { label: t('player.assists'), value: mainStat.goals.assists ?? '—', accent },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-3">
                <span className="text-[20px] font-mono font-black leading-none"
                  style={{ color: s.accent ?? 'rgba(var(--surface-tint-rgb),0.8)' }}>
                  {s.value}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stats block for one league season ────────────────────────────────────────
function SeasonBlock({ s, accent }: { s: PlayerStats; accent: string }) {
  const { lang } = useLang()
  const t = useT(lang)
  const isGK  = s.games.position === 'Goalkeeper'
  const apps  = s.games.appearances ?? 0
  const mins  = s.games.minutes ?? 0
  const dribPct = pct(s.dribbles.success, s.dribbles.attempts)
  const duelPct = pct(s.duels.won, s.duels.total)

  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
      {/* League header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border bg-bg-elevated/30">
        {s.league.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.league.logo} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[13px] font-semibold truncate">{s.league.name}</span>
          <span className="text-[10px] font-mono text-text-muted">{s.league.country} · {s.team.name}</span>
        </div>
        <RatingRing rating={s.games.rating} accent={accent} size={52} />
      </div>

      {/* Key numbers — horizontal row with dividers */}
      <div className="flex border-b border-bg-border/50">
        {[
          { label: t('player.games'),   value: apps },
          { label: t('player.minutes'), value: mins },
          ...(isGK
            ? [{ label: t('player.saves'), value: s.goals.saves ?? 0 }, { label: t('player.conceded'), value: s.goals.conceded ?? 0 }]
            : [{ label: t('player.goals'), value: s.goals.total ?? 0 }, { label: t('player.assists'),  value: s.goals.assists ?? 0 }]
          ),
        ].map(c => (
          <div key={c.label} className="flex-1 flex flex-col items-center py-4 border-r border-bg-border/50 last:border-r-0">
            <span className="text-[22px] font-mono font-black leading-none" style={{ color: accent }}>{c.value ?? 0}</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted mt-1 text-center">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Detailed stats — two columns on wide layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-bg-border/30">
        <div className="px-4 py-1">
          {!isGK && <>
            <StatRow label={t('player.shots')} value={s.shots.total} sub={`${s.shots.on} ${t('player.on_target')}`} />
            <StatRow label={t('player.passes')} value={s.passes.total} sub={s.passes.accuracy ? `${s.passes.accuracy}% ${t('player.accuracy')}` : undefined} />
            <StatRow label={t('player.key_passes')} value={s.passes.key} accent={accent} />
            {s.dribbles.attempts > 0 && (
              <StatRow label={t('player.dribbles')} value={`${dribPct}%`} sub={`${s.dribbles.success}/${s.dribbles.attempts}`} />
            )}
          </>}
          {isGK && <>
            <StatRow label={t('player.intercepts')} value={s.tackles.total} />
            <StatRow label={t('player.blocks')} value={s.tackles.blocks} />
          </>}
        </div>
        <div className="px-4 py-1">
          {!isGK && <>
            <StatRow label={t('player.duels')} value={`${duelPct}%`} sub={`${s.duels.won}/${s.duels.total}`} />
            {s.tackles.interceptions > 0 && <StatRow label={t('player.interceptions')} value={s.tackles.interceptions} />}
            {s.tackles.blocks > 0 && <StatRow label={t('player.blocks')} value={s.tackles.blocks} />}
            <StatRow label={t('player.fouls')} value={`${s.fouls.committed} / ${s.fouls.drawn}`} />
            {s.penalty.scored + s.penalty.missed > 0 && (
              <StatRow label={t('player.penalties')} value={`${s.penalty.scored}/${s.penalty.scored + s.penalty.missed}`} sub={t('player.scored')} />
            )}
          </>}
          {(s.cards.yellow > 0 || s.cards.red > 0) && (
            <StatRow
              label={s.cards.red > 0 ? t('player.yellow_red') : t('player.yellow_cards')}
              value={s.cards.red > 0 ? `${s.cards.yellow} / ${s.cards.red}` : s.cards.yellow}
              accent={s.cards.red > 0 ? '#ef4444' : s.cards.yellow > 2 ? '#f97316' : undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function PlayerSkeleton() {
  return (
    <div className="grid gap-4 md:gap-6 pb-8 pt-5 animate-pulse grid-cols-1 md:grid-cols-[280px,1fr]">
      <div className="flex flex-col gap-4">
        <div className="h-80 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="h-28 rounded-xl bg-bg-surface border border-bg-border" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-64 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="h-64 rounded-xl bg-bg-surface border border-bg-border" />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PlayerPage({ playerId, initialData }: { playerId: number; initialData?: PlayerProfile }) {
  const router   = useRouter()
  const pathname = usePathname()
  const sport    = pathname.split('/')[2] ?? 'football'
  const { lang } = useLang()
  const t = useT(lang)
  if (initialData && !getCached<PlayerProfile>(`player:${playerId}`)) {
    setCached(`player:${playerId}`, initialData)
  }
  const [player, setPlayer]     = useState<PlayerProfile | null>(() => getCached<PlayerProfile>(`player:${playerId}`))
  const [loading, setLoading]   = useState(() => !getCached<PlayerProfile>(`player:${playerId}`))
  const [notFound, setNotFound] = useState(false)

  const handleBack = () => {
    if (window.history.length > 1) router.back()
    else router.push(`/sport/${sport}`)
  }

  useEffect(() => {
    if (!playerId) return
    const key = `player:${playerId}`
    const cached = getCached<PlayerProfile>(key)
    if (!cached) { setLoading(true); setNotFound(false) }

    sportApi.getPlayer(playerId)
      .then(d => { setPlayer(d); setCached(key, d) })
      .catch(() => { if (!cached) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [playerId])

  const SKIP_KEYWORDS = ['friendly', 'friendlies', 'pre-season', 'preseason', 'super cup', 'supercup', 'club world cup', 'uefa super cup']

  const position = player?.statistics[0]?.games.position ?? ''
  const accent = position === 'Goalkeeper' ? 'rgb(var(--player-pos-gk))'
    : position === 'Defender'   ? 'rgb(var(--player-pos-def))'
    : position === 'Midfielder' ? 'rgb(var(--player-pos-mid))'
    : 'rgb(var(--player-pos-fwd))'

  const filteredStats = player?.statistics.filter(s => {
    const name = (s.league.name ?? '').toLowerCase()
    return !SKIP_KEYWORDS.some(k => name.includes(k))
  }) ?? []
  const stats = filteredStats.length > 0 ? filteredStats : (player?.statistics ?? [])
  const mainStat = stats[0]

  // ── Breadcrumb bar ──────────────────────────────────────────────────────────
  const BreadcrumbBar = () => (
    <div className="sport-sticky-header sticky z-20 py-2.5 flex items-center gap-2 border-b border-bg-border"
      style={{ background: 'rgba(var(--bg-base-rgb), 0.92)', backdropFilter: 'blur(12px)' }}>
      <button onClick={handleBack}
        className="flex items-center gap-1.5 text-[13px] font-mono text-text-muted hover:text-text-primary transition-colors shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {t('sport.back')}
      </button>
      {(mainStat?.team.name || player?.name) && (
        <>
          {mainStat?.team.name && (
            <>
              <span className="text-text-muted/40 text-[12px]">/</span>
              <Link href={`/sport/${sport}/team/${mainStat.team.id}`}
                className="text-[12px] font-mono text-text-muted hover:text-text-secondary transition-colors truncate">
                {mainStat.team.name}
              </Link>
            </>
          )}
          {player?.name && (
            <>
              <span className="text-text-muted/40 text-[12px]">/</span>
              <span className="text-[12px] font-mono text-text-primary truncate">{player.name}</span>
            </>
          )}
        </>
      )}
    </div>
  )

  if (loading) return (
    <div className="px-3 sm:px-4 md:px-6">
      <BreadcrumbBar />
      <PlayerSkeleton />
    </div>
  )

  if (notFound || !player) return (
    <div className="px-3 sm:px-4 md:px-6">
      <BreadcrumbBar />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm font-mono text-text-muted">{t('sport.player_not_found')}</p>
      </div>
    </div>
  )

  return (
    <div className="px-3 sm:px-4 md:px-6">
      <BreadcrumbBar />

      <div className="grid gap-4 md:gap-6 pb-8 pt-5 grid-cols-1 md:grid-cols-[280px,1fr]">

        {/* ── LEFT: sticky profile sidebar ────────────────────────────────── */}
        <div className="md:sticky md:self-start" style={{ top: 242 }}>
          <ProfileSidebar player={player} mainStat={mainStat} accent={accent} sport={sport} />
        </div>

        {/* ── RIGHT: season stats ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">
          {stats.length > 0 ? (
            <>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                  {t('player.season_stats')} · {mainStat?.season}/{String((mainStat?.season ?? 0) + 1).slice(-2)}
                </span>
                <div className="flex-1 h-px bg-bg-border" />
                <span className="text-[10px] font-mono text-text-muted">{stats.length} {stats.length === 1 ? t('player.tournament_1') : t('player.tournament_n')}</span>
              </div>
              {stats.map((s, i) => (
                <SeasonBlock key={i} s={s} accent={accent} />
              ))}
            </>
          ) : (
            <div className="rounded-xl border border-bg-border bg-bg-surface px-4 py-12 flex flex-col items-center gap-2">
              <p className="text-[13px] font-mono text-text-muted/50">{t('sport.no_season_data')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
