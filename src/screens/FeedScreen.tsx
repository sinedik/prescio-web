'use client'
import { useState } from 'react'
import { FeedCard } from '../components/feed/FeedCard'
import { FeedFilters } from '../components/feed/FeedFilters'
import { SearchOverlay } from '../components/search/SearchOverlay'
import { usePolling } from '../hooks/usePolling'
import { feedApi } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import type { FeedFilters as Filters, UnifiedEvent } from '../types/index'

export function FeedScreen() {
  const { profile } = useAuthContext()
  const plan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')
  const [filters, setFilters] = useState<Filters>({ sort: 'recent' })
  const [searchOpen, setSearchOpen] = useState(false)

  const { data, loading } = usePolling(
    () => feedApi.getEvents(filters),
    60_000,
    JSON.stringify(filters),
  )

  const events: UnifiedEvent[] = (data as { events?: UnifiedEvent[] } | null)?.events ?? []

  return (
    <div className="flex flex-col">
      {/* Topbar */}
      <div className="sticky top-0 z-10 border-b border-bg-border bg-bg-base">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <h1 className="text-base font-semibold text-text-primary">Feed</h1>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-elevated border border-bg-border text-text-muted text-xs transition-opacity hover:opacity-80"
          >
            <span>⌕</span>
            <span>AI Search</span>
            {plan === 'free' && <span className="text-[9px] text-accent font-bold">PRO</span>}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 pt-5">
        <FeedFilters filters={filters} onChange={setFilters} />
      </div>

      <div className="max-w-5xl mx-auto w-full flex flex-col gap-3 px-6 pb-10 pt-3">
        {loading && events.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg animate-pulse h-[120px] bg-bg-elevated" />
          ))
        }
        {!loading && events.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-text-muted">No events found</p>
          </div>
        )}
        {events.map(event => <FeedCard key={event.id} event={event} plan={plan} />)}
      </div>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} plan={plan} />
    </div>
  )
}
