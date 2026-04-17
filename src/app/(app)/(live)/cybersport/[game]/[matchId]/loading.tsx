'use client'
import { usePathname } from 'next/navigation'
import PrescioLoader from '@/components/PrescioLoader'

// Suspense fallback for /cybersport/[game]/[matchId] route — shown while
// the match detail SSR fetch resolves. Discipline color from URL.
export default function Loading() {
  const pathname = usePathname() ?? ''
  const color = pathname.includes('/dota2')
    ? 'rgb(var(--sport-dota2-rgb))'
    : 'rgb(var(--sport-cs2-rgb))'
  return (
    <main className="flex-1 min-w-0 px-6 pb-5 pt-0">
      <PrescioLoader color={color} label="Loading match" />
    </main>
  )
}
