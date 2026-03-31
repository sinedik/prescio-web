'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import ProSuccessPage from '@/screens/ProSuccessPage'

export default function Page() {
  return (
    <ProtectedRoute>
      <ProSuccessPage />
    </ProtectedRoute>
  )
}
