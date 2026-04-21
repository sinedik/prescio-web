'use client'

type Icon = 'bell' | 'eye' | 'calendar' | 'search' | 'inbox'

const ICONS: Record<Icon, React.ReactNode> = {
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17H20L18.595 15.595A1.8 1.8 0 0 1 18 14.383V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.383a1.8 1.8 0 0 1-.595 1.022L4 17H9M15 17v1a3 3 0 0 1-6 0v-1M15 17H9" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
}

interface EmptyHintProps {
  icon?: Icon
  label: string
  sublabel?: string
  action?: { label: string; onClick: () => void }
  size?: 'sm' | 'md'
}

export function EmptyHint({ icon = 'inbox', label, sublabel, action, size = 'md' }: EmptyHintProps) {
  const isSm = size === 'sm'
  return (
    <div className="flex flex-col items-center justify-center text-center"
      style={{ padding: isSm ? '16px 12px' : '64px 24px' }}>
      {!isSm && (
        <div className="mb-4 flex items-center justify-center rounded-xl border"
          style={{
            width: 40, height: 40,
            background: 'rgba(var(--surface-tint-rgb),0.04)',
            borderColor: 'rgba(var(--surface-tint-rgb),0.08)',
            color: 'rgb(var(--text-muted))',
          }}>
          <span style={{ width: 20, height: 20 }}>{ICONS[icon]}</span>
        </div>
      )}
      <p className="font-mono" style={{
        fontSize: isSm ? 11 : 13,
        color: isSm ? 'rgb(var(--text-muted))' : 'rgb(var(--text-secondary))',
        marginBottom: sublabel || action ? (isSm ? 2 : 4) : 0,
      }}>
        {label}
      </p>
      {sublabel && (
        <p className="font-mono" style={{
          fontSize: isSm ? 10 : 11,
          color: 'rgba(var(--surface-tint-rgb),0.3)',
          marginBottom: action ? (isSm ? 8 : 20) : 0,
        }}>
          {sublabel}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="font-mono font-bold rounded border transition-colors"
          style={{
            fontSize: 10,
            padding: '6px 14px',
            borderColor: 'rgba(var(--surface-tint-rgb),0.15)',
            color: 'rgb(var(--text-secondary))',
            background: 'rgba(var(--surface-tint-rgb),0.04)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--surface-tint-rgb),0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(var(--surface-tint-rgb),0.04)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
