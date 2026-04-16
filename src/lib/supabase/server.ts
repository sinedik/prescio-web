import { createServerClient } from '@supabase/ssr'
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
