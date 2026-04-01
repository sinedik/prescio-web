export default function MarketSkeleton({ index }: { index: number }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-5 animate-pulse" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-start gap-4">
        <div className="w-6 h-3 bg-bg-elevated rounded mt-1" />
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-4 w-14 bg-bg-elevated rounded" />
            <div className="h-4 w-20 bg-bg-elevated rounded" />
          </div>
          <div className="h-[15px] w-4/5 bg-bg-elevated rounded" />
          <div className="h-[15px] w-2/3 bg-bg-elevated rounded" />
          <div className="flex gap-4 pt-0.5">
            <div className="h-3 w-16 bg-bg-elevated rounded" />
            <div className="h-3 w-24 bg-bg-elevated rounded" />
          </div>
        </div>
        <div className="w-[70px] h-[70px] bg-bg-elevated rounded-xl" />
      </div>
    </div>
  )
}
