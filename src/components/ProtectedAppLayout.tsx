'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

function Loader() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
    </div>
  )
}

/** Публичные для SEO/гостей: список рынков и карточка рынка (без авторизации). */
function isPublicMarketsPath(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/markets') return true
  if (pathname.startsWith('/market/')) return true
  return false
}

export default function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = isPublicMarketsPath(pathname)
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

  if (loading) {
    if (!user && isPublic) return <Layout>{children}</Layout>
    return <Loader />
  }

  if (!user) {
    if (isPublic) return <Layout>{children}</Layout>
    return <Loader />
  }

  if (profile && !profile.onboarding_done) return <Loader />
  return <Layout>{children}</Layout>
}
