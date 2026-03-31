'use client'

import { Suspense } from 'react'
import AuthPage from '@/screens/AuthPage'

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
