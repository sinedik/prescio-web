'use client'
import { useCallback } from 'react'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import type { EsportsMatchDetail } from '../types'
import CS2MatchScreen from './CS2MatchScreen'
import DotaMatchScreen from './DotaMatchScreen'

export default function EsportsMatchScreen({ seriesId }: { seriesId: string }) {
  const fetcher = useCallback(() => api.getEsportsMatch(seriesId), [seriesId])
  const { data, loading } = usePolling(fetcher, 10_000, seriesId)
  const match = data as EsportsMatchDetail | null

  if (loading && !match) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-6 flex flex-col gap-4">
        <div className="h-5 w-20 rounded animate-pulse bg-bg-surface" />
        <div className="h-36 rounded-lg animate-pulse bg-bg-surface border border-bg-border" />
      </div>
    )
  }

  const isDota = (match?.subcategory ?? '').includes('dota')
  return isDota
    ? <DotaMatchScreen seriesId={seriesId} />
    : <CS2MatchScreen seriesId={seriesId} />
}
