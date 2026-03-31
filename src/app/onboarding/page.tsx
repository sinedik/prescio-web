'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import OnboardingPage from '@/screens/OnboardingPage'

export default function Page() {
  return (
    <ProtectedRoute>
      <OnboardingPage />
    </ProtectedRoute>
  )
}
