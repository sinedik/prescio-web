'use client'
import { useState } from 'react'

interface Props {
  name: string
  count: number
  liveCount: number
  first?: boolean
  logo?: string | null
  flag?: string | null
}

export function GroupDivider({ name, count, liveCount, first, logo, flag }: Props) {
  const [logoErr, setLogoErr] = useState(false)
  const [flagErr, setFlagErr] = useState(false)

  const icon = flag && !flagErr ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flag} alt="" loading="lazy" onError={() => setFlagErr(true)}
      className="w-4 h-3 object-cover shrink-0" style={{ borderRadius: 1 }} />
  ) : logo && !logoErr ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" loading="lazy" onError={() => setLogoErr(true)}
      className="w-4 h-4 object-contain shrink-0" />
  ) : <div className="w-4 h-4 shrink-0" />

  return (
    <div
      className={`flex items-center gap-2 px-3.5 ${first ? 'mt-0' : 'mt-4'}`}
      style={{
        minHeight: 34,
        background: 'rgba(var(--surface-tint-rgb),0.04)',
        borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.07)',
      }}
    >
      {icon}
      <span className="text-[10px] font-mono uppercase tracking-[0.08em] truncate flex-1"
        style={{ color: 'rgba(var(--surface-tint-rgb),0.5)' }}>
        {name}
      </span>
      {liveCount > 0 && (
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'rgba(255,50,50,0.1)', color: '#ff5252', border: '0.5px solid rgba(255,50,50,0.25)' }}>
          ● {liveCount}
        </span>
      )}
      <span className="text-[9px] font-mono shrink-0"
        style={{ color: 'rgba(var(--surface-tint-rgb),0.25)' }}>
        {count}
      </span>
    </div>
  )
}
