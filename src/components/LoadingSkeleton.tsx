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
