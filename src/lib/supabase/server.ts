import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Setting cookies from Server Components is not allowed — middleware handles refresh.
        }
      },
    },
  })
}

// Cookie-less client for use inside unstable_cache() — public read-only data.
// cookies() is dynamic and incompatible with cached scopes.
let _anonClient: ReturnType<typeof createClient> | null = null
export function getSupabaseAnonClient() {
  if (!_anonClient) {
    _anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _anonClient
}
