import type { Metadata } from 'next'
import { Suspense } from 'react'
import CheckInboxScreen from '@/screens/CheckInboxScreen'

export const metadata: Metadata = {
  title: 'Check your inbox',
  robots: { index: false, follow: false },
}

function Fallback() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <CheckInboxScreen />
    </Suspense>
  )
}
