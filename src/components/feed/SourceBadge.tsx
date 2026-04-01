interface Props { source: string; size?: 'sm' | 'md' }

// Colored pill badges approximating each platform's brand
const SOURCE_CONFIG: Record<string, { label: string; bg: string; color: string; icon?: React.ReactNode }> = {
  polymarket: {
    label: 'Poly',
    bg: 'rgba(100, 60, 220, 0.15)',
    color: '#9b72f5',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
      </svg>
    ),
  },
  kalshi: {
    label: 'Kalshi',
    bg: 'rgba(40, 180, 100, 0.12)',
    color: '#34c975',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="12" width="4" height="10" rx="1" />
        <rect x="10" y="7" width="4" height="15" rx="1" />
        <rect x="18" y="2" width="4" height="20" rx="1" />
      </svg>
    ),
  },
  metaculus: {
    label: 'Meta',
    bg: 'rgba(30, 120, 220, 0.12)',
    color: '#4d9eff',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  odds_api: {
    label: 'Odds',
    bg: 'rgba(255, 180, 0, 0.12)',
    color: '#f5a623',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      </svg>
    ),
  },
  pandascore: {
    label: 'Panda',
    bg: 'rgba(255, 100, 50, 0.12)',
    color: '#ff7a45',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a5 5 0 0 0-5 5c0 1.5.66 2.84 1.7 3.77A7 7 0 0 0 5 17v2h14v-2a7 7 0 0 0-3.7-6.23A5 5 0 1 0 12 2z" />
      </svg>
    ),
  },
  user_search: {
    label: 'Mine',
    bg: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-muted)',
    icon: (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
}

export function SourceBadge({ source, size = 'sm' }: Props) {
  const cfg = SOURCE_CONFIG[source]
  if (!cfg) {
    return (
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
        {source}
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        background: cfg.bg,
        color: cfg.color,
        borderRadius: '4px',
        padding: size === 'sm' ? '1px 5px 1px 4px' : '2px 7px 2px 5px',
        fontSize: size === 'sm' ? '10px' : '11px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}
