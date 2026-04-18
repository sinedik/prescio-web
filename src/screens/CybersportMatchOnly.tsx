'use client'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useLiveLayout } from '../contexts/LiveLayoutContext'
import type { EsportsMatchDetail } from '../types'
import type { Game } from './CybersportScreen'

const CS2MatchScreen  = dynamic(() => import('./CS2MatchScreen'),  { loading: () => <MatchSkeleton /> })
const DotaMatchScreen = dynamic(() => import('./DotaMatchScreen'), { loading: () => <MatchSkeleton /> })

function MatchSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-24 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-10 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-64 rounded-lg bg-bg-surface border border-bg-border" />
    </div>
  )
}

// Minimal match-detail shell: no listing fetch, no tournament sidebar wiring.
// Replaces CybersportScreen for the /cybersport/[game]/[matchId] route.
export default function CybersportMatchOnly({
  game, matchId, initialData,
}: { game: Game; matchId: string; initialData?: EsportsMatchDetail }) {
  const { setLeagues, setLiveCount, setTotalCount } = useLiveLayout()

  useEffect(() => {
    setLeagues([])
    setLiveCount(0)
    setTotalCount(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <main className="flex-1 min-w-0 pb-5 pt-0">
        {game === 'dota2'
          ? <DotaMatchScreen seriesId={matchId} initialData={initialData} />
          : <CS2MatchScreen  seriesId={matchId} initialData={initialData} />}
      </main>
    </ErrorBoundary>
  )
}
