import type { Metadata } from 'next'
import ProfilePage from '@/screens/ProfilePage'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Manage your Prescio account, subscription and preferences.',
  robots: { index: false },
}

export default ProfilePage
