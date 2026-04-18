'use client'
import { useLang } from '../../contexts/LanguageContext'
import { mix } from '../disciplines'

interface Props {
  current: number
  total: number
  totalEvents: number
  pageStart: number
  pageEnd: number
  onChange: (p: number) => void
  accent?: string
}

export function Pagination({ current, total, totalEvents, pageStart, pageEnd, onChange, accent }: Props) {
  const { lang } = useLang()
  if (total <= 1) return null

  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  const a = accent ?? 'rgb(var(--accent))'

  return (
    <div className="flex flex-col items-center gap-2 pt-4 pb-2">
      <span className="text-[10px] font-mono text-text-muted">
        {lang === 'ru' ? `Матчи ${pageStart}–${pageEnd} из ${totalEvents}` : `Matches ${pageStart}–${pageEnd} of ${totalEvents}`}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(current - 1)} disabled={current === 1}
          className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-[10px] font-mono text-text-muted/40">···</span>
          ) : (
            <button key={p} onClick={() => onChange(p as number)}
              className="w-8 h-8 flex items-center justify-center rounded text-[11px] font-mono transition-all"
              style={p === current
                ? { background: mix(a, 9), color: a, border: `1px solid ${mix(a, 27)}` }
                : { color: 'rgb(var(--text-muted))', border: '1px solid transparent' }
              }>{p}</button>
          )
        )}
        <button onClick={() => onChange(current + 1)} disabled={current === total}
          className="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  )
}
