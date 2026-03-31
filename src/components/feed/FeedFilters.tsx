'use client'
import type { TopCategory, FeedFilters } from '../../types/index'
import { CATEGORIES } from '../../lib/categories'

interface Props { filters: FeedFilters; onChange: (f: FeedFilters) => void }

const SORT_OPTIONS = [
  { value: 'recent',    label: 'Recent'   },
  { value: 'score',     label: 'Top Edge' },
  { value: 'starts_at', label: 'Starting' },
]

export function FeedFilters({ filters, onChange }: Props) {
  const activeCat = CATEGORIES.find(c => c.value === filters.category)

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Категории */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <Tab active={!filters.category} onClick={() => onChange({ ...filters, category: undefined, subcategory: undefined })}>
          All
        </Tab>
        {CATEGORIES.map(cat => (
          <Tab
            key={cat.value}
            active={filters.category === cat.value}
            onClick={() => onChange({ ...filters, category: cat.value as TopCategory, subcategory: undefined })}
          >
            {cat.label}
          </Tab>
        ))}
      </div>

      {/* Подкатегории */}
      {activeCat && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
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
      <div className="flex gap-1.5">
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

function Tab({ children, active, onClick, small = false, muted = false }: {
  children: React.ReactNode; active: boolean; onClick: () => void; small?: boolean; muted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-md transition-all"
      style={{
        padding: small ? '3px 10px' : '5px 14px',
        fontSize: small ? '11px' : '12px',
        fontWeight: active ? 600 : 400,
        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
        color: active ? 'var(--bg-base)' : muted ? 'var(--text-muted)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      }}
    >
      {children}
    </button>
  )
}
