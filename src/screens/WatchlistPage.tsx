'use client'
import { useState, useCallback } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { removeFromWatchlistAction } from '../actions/watchlist'
import { useAuthContext } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { EmptyHint } from '../components/EmptyHint'

type WatchlistTab = 'events' | 'markets'

interface WatchlistItem {
  id: string
  watchlist_id: string
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


export default function WatchlistPage() {
  usePageTitle('Watchlist')
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const { isAlpha } = useAuthContext()
  const [tab, setTab] = useState<WatchlistTab>('events')
  const [removing, setRemoving] = useState<string | null>(null)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [removeError, setRemoveError] = useState<string | null>(null)

  const fetcher = useCallback(
    () => api.getWatchlist() as Promise<{ items: WatchlistItem[] }>,
    [],
  )
  const { data, loading, lastUpdated } = usePolling(fetcher, 5 * 60 * 1000)

  const allItems: WatchlistItem[] = ((data as { items?: WatchlistItem[] })?.items ?? []).filter(
    (item) => !removedIds.has(item.id)
  )
  const items = allItems.filter((item) => item.type === tab.slice(0, -1) as 'event' | 'market')

  const updatedLabel = lastUpdated
    ? `Updated ${Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}m ago`
    : null

  async function handleRemove(item: WatchlistItem) {
    setRemoving(item.id)
    setRemoveError(null)
    setRemovedIds((prev) => new Set([...prev, item.id]))
    try {
      await removeFromWatchlistAction(item.watchlist_id)
    } catch {
      setRemovedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next })
      setRemoveError(tr('watchlist.remove_error'))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">{tr('watchlist.title')}</h1>
          {updatedLabel && (
            <p className="text-[10px] font-mono text-text-muted mt-0.5">{updatedLabel}</p>
          )}
        </div>
      </div>

      {removeError && (
        <div
          className="mb-4 px-3 py-2 rounded-lg text-xs font-mono"
          style={{ color: 'rgb(var(--danger))', background: 'rgb(var(--danger) / 0.06)', border: '1px solid rgb(var(--danger) / 0.2)' }}
        >
          {removeError}
        </div>
      )}

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
      {!loading && items.length === 0 && (
        <EmptyHint
          icon="eye"
          label={tab === 'events' ? tr('watchlist.empty_events') : tr('watchlist.empty_markets')}
          sublabel={tab === 'events' ? tr('watchlist.browse_feed') : tr('watchlist.open_market')}
          action={{ label: tr('watchlist.browse_markets'), onClick: () => router.push('/markets') }}
        />
      )}

      {/* Items */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-bg-surface border border-bg-border rounded-lg px-4 py-3.5 cursor-pointer hover:border-text-muted/30 transition-colors"
              onClick={() => router.push(item.type === 'event' ? `/events/${item.id}` : `/markets/${item.id}`)}
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
                  onClick={(e) => { e.stopPropagation(); handleRemove(item) }}
                  disabled={removing === item.id}
                  className="text-text-muted/50 hover:text-danger transition-colors disabled:opacity-30"
                  title={tr('watchlist.remove_title')}
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
