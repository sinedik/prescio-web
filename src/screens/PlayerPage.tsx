'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { sportApi } from '../lib/api'
import type { PlayerProfile, PlayerStats } from '../types/index'

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

// ─── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-bg-border/30 last:border-0">
      <span className="text-[13px] text-[#bbb]">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-mono font-bold" style={{ color: accent ?? 'rgba(255,255,255,0.9)' }}>
          {value}
        </span>
        {sub && <span className="text-[10px] font-mono text-[#888]">{sub}</span>}
      </div>
    </div>
  )
}

// ─── Rating ring ──────────────────────────────────────────────────────────────
function RatingRing({ rating, accent, size = 72 }: { rating: string | null; accent: string; size?: number }) {
  if (!rating) return null
  const val = parseFloat(rating)
  const color = val >= 7.5 ? '#61DF6E' : val >= 6.5 ? accent : '#E55E5B'
  const r = size * 0.39, stroke = size * 0.055
  const circ = 2 * Math.PI * r
  const dash = circ * (val / 10)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fill={color} fontSize={size * 0.19} fontWeight="800" fontFamily="monospace">
          {rating}
        </text>
      </svg>
      <span className="text-[9px] font-mono uppercase tracking-widest text-[#888]">Рейтинг</span>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-bg-border">
        <span className="text-[11px] font-mono font-bold tracking-[0.12em] uppercase text-[#aaa]">{title}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

// ─── Stats block for one league season ────────────────────────────────────────
function SeasonBlock({ s, accent }: { s: PlayerStats; accent: string }) {
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
          <img src={s.league.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[13px] font-semibold truncate">{s.league.name}</span>
          <span className="text-[10px] font-mono text-[#888]">{s.league.country} · {s.team.name}</span>
        </div>
        <RatingRing rating={s.games.rating} accent={accent} />
      </div>

      <div className="px-4 py-1">
        {/* Key numbers — horizontal row with dividers */}
        <div className="flex border-b border-bg-border/50">
          {[
            { label: 'Игры',    value: apps },
            { label: 'Минуты', value: mins },
            ...(isGK
              ? [{ label: 'Сейвы', value: s.goals.saves ?? 0 }, { label: 'Пропущено', value: s.goals.conceded ?? 0 }]
              : [{ label: 'Голы',  value: s.goals.total ?? 0 }, { label: 'Ассисты', value: s.goals.assists ?? 0 }]
            ),
          ].map(c => (
            <div key={c.label} className="flex-1 flex flex-col items-center py-4 border-r border-bg-border/50 last:border-r-0">
              <span className="text-[22px] font-mono font-black leading-none" style={{ color: accent }}>{c.value ?? 0}</span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#888] mt-1">{c.label}</span>
            </div>
          ))}
        </div>

        {/* Detailed stats */}
        {!isGK && <>
          <StatRow label="Удары" value={s.shots.total} sub={`${s.shots.on} в цель`} />
          <StatRow label="Пасы" value={s.passes.total} sub={s.passes.accuracy ? `${s.passes.accuracy}% точность` : undefined} />
          <StatRow label="Ключевые пасы" value={s.passes.key} accent={accent} />
          <StatRow label="Единоборства выиграно" value={`${duelPct}%`} sub={`${s.duels.won}/${s.duels.total}`} />
          {s.dribbles.attempts > 0 && (
            <StatRow label="Дриблинг" value={`${dribPct}%`} sub={`${s.dribbles.success}/${s.dribbles.attempts}`} />
          )}
          {s.tackles.interceptions > 0 && <StatRow label="Перехваты" value={s.tackles.interceptions} />}
          {s.tackles.blocks > 0 && <StatRow label="Блоки" value={s.tackles.blocks} />}
          <StatRow label="Фолы совершено / заработано" value={`${s.fouls.committed} / ${s.fouls.drawn}`} />
          {s.penalty.scored + s.penalty.missed > 0 && (
            <StatRow label="Пенальти" value={`${s.penalty.scored}/${s.penalty.scored + s.penalty.missed}`} sub="реализовано" />
          )}
        </>}
        {isGK && <>
          <StatRow label="Выходы на перехват" value={s.tackles.total} />
          <StatRow label="Блоки" value={s.tackles.blocks} />
        </>}
        {(s.cards.yellow > 0 || s.cards.red > 0) && (
          <StatRow
            label={s.cards.red > 0 ? 'Жёлтые / красные' : 'Жёлтые карточки'}
            value={s.cards.red > 0 ? `${s.cards.yellow} / ${s.cards.red}` : s.cards.yellow}
            accent={s.cards.red > 0 ? '#ef4444' : s.cards.yellow > 2 ? '#f97316' : undefined}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PlayerPage({ playerId }: { playerId: number }) {
  const router   = useRouter()
  const pathname = usePathname()
  const sport    = pathname.split('/')[2] ?? 'football'
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const handleBack = () => {
    if (window.history.length > 1) router.back()
    else router.push('/sport/football')
  }

  useEffect(() => {
    if (!playerId) return
    setLoading(true)
    sportApi.getPlayer(playerId)
      .then(setPlayer)
      .catch(() => { setNotFound(true); setFetchError(false) })
      .finally(() => setLoading(false))
  }, [playerId])

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
        <div className="h-32 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="h-64 rounded-xl bg-bg-surface border border-bg-border" />
      </div>
    </div>
  )

  if (notFound || !player) return (
    <div className="flex flex-col max-w-2xl mx-auto px-4">
      <BackBar />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm font-mono text-text-muted">Игрок не найден</p>
      </div>
    </div>
  )

  // Determine accent by position of first stat
  const position = player.statistics[0]?.games.position ?? ''
  const accent = position === 'Goalkeeper' ? '#4A9EEA'
    : position === 'Defender'   ? '#61DF6E'
    : position === 'Midfielder' ? '#e8c032'
    : '#E55E5B'

  // Filter out pre-season, friendlies, and one-off cups — keep leagues and official competitions
  const SKIP_KEYWORDS = ['friendly', 'friendlies', 'pre-season', 'preseason', 'super cup', 'supercup', 'club world cup', 'uefa super cup']
  const filteredStats = player.statistics.filter(s => {
    const name = (s.league.name ?? '').toLowerCase()
    return !SKIP_KEYWORDS.some(k => name.includes(k))
  })
  const stats = filteredStats.length > 0 ? filteredStats : player.statistics

  const mainStat = stats[0]
  const flag = player.nationality ? nationalityFlag(player.nationality) : ''

  return (
    <div className="flex flex-col max-w-2xl mx-auto px-4">
      <BackBar />
      <div className="flex flex-col gap-4 pb-8 pt-5">

      {/* ── HERO ── */}
      <div className="rounded-xl border bg-bg-surface overflow-hidden" style={{ borderColor: `${accent}30` }}>
        <div className="flex items-start gap-5 px-6 py-6">
          {/* Photo */}
          <PlayerPhoto photo={player.photo} name={player.name} accent={accent} />

          {/* Info */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <h1 className="text-[22px] font-bold text-text-primary leading-tight">{player.name}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[12px] text-[#aaa]">
              {position && (
                <span className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide"
                  style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}>
                  {translatePosition(position)}
                </span>
              )}
              {mainStat?.team && (
                <Link href={`/sport/${sport}/team/${mainStat.team.id}`}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-bg-border hover:border-text-muted/30 hover:text-text-secondary transition-colors">
                  {mainStat.team.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mainStat.team.logo} alt="" className="w-4 h-4 object-contain" />
                  )}
                  <span>{mainStat.team.name}</span>
                  <svg className="w-3 h-3 text-text-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-mono text-[#888] mt-0.5">
              {player.age && <span>{player.age} лет</span>}
              {player.nationality && <span>{flag && `${flag} `}{player.nationality}</span>}
              {player.height && <span>{player.height}</span>}
              {player.weight && <span>{player.weight}</span>}
              {player.birth_date && (
                <span>{new Date(player.birth_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
              {player.injured && (
                <span className="text-red-400 font-bold">Травмирован</span>
              )}
            </div>
          </div>

          {/* Rating in hero */}
          {mainStat?.games.rating && (
            <div className="shrink-0 mt-1">
              <RatingRing rating={mainStat.games.rating} accent={accent} size={60} />
            </div>
          )}
        </div>

        {/* ── Key stats bar ── */}
        {mainStat && (
          <div className="flex border-t border-bg-border/50">
            {[
              { label: 'Матчей',   value: mainStat.games.appearances ?? '—' },
              { label: 'Голов',    value: mainStat.goals.total ?? '—' },
              { label: 'Ассистов', value: mainStat.goals.assists ?? '—' },
              ...(mainStat.games.minutes ? [{ label: 'Минут', value: mainStat.games.minutes }] : []),
            ].map((stat, i) => (
              <div key={stat.label} className="flex-1 flex flex-col items-center py-3.5 border-r border-bg-border/50 last:border-r-0">
                <span className="text-[20px] font-mono font-black leading-none" style={{ color: accent }}>
                  {stat.value}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#888] mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SEASON STATS ── */}
      {stats.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#888] px-1">
            Статистика сезона · {mainStat?.season}/{String((mainStat?.season ?? 0) + 1).slice(-2)}
          </p>
          {stats.map((s, i) => (
            <SeasonBlock key={i} s={s} accent={accent} />
          ))}
        </div>
      )}

      {stats.length === 0 && (
        <Section title="Статистика">
          <div className="py-8 text-center flex flex-col gap-2">
            <p className="text-[13px] font-mono text-text-muted/50">Нет данных за текущий сезон</p>
            <p className="text-[11px] font-mono text-text-muted/30">Данные обновляются ежедневно</p>
          </div>
        </Section>
      )}

      {fetchError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] font-mono text-red-400/70">
          Не удалось загрузить данные — попробуйте обновить страницу
        </div>
      )}

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlayerPhoto({ photo, name, accent }: { photo: string | null; name: string; accent: string }) {
  const [err, setErr] = useState(false)
  if (photo && !err) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name} onError={() => setErr(true)}
      className="w-20 h-20 rounded-2xl object-cover shrink-0 border-2"
      style={{ borderColor: `${accent}30` }} />
  )
  const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']
  const color = COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return (
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0"
      style={{ background: `${color}20`, border: `2px solid ${color}40`, color }}>
      {abbr(name)}
    </div>
  )
}

function translatePosition(pos: string) {
  const map: Record<string, string> = {
    Goalkeeper: 'Вратарь', Defender: 'Защитник',
    Midfielder: 'Полузащитник', Attacker: 'Нападающий', Forward: 'Нападающий',
  }
  return map[pos] ?? pos
}
