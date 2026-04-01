'use client'
import { useEffect, useState } from 'react'
import { cryptoApi, type CoinMeta, type CoinPrice } from '../../lib/api'

const REFRESH_MS = 3 * 60 * 1000 // 3 min, matches server cache

export function CryptoTicker() {
  const [coins, setCoins] = useState<CoinMeta[]>([])
  const [prices, setPrices] = useState<Record<string, CoinPrice>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cryptoApi.getList().then(setCoins).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await cryptoApi.getPrices()
        if (!cancelled) setPrices(data)
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (loading && !Object.keys(prices).length) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse rounded-lg h-14 w-20 bg-bg-elevated" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {coins.map(coin => {
        const p = prices[coin.id]
        if (!p) return null
        const change = p.usd_24h_change ?? 0
        const positive = change >= 0
        return (
          <div
            key={coin.id}
            className="flex-shrink-0 flex flex-col gap-0.5 rounded-lg px-3 py-2.5"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              minWidth: '80px',
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>
              {coin.symbol}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.01em' }}>
              {formatPrice(p.usd)}
            </span>
            <span style={{ fontSize: '10px', color: positive ? '#34c975' : '#ff5f5f', fontWeight: 600 }}>
              {positive ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function formatPrice(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return '$' + n.toFixed(2)
  if (n >= 0.01) return '$' + n.toFixed(4)
  return '$' + n.toFixed(6)
}
