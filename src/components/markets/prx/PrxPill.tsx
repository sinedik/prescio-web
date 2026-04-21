'use client'
import { formatPrx } from '../../../lib/prx'
import { useLang } from '../../../contexts/LanguageContext'
import { useT } from '../../../lib/i18n'

interface Props {
  edge: number
}

export function PrxPill({ edge }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  return (
    <span
      className="inline-flex items-baseline gap-1.5"
      style={{
        border: '1px solid rgb(var(--accent))',
        background: 'rgba(var(--accent-rgb), 0.08)',
        padding: '4px 8px',
        borderRadius: 3,
      }}
    >
      <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-accent leading-none">
        {tr('card.prx')}
      </span>
      <span className="text-[13px] font-mono font-bold tabular-nums text-accent leading-none">
        {formatPrx(edge)}
      </span>
    </span>
  )
}
