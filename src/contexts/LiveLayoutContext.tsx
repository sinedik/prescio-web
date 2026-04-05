'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'

export interface SidebarLeague { name: string; flag?: string | null; leagueId?: number | null }

interface LiveLayoutCtx {
  leagues: SidebarLeague[]
  setLeagues: (l: SidebarLeague[]) => void
  selectedLeague: string | null
  setSelectedLeague: (l: string | null) => void
  liveCount: number
  setLiveCount: (n: number) => void
  totalCount: number
  setTotalCount: (n: number) => void
  hideHero: boolean
  setHideHero: (b: boolean) => void
}

const Ctx = createContext<LiveLayoutCtx | null>(null)

export function LiveLayoutProvider({ children }: { children: ReactNode }) {
  const [leagues, setLeagues] = useState<SidebarLeague[]>([])
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null)
  const [liveCount, setLiveCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hideHero, setHideHero] = useState(false)
  return (
    <Ctx.Provider value={{ leagues, setLeagues, selectedLeague, setSelectedLeague, liveCount, setLiveCount, totalCount, setTotalCount, hideHero, setHideHero }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLiveLayout() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLiveLayout must be inside LiveLayoutProvider')
  return ctx
}
