import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import ProSuccessPage from '@/screens/ProSuccessPage'

export const metadata: Metadata = {
  title: 'Welcome to Pro',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ProSuccessPage />
    </ProtectedRoute>
  )
}
