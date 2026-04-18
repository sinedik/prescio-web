import type { Metadata } from 'next'
import ResetPasswordScreen from '@/screens/ResetPasswordScreen'

export const metadata: Metadata = {
  title: 'Set new password',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ResetPasswordScreen />
}
