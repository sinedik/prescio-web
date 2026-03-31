import { SOURCE_LABELS, SOURCE_COLORS } from '../../lib/categories'

interface Props { source: string; size?: 'sm' | 'md' }

export function SourceBadge({ source, size = 'sm' }: Props) {
  return (
    <span
      style={{
        color: SOURCE_COLORS[source] ?? 'var(--text-muted)',
        fontSize: size === 'sm' ? '10px' : '11px',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontWeight: 500,
        opacity: 0.85,
      }}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  )
}
