'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import CookieBanner from '@/components/CookieBanner'
import EmailConfirmBanner from '@/components/EmailConfirmBanner'
import PaymentIssueBanner from '@/components/PaymentIssueBanner'
import PendingDeletionBanner from '@/components/PendingDeletionBanner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <PendingDeletionBanner />
          <PaymentIssueBanner />
          <EmailConfirmBanner />
          {children}
          <CookieBanner />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
