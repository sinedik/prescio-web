import type { Metadata } from 'next'
import ProtectedAppLayout from '@/components/ProtectedAppLayout'

/** По умолчанию приложение под логином не индексируем; переопределение — в `markets` и `market/[slug]`. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>
}
