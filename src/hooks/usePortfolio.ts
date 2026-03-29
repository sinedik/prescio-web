import { useState, useCallback, useEffect } from 'react'
import type { Position, PositionStatus } from '../types'
import { api } from '../lib/api'

const STORAGE_KEY = 'pi_portfolio_v1'

function loadLocal(): Position[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Position[]) : []
  } catch {
    return []
  }
}

function saveLocal(positions: Position[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v)
  return isFinite(n) ? n : fallback
}

function apiRowToPosition(row: Record<string, unknown>): Position {
  const closePriceRaw = row.closePrice ?? row.close_price
  return {
    id: row.id as string,
    question: row.question as string,
    platform: row.platform as string,
    topic: (row.topic as string) ?? '',
    url: row.url as string | undefined,
    resolutionDate: ((row.resolutionDate ?? row.resolution_date) as string) ?? undefined,
    direction: (row.direction as 'YES' | 'NO') ?? 'YES',
    entryPrice: toNum(row.entryPrice ?? row.entry_price),
    myFairProb: toNum(row.myFairProb ?? row.my_fair_prob),
    amount: toNum(row.amount),
    thesis: (row.thesis as string) ?? '',
    status: (row.status as PositionStatus) ?? 'open',
    createdAt: ((row.createdAt ?? row.created_at) as string),
    closedAt: ((row.closedAt ?? row.closed_at) as string) ?? undefined,
    closePrice: closePriceRaw != null ? toNum(closePriceRaw) : undefined,
    ai_edge_at_entry: row.ai_edge_at_entry != null ? toNum(row.ai_edge_at_entry) : undefined,
  }
}

export function usePortfolio() {
  const [positions, setPositions] = useState<Position[]>(loadLocal)
  const [synced, setSynced] = useState(false)

  // Sync from backend API on mount
  useEffect(() => {
    let cancelled = false

    async function syncFromApi() {
      try {
        const data = await api.getPortfolio() as Position[] | { positions: Position[] }
        if (cancelled) return
        const rows = (Array.isArray(data) ? data : ((data as { positions: Position[] }).positions ?? [])) as Record<string, unknown>[]
        const remote = rows.map(apiRowToPosition)
        setPositions(remote)
        saveLocal(remote)
      } catch { /* use local fallback */ }
      if (!cancelled) setSynced(true)
    }

    syncFromApi()
    return () => { cancelled = true }
  }, [])

  const addPosition = useCallback(async (p: Omit<Position, 'id' | 'createdAt' | 'status'>) => {
    const next: Position = {
      ...p,
      id: crypto.randomUUID(),
      status: 'open',
      createdAt: new Date().toISOString(),
    }

    // Optimistic update
    setPositions((prev) => {
      const updated = [next, ...prev]
      saveLocal(updated)
      return updated
    })

    try {
      const created = await api.addPosition({
        id: next.id,
        question: next.question,
        platform: next.platform,
        topic: next.topic ?? '',
        url: next.url,
        resolution_date: next.resolutionDate,
        direction: next.direction,
        entry_price: next.entryPrice,
        my_fair_prob: next.myFairProb,
        amount: next.amount,
        thesis: next.thesis ?? '',
        status: next.status,
        created_at: next.createdAt,
      }) as Record<string, unknown>
      // Replace optimistic entry with server response (may include ai_edge_at_entry)
      const serverPos = apiRowToPosition(created)
      setPositions((prev) => {
        const updated = prev.map((pos) => pos.id === next.id ? serverPos : pos)
        saveLocal(updated)
        return updated
      })
      return serverPos
    } catch {
      return next
    }
  }, [])

  const updateStatus = useCallback(async (id: string, status: PositionStatus, closePrice?: number) => {
    const closedAt = new Date().toISOString()

    setPositions((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, status, closePrice, closedAt } : p
      )
      saveLocal(updated)
      return updated
    })

    try {
      await api.updatePosition(id, { status, close_price: closePrice ?? null, closed_at: closedAt })
    } catch { /* optimistic update already applied */ }
  }, [])

  const deletePosition = useCallback(async (id: string) => {
    setPositions((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      saveLocal(updated)
      return updated
    })

    try {
      await api.deletePosition(id)
    } catch { /* optimistic update already applied */ }
  }, [])

  return { positions, addPosition, updateStatus, deletePosition, synced }
}

// ---- Portfolio math ----

/**
 * fairProb and entryPrice are always expressed as YES probabilities (0-100).
 * direction adjusts the Kelly formula to reflect what side you're actually betting.
 */
export function calcKelly(
  fairProb: number,
  entryPrice: number,
  direction: 'YES' | 'NO' = 'YES',
): {
  kellyFull: number
  kellyHalf: number
  edge: number
} {
  if (direction === 'NO') {
    const noEntry = 100 - entryPrice
    const noFair = 100 - fairProb
    const p = noFair / 100
    const q = 1 - p
    const b = noEntry > 0 ? (100 - noEntry) / noEntry : 0
    const kelly = b > 0 ? (b * p - q) / b : 0
    return {
      kellyFull: Math.max(0, kelly * 100),
      kellyHalf: Math.max(0, kelly * 50),
      edge: (p - noEntry / 100) * 100,
    }
  }
  // YES direction
  const p = fairProb / 100
  const q = 1 - p
  const b = entryPrice > 0 ? (100 - entryPrice) / entryPrice : 0
  const kelly = b > 0 ? (b * p - q) / b : 0
  return {
    kellyFull: Math.max(0, kelly * 100),
    kellyHalf: Math.max(0, kelly * 50),
    edge: (p - entryPrice / 100) * 100,
  }
}

export function calcPositionPnl(p: Position): {
  potentialWin: number
  potentialLoss: number
  expectedValue: number
  resolvedPnl: number | null
} {
  const direction = p.direction ?? 'YES'
  // fairProb and entryPrice stored as YES probabilities
  if (direction === 'NO') {
    const noEntry = 100 - p.entryPrice
    const noFair = 100 - p.myFairProb
    const winMultiple = noEntry > 0 ? (100 - noEntry) / noEntry : 0
    const fairP = noFair / 100
    const potentialWin = p.amount * winMultiple
    const potentialLoss = p.amount
    const expectedValue = fairP * potentialWin - (1 - fairP) * potentialLoss
    let resolvedPnl: number | null = null
    if (p.status === 'won') resolvedPnl = potentialWin
    else if (p.status === 'lost') resolvedPnl = -potentialLoss
    return { potentialWin, potentialLoss, expectedValue, resolvedPnl }
  }
  // YES direction
  const fairP = p.myFairProb / 100
  const winMultiple = p.entryPrice > 0 ? (100 - p.entryPrice) / p.entryPrice : 0
  const potentialWin = p.amount * winMultiple
  const potentialLoss = p.amount
  const expectedValue = fairP * potentialWin - (1 - fairP) * potentialLoss
  let resolvedPnl: number | null = null
  if (p.status === 'won') resolvedPnl = potentialWin
  else if (p.status === 'lost') resolvedPnl = -potentialLoss
  return { potentialWin, potentialLoss, expectedValue, resolvedPnl }
}

export function calcPortfolioStats(positions: Position[]) {
  const closed = positions.filter((p) => p.status !== 'open')
  const won = positions.filter((p) => p.status === 'won')
  const deployed = positions
    .filter((p) => p.status === 'open')
    .reduce((s, p) => s + p.amount, 0)
  const totalInvested = positions.reduce((s, p) => s + p.amount, 0)

  const totalPnl = positions.reduce((s, p) => {
    const { resolvedPnl } = calcPositionPnl(p)
    return s + (resolvedPnl ?? 0)
  }, 0)

  const roi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const winRate = closed.length > 0 ? (won.length / closed.length) * 100 : null

  return {
    total: positions.length,
    open: positions.filter((p) => p.status === 'open').length,
    closed: closed.length,
    won: won.length,
    winRate,
    deployed,
    totalPnl,
    roi,
  }
}
