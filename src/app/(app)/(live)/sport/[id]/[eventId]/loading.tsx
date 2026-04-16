import { MatchDetailSkeleton } from '@/components/LoadingSkeleton'

export default function Loading() {
  return (
    <main className="flex-1 min-w-0 px-6 pb-5 pt-0">
      <MatchDetailSkeleton />
    </main>
  )
}
