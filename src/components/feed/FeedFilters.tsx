'use client'
import type { TopCategory, FeedFilters } from '../../types/index'
import { CATEGORIES } from '../../lib/categories'

interface Props { filters: FeedFilters; onChange: (f: FeedFilters) => void }

const SORT_OPTIONS = [
  { value: 'recent',    label: 'Recent'   },
  { value: 'score',     label: 'Top Edge' },
  { value: 'starts_at', label: 'Starting' },
]

// Иконки для топ-категорий
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  crypto: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 8h4a2 2 0 0 1 0 4H9v4h4a2 2 0 0 0 0-4" />
      <path d="M9 8V7M13 16v1" />
    </svg>
  ),
  politics: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22V10l9-8 9 8v12" />
      <rect x="9" y="14" width="6" height="8" />
      <path d="M3 10h18" />
    </svg>
  ),
  economics: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  sport: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93C7 7 8 9.5 8 12s-1 5-3.07 7.07" />
      <path d="M19.07 4.93C17 7 16 9.5 16 12s1 5 3.07 7.07" />
      <path d="M2 12h20" />
    </svg>
  ),
  esports: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="12" rx="4" />
      <path d="M8 11v4M6 13h4" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="14" r="1" fill="currentColor" />
    </svg>
  ),
  science_tech: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  ),
}

export function FeedFilters({ filters, onChange }: Props) {
  const activeCat = CATEGORIES.find(c => c.value === filters.category)

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Категории */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <Tab active={!filters.category} onClick={() => onChange({ ...filters, category: undefined, subcategory: undefined })}>
          All
        </Tab>
        {CATEGORIES.map(cat => (
          <Tab
            key={cat.value}
            active={filters.category === cat.value}
            onClick={() => onChange({ ...filters, category: cat.value as TopCategory, subcategory: undefined })}
            icon={CATEGORY_ICONS[cat.value]}
          >
            {cat.label}
          </Tab>
        ))}
      </div>

      {/* Подкатегории */}
      {activeCat && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          <Tab active={!filters.subcategory} onClick={() => onChange({ ...filters, subcategory: undefined })} small>
            All {activeCat.label}
          </Tab>
          {activeCat.subcategories.map(sub => (
            <Tab
              key={sub.value}
              active={filters.subcategory === sub.value}
              onClick={() => onChange({ ...filters, subcategory: sub.value })}
              small
            >
              {sub.label}
            </Tab>
          ))}
        </div>
      )}

      {/* Сортировка */}
      <div className="flex gap-1">
        {SORT_OPTIONS.map(opt => (
          <Tab
            key={opt.value}
            active={filters.sort === opt.value}
            onClick={() => onChange({ ...filters, sort: opt.value as FeedFilters['sort'] })}
            small
            muted
          >
            {opt.label}
          </Tab>
        ))}
      </div>
    </div>
  )
}

function Tab({ children, active, onClick, small = false, muted = false, icon }: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  small?: boolean
  muted?: boolean
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 rounded-md transition-all"
      style={{
        padding: small ? '3px 10px' : '5px 12px',
        fontSize: small ? '11px' : '12px',
        fontWeight: active ? 600 : 400,
        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
        color: active ? 'var(--bg-base)' : muted ? 'var(--text-muted)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      }}
    >
      {icon && !small && (
        <span style={{ opacity: active ? 0.9 : 0.45, display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      {children}
    </button>
  )
}
