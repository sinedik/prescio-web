import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'

type WatchlistTab = 'events' | 'markets'

interface WatchlistItem {
  id: string
  type: 'event' | 'market'
  title: string
  updated_at: string
  price?: number      // markets: current price %
  edge?: number       // Alpha: edge score pp
  category?: string
  platform?: string
}

function formatUpdated(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function EmptyState({ tab }: { tab: WatchlistTab }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-10 h-10 rounded-xl bg-bg-surface border border-bg-border flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </div>
      <p className="text-sm font-mono text-text-secondary mb-1">
        No {tab} in watchlist yet.
      </p>
      <p className="text-xs font-mono text-text-muted mb-5">
        {tab === 'events'
          ? 'Browse the feed and click Watch to add events.'
          : 'Open a market and click Watch to add it.'}
      </p>
      <button
        onClick={() => navigate(tab === 'events' ? '/feed' : '/markets')}
        className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-bold rounded hover:bg-accent/20 transition-colors"
      >
        {tab === 'events' ? 'Browse Feed' : 'Browse Markets'}
      </button>
    </div>
  )
}

export default function WatchlistPage() {
  const navigate = useNavigate()
  const { isAlpha } = useAuthContext()
  const [tab, setTab] = useState<WatchlistTab>('events')
  const [removing, setRemoving] = useState<string | null>(null)

  const fetcher = useCallback(
    () => api.getWatchlist() as Promise<{ items: WatchlistItem[] }>,
    [],
  )
  const { data, loading, lastUpdated } = usePolling(fetcher, 5 * 60 * 1000)

  const allItems: WatchlistItem[] = (data as { items?: WatchlistItem[] })?.items ?? []
  const items = allItems.filter((item) => item.type === tab.slice(0, -1) as 'event' | 'market')

  const updatedLabel = lastUpdated
    ? `Updated ${Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}m ago`
    : null

  async function handleRemove(id: string) {
    setRemoving(id)
    try {
      await api.removeFromWatchlist(id)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">WATCHLIST</h1>
          {updatedLabel && (
            <p className="text-[10px] font-mono text-text-muted mt-0.5">{updatedLabel}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit mb-5">
        {(['events', 'markets'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-[11px] font-mono font-bold rounded transition-colors uppercase ${
              tab === t
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t}
            {!loading && allItems.filter((i) => i.type === t.slice(0, -1)).length > 0 && (
              <span className="ml-1.5 opacity-50">
                {allItems.filter((i) => i.type === t.slice(0, -1)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-bg-surface border border-bg-border rounded-lg px-4 py-4 animate-pulse" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2 mr-4">
                  <div className="h-3 w-2/3 bg-bg-elevated rounded" />
                  <div className="h-2.5 w-24 bg-bg-elevated rounded" />
                </div>
                <div className="h-5 w-14 bg-bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && <EmptyState tab={tab} />}

      {/* Items */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-bg-surface border border-bg-border rounded-lg px-4 py-3.5 cursor-pointer hover:border-text-muted/30 transition-colors"
              onClick={() => navigate(item.type === 'event' ? `/events/${item.id}` : `/markets/${item.id}`)}
            >
              {/* Left: category/platform badge */}
              {(item.category || item.platform) && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-bg-border bg-bg-elevated text-text-muted uppercase shrink-0">
                  {item.category ?? item.platform}
                </span>
              )}

              {/* Title */}
              <p className="flex-1 text-[13px] font-mono text-text-secondary truncate min-w-0">
                {item.title}
              </p>

              {/* Right: updated + edge or price + remove */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-mono text-text-muted hidden sm:block">
                  {formatUpdated(item.updated_at)}
                </span>

                {item.type === 'market' && item.price !== undefined && (
                  <span className="text-[12px] font-mono font-bold text-text-primary">
                    {item.price.toFixed(0)}%
                  </span>
                )}

                {isAlpha && item.edge !== undefined && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    item.edge >= 10 ? 'text-accent border-accent/40 bg-accent/10' :
                    item.edge >= 5  ? 'text-watch border-watch/30' :
                    'text-text-muted border-bg-border'
                  }`}>
                    {item.edge >= 0 ? '+' : ''}{item.edge}pp
                  </span>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id) }}
                  disabled={removing === item.id}
                  className="text-text-muted/50 hover:text-danger transition-colors disabled:opacity-30"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
