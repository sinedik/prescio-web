'use client'
import { useEffect, useState } from 'react'
import { searchApi } from '../lib/api'
import type { UserSearch } from '../types/index'

export function SearchHistoryScreen() {
  const [searches, setSearches] = useState<UserSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    searchApi.getHistory().then(r => { setSearches(r.searches); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg animate-pulse" style={{ height: '80px', background: 'var(--bg-elevated)' }} />
      ))}
    </div>
  )

  if (!searches.length) return (
    <div className="py-12 text-center px-4">
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No searches yet. Use AI Search to research events.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 p-4">
      {searches.map(s => (
        <div key={s.id} className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{s.query}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {s.analysis_queued && (
                <span style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>analyzed</span>
              )}
              {s.unified_event_id && (
                <a href={`/events/${s.unified_event_id}`} style={{ fontSize: '10px', color: 'var(--accent)' }}>view →</a>
              )}
            </div>
          </div>
          {s.ai_summary && (
            <p className="line-clamp-2" style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.ai_summary}</p>
          )}
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {new Date(s.created_at).toLocaleDateString()}{s.category && ` · ${s.category}`}
          </p>
        </div>
      ))}
    </div>
  )
}
