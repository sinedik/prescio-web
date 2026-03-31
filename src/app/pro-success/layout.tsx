import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Welcome to Pro',
  robots: { index: false, follow: false },
}

export default function ProSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
