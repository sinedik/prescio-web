'use client'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'

interface Props {
  label?: string
  value: string
  onClear: () => void
  showIcon?: boolean
}

export function ActiveFilterBanner({ label, value, onClear, showIcon = true }: Props) {
  const { lang } = useLang()
  const t = useT(lang)
  return (
    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border border-bg-border bg-bg-surface">
      {showIcon && (
        <svg className="w-3 h-3 text-text-muted/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      )}
      {label && <span className="text-[11px] font-mono text-text-muted/50 shrink-0">{label}</span>}
      <span className="text-[11px] font-mono font-bold text-text-primary truncate flex-1">{value}</span>
      <button onClick={onClear}
        className="ml-auto shrink-0 text-[9px] font-mono text-text-muted/50 hover:text-text-muted transition-colors px-1.5 py-0.5 rounded border border-bg-border">
        {t('common.reset')}
      </button>
    </div>
  )
}
