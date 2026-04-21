'use client'
import Link from 'next/link'
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

export function PrxLockedFooter() {
  const { lang } = useLang()
  const tr = useT(lang)
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted">
      <LockIcon />
      <span>{tr('card.prx_detected')}</span>
      <span className="text-text-muted/60"> · </span>
      <span>{tr('card.prx_upgrade')}</span>
      <Link
        href="/pricing"
        onClick={(e) => e.stopPropagation()}
        className="ml-1 text-accent hover:underline"
      >
        {tr('card.pro_cta')}
      </Link>
    </span>
  )
}
