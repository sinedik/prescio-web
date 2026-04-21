'use client'
import { getMarketStatus, type MarketStatus, type MarketStatusInput } from '../../lib/marketStatus'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'

interface Props {
  market: MarketStatusInput
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showCountdown?: boolean
}

const TONE: Record<MarketStatus, { color: string; bg: string; border: string; pulse: boolean }> = {
  upcoming:  { color: 'rgb(var(--text-secondary))', bg: 'rgb(var(--bg-elevated))',     border: 'rgb(var(--bg-border))',         pulse: false },
  live:      { color: 'rgb(var(--alpha))',          bg: 'rgb(var(--alpha) / 0.1)',     border: 'rgb(var(--alpha) / 0.3)',       pulse: true  },
  resolving: { color: 'rgb(var(--watch))',          bg: 'rgb(var(--watch) / 0.1)',     border: 'rgb(var(--watch) / 0.3)',       pulse: true  },
  resolved:  { color: 'rgb(var(--text-muted))',     bg: 'rgb(var(--bg-elevated))',     border: 'rgb(var(--bg-border))',         pulse: false },
  cancelled: { color: 'rgb(var(--danger))',         bg: 'rgb(var(--danger) / 0.1)',    border: 'rgb(var(--danger) / 0.3)',      pulse: false },
}

const SIZE: Record<NonNullable<Props['size']>, { container: string; dot: number }> = {
  xs: { container: 'px-1.5 py-0.5 text-[9px]  gap-1',   dot: 4 },
  sm: { container: 'px-2   py-0.5 text-[10px] gap-1',   dot: 5 },
  md: { container: 'px-2.5 py-1   text-[11px] gap-1.5', dot: 6 },
  lg: { container: 'px-3   py-1.5 text-[12px] gap-2',   dot: 7 },
}

export function MarketStatusBadge({ market, size = 'sm', showCountdown = true }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  const { status, daysUntil } = getMarketStatus(market)
  const tone = TONE[status]
  const sz = SIZE[size]
  const label = tr(`market.status.${status}` as Parameters<typeof tr>[0])

  const countdown =
    showCountdown && status === 'upcoming' && daysUntil != null && daysUntil > 0 && daysUntil <= 7
      ? `${daysUntil}${lang === 'ru' ? 'Д' : 'D'}`
      : null

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded ${sz.container}`}
      style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      {tone.pulse && (
        <span
          className="animate-pulse"
          style={{ width: sz.dot, height: sz.dot, borderRadius: '50%', background: tone.color }}
        />
      )}
      <span>{label}</span>
      {countdown && <span className="opacity-70">· {countdown}</span>}
    </span>
  )
}
