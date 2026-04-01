import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthPage from '@/screens/AuthPage'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

function AuthFallback() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthPage />
    </Suspense>
  )
}
