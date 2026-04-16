import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const API_ORIGIN = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

export async function getAuthToken(): Promise<string | null> {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function requireAuthToken(): Promise<string> {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated')
  return token
}

export async function callApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken()
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'API error')
  }
  return res.json() as Promise<T>
}
