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

  const hasIcon = (flag && !flagErr) || (logo && !logoErr)
  const icon = flag && !flagErr ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flag} alt="" loading="lazy" onError={() => setFlagErr(true)}
      className="w-[18px] h-[13px] object-cover rounded-[2px] shrink-0" />
  ) : logo && !logoErr ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" loading="lazy" onError={() => setLogoErr(true)}
      className="w-5 h-5 object-contain shrink-0" />
  ) : null

  return (
    <div className={`flex items-center gap-2.5 px-3.5 rounded-lg overflow-hidden ${first ? 'mt-0' : 'mt-5'} mb-1.5`}
      style={{ minHeight: 40, background: 'rgba(var(--surface-tint-rgb),0.05)', borderLeft: '3px solid rgba(var(--surface-tint-rgb),0.08)' }}>
      {hasIcon ? icon : <div className="w-5 h-5 shrink-0" />}
      <span className="text-[13px] font-semibold text-text-primary truncate flex-1">
        {name}
      </span>
      {liveCount > 0 && (
        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'rgba(255,50,50,0.12)', color: '#ff5252', border: '1px solid rgba(255,50,50,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          {liveCount}
        </span>
      )}
      <span className="text-[10px] font-mono text-text-muted shrink-0 min-w-[18px] text-right">
        {count}
      </span>
    </div>
  )
}
