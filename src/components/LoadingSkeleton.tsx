export function PageLoadingSkeleton({ label = 'LOADING...' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <span className="text-text-muted font-mono text-sm animate-pulse">{label}</span>
    </div>
  )
}

export function ListLoadingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-bg-elevated" />
        ))}
      </div>
    </div>
  )
}

function DateChipsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-11 w-14 rounded-lg bg-bg-surface border border-bg-border shrink-0" />
      ))}
    </div>
  )
}

function MatchRowSkeleton() {
  return (
    <div className="flex items-center gap-3 h-16 px-4 rounded-lg bg-bg-surface border border-bg-border">
      <div className="w-16 h-3 rounded bg-bg-elevated" />
      <div className="flex-1 flex items-center justify-center gap-4">
        <div className="h-4 w-28 rounded bg-bg-elevated" />
        <div className="h-3 w-6 rounded bg-bg-elevated opacity-60" />
        <div className="h-4 w-28 rounded bg-bg-elevated" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-12 rounded bg-bg-elevated" />
        <div className="h-8 w-12 rounded bg-bg-elevated" />
        <div className="h-8 w-12 rounded bg-bg-elevated" />
      </div>
    </div>
  )
}

export function SportListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-4 animate-pulse">
      <DateChipsSkeleton />
      <div className="mt-5 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <MatchRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function CybersportListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-4 animate-pulse">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-14 rounded bg-bg-surface border border-bg-border" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <MatchRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function TeamBlockSkeleton({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className="w-14 h-14 rounded-2xl bg-bg-elevated border-2 border-bg-border" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded bg-bg-elevated" />
        <div className="h-3 w-20 rounded bg-bg-elevated opacity-60" />
      </div>
    </div>
  )
}

export function MatchDetailSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="rounded-lg bg-bg-surface border border-bg-border p-5">
        <div className="flex items-center justify-between gap-4">
          <TeamBlockSkeleton align="left" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-20 rounded bg-bg-elevated" />
            <div className="h-3 w-14 rounded bg-bg-elevated opacity-60" />
          </div>
          <TeamBlockSkeleton align="right" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-20 rounded bg-bg-surface border border-bg-border" />
        ))}
      </div>
      <div className="h-56 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-40 rounded-lg bg-bg-surface border border-bg-border" />
        <div className="h-40 rounded-lg bg-bg-surface border border-bg-border" />
      </div>
    </div>
  )
}

export function LeagueSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-5 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-bg-surface border border-bg-border" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-56 rounded bg-bg-elevated" />
          <div className="h-3 w-32 rounded bg-bg-elevated opacity-60" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded bg-bg-surface border border-bg-border" />
        ))}
      </div>
      <div className="h-72 rounded-lg bg-bg-surface border border-bg-border" />
    </div>
  )
}

export function EventDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-4 animate-pulse">
      <div className="h-6 w-2/3 rounded bg-bg-elevated" />
      <div className="h-3 w-1/3 rounded bg-bg-elevated opacity-60" />
      <div className="h-40 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-24 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-64 rounded-lg bg-bg-surface border border-bg-border" />
    </div>
  )
}
