'use client'
import { usePathname } from 'next/navigation'
import PrescioLoader from '@/components/PrescioLoader'

// Suspense fallback for /cybersport/[game] route — shown while the page
// awaits the SSR esports fetch on hard reload or client navigation.
// Discipline-aware color is inferred from the URL since loading.tsx doesn't
// receive route params.
export default function Loading() {
  const pathname = usePathname() ?? ''
  const color = pathname.includes('/dota2')
    ? 'rgb(var(--sport-dota2-rgb))'
    : 'rgb(var(--sport-cs2-rgb))'
  return <PrescioLoader color={color} label="Loading matches" />
}
