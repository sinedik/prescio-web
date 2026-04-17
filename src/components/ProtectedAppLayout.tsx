'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

function ContentLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Публичные для SEO/гостей: списки маркетов/спорта/киберспорта и их детальные страницы. */
function isPublicAppPath(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/markets') return true
  if (pathname.startsWith('/market/')) return true
  if (pathname === '/sport' || pathname.startsWith('/sport/')) return true
  if (pathname === '/cybersport' || pathname.startsWith('/cybersport/')) return true
  return false
}

export default function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = isPublicAppPath(pathname)
  const { user, profile, loading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user && !isPublic) {
      router.replace('/')
      return
    }
    if (user && profile && !profile.onboarding_done) {
      router.replace('/onboarding')
    }
  }, [user, profile, loading, router, isPublic])

  // Public paths always render immediately — never gate on auth state, so SSR
  // content (and brand loader from suspense) shows without a green-dot flash
  // while the auth context resolves in the background.
  if (isPublic) {
    return <Layout>{children}</Layout>
  }

  // During loading — show shell with spinner in content area
  if (loading) {
    return <Layout><ContentLoader /></Layout>
  }

  // Unauthenticated on protected path — redirect in progress, show nothing
  if (!user) {
    return <Layout><ContentLoader /></Layout>
  }

  // Onboarding not done — redirect in progress
  if (profile && !profile.onboarding_done) {
    return <Layout><ContentLoader /></Layout>
  }

  return <Layout>{children}</Layout>
}
