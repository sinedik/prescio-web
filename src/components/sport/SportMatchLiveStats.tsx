'use client'
import type { SportFixtureStat } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'

interface Props {
  stats: SportFixtureStat[]
  homeTeam: string
  awayTeam: string
}

function parseVal(v: string | number | null | undefined): number {
  return parseFloat(String(v ?? '0').replace('%', '')) || 0
}

const STAT_ORDER: { key: string; labelKey: 'match_detail.stats.possession' | 'match_detail.stats.shots' | 'match_detail.stats.shots_on_target' | 'match_detail.stats.corners' | 'match_detail.stats.fouls' | 'match_detail.stats.yellow' | 'match_detail.stats.red'; isPercent?: boolean }[] = [
  { key: 'ball_possession', labelKey: 'match_detail.stats.possession', isPercent: true },
  { key: 'total_shots', labelKey: 'match_detail.stats.shots' },
  { key: 'shots_on_goal', labelKey: 'match_detail.stats.shots_on_target' },
  { key: 'corner_kicks', labelKey: 'match_detail.stats.corners' },
  { key: 'fouls', labelKey: 'match_detail.stats.fouls' },
  { key: 'yellow_cards', labelKey: 'match_detail.stats.yellow' },
  { key: 'red_cards', labelKey: 'match_detail.stats.red' },
]

function StatBar({ label, home, away, isPercent }: {
  label: string
  home: number
  away: number
  isPercent?: boolean
}) {
  const total = isPercent ? 100 : Math.max(home + away, 1)
  const homePct = (home / total) * 100
  const awayPct = (away / total) * 100
  const fmt = (v: number) => (isPercent ? `${v}%` : String(v))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-[11px] font-mono tabular-nums">
        <span className={home >= away ? 'text-text-primary font-bold' : 'text-text-secondary'}>
          {fmt(home)}
        </span>
        <span className="text-[9px] uppercase tracking-[0.12em] text-text-muted">{label}</span>
        <span className={away > home ? 'text-text-primary font-bold' : 'text-text-secondary'}>
          {fmt(away)}
        </span>
      </div>
      <div className="flex items-center gap-0.5 w-full" style={{ height: 4 }}>
        <div
          style={{
            width: `${homePct}%`,
            height: '100%',
            background: home >= away ? 'rgb(var(--accent))' : 'rgb(var(--bg-border))',
            borderRadius: 2,
          }}
        />
        <div
          style={{
            width: `${awayPct}%`,
            height: '100%',
            background: away > home ? 'rgb(var(--accent))' : 'rgb(var(--bg-border))',
            borderRadius: 2,
            marginLeft: 'auto',
          }}
        />
      </div>
    </div>
  )
}

export default function SportMatchLiveStats({ stats, homeTeam, awayTeam }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)

  if (stats.length < 2) return null
  const home = stats[0].stats
  const away = stats[1].stats

  const rows = STAT_ORDER
    .map((def) => ({
      label: tr(def.labelKey),
      home: parseVal(home[def.key]),
      away: parseVal(away[def.key]),
      isPercent: def.isPercent,
      show: home[def.key] != null || away[def.key] != null,
    }))
    .filter((r) => r.show)

  if (rows.length === 0) return null

  return (
    <section
      className="mt-3 rounded-lg p-4"
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '1px solid rgb(var(--bg-border))',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted">
          {tr('match_detail.stats.title')}
        </h3>
        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.08em] text-text-muted">
          <span className="truncate max-w-[80px]">{homeTeam}</span>
          <span className="text-text-muted/50">·</span>
          <span className="truncate max-w-[80px]">{awayTeam}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <StatBar key={r.label} label={r.label} home={r.home} away={r.away} isPercent={r.isPercent} />
        ))}
      </div>
    </section>
  )
}
