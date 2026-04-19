'use client'
import Link from 'next/link'

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-3">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((c, i) => {
          const isLast = i === items.length - 1
          const key = `${i}-${c.label}`
          return (
            <li key={key} className="flex items-center gap-1.5">
              {c.href && !isLast ? (
                <Link
                  href={c.href}
                  className="text-[10px] font-mono uppercase tracking-wider text-text-muted
                    hover:text-text-secondary transition-colors truncate max-w-[200px]"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider truncate max-w-[260px] ${
                    isLast ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {c.label}
                </span>
              )}
              {!isLast && (
                <span className="text-[10px] font-mono text-text-muted/40 select-none">›</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
