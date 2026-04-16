import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) browserClient = createBrowserClient(url, anonKey)
  return browserClient
}

// Legacy default export — kept as singleton for modules that imported { supabase }
export const supabase: SupabaseClient = getSupabaseBrowserClient()
