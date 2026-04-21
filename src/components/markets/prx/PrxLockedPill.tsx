'use client'
import { useLang } from '../../../contexts/LanguageContext'
import { useT } from '../../../lib/i18n'

function LockIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1.5" y="4.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
      <path
        d="M3 4.5V3a2 2 0 0 1 4 0v1.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PrxLockedPill() {
  const { lang } = useLang()
  const tr = useT(lang)
  return (
    <span
      className="inline-flex items-center gap-1 text-text-muted"
      style={{
        border: '1px solid rgb(var(--bg-border))',
        padding: '4px 8px',
        borderRadius: 3,
      }}
    >
      <LockIcon />
      <span className="text-[10px] font-mono uppercase tracking-[0.1em] leading-none">
        {tr('card.prx')}
      </span>
    </span>
  )
}
