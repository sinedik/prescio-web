import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import OnboardingPage from '@/screens/OnboardingPage'

export const metadata: Metadata = {
  title: 'Get started',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <ProtectedRoute>
      <OnboardingPage />
    </ProtectedRoute>
  )
}
