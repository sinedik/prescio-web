'use client'
import { formatPrx } from '../../../lib/prx'
import { useLang } from '../../../contexts/LanguageContext'
import { useT } from '../../../lib/i18n'

interface Props {
  outcomeLabel: string
  edge: number
  variant?: 'default' | 'resolved'
  resolved?: 'yes' | 'no'
}

export function PrxFooterLine({ outcomeLabel, edge, variant = 'default', resolved }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  if (variant === 'resolved') {
    const resolvedKey = resolved === 'no' ? 'card.resolved_no' : 'card.resolved_yes'
    return (
      <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-accent">
        <span>{tr('card.prx')} {formatPrx(edge)}</span>
        <span className="text-text-muted"> · </span>
        <span>{outcomeLabel}</span>
        <span className="text-text-muted"> · </span>
        <span>{tr(resolvedKey)}</span>
      </span>
    )
  }
  return (
    <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-accent">
      <span>{tr('card.prx_detected')}</span>
      <span className="text-text-muted"> · </span>
      <span>{outcomeLabel} {formatPrx(edge)}</span>
    </span>
  )
}
