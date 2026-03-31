import type { NextConfig } from 'next'

const API_ORIGIN = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

/**
 * В dev при `http://localhost:8000` в .env браузер ходил бы на другой origin → CORS.
 * Пустая строка → fetch('/api/...') с того же origin, что и Next; rewrites проксируют на API_ORIGIN.
 * В production или если указан внешний API (не loopback) — оставляем URL как есть.
 */
function clientPublicApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? '').trim()
  if (process.env.NODE_ENV === 'production') return raw
  if (!raw) return ''
  try {
    const { hostname } = new URL(raw)
    if (hostname === 'localhost' || hostname === '127.0.0.1') return ''
  } catch {
    /* неполный URL — отдаём как есть */
  }
  return raw
}

/** Next встраивает в браузер только NEXT_PUBLIC_*; старые VITE_* из .env подхватываем здесь (Node видит оба). */
const publicEnv = {
  NEXT_PUBLIC_SITE_URL: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://prescio.io').replace(/\/$/, ''),
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
  NEXT_PUBLIC_API_URL: clientPublicApiUrl(),
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? process.env.VITE_PADDLE_CLIENT_TOKEN ?? '',
  NEXT_PUBLIC_PADDLE_PRICE_ID_PRO:
    process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO ?? process.env.VITE_PADDLE_PRICE_ID_PRO ?? '',
  NEXT_PUBLIC_PADDLE_PRICE_ID_ALPHA:
    process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ALPHA ?? process.env.VITE_PADDLE_PRICE_ID_ALPHA ?? '',
} as const

const nextConfig: NextConfig = {
  env: publicEnv as unknown as Record<string, string>,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ]
  },
  async redirects() {
    return [
      { source: '/watchlist', destination: '/dashboard', permanent: true },
      { source: '/me', destination: '/dashboard', permanent: true },
    ]
  },
}

export default nextConfig
