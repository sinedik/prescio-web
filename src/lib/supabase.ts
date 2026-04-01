import { createClient } from '@supabase/supabase-js'

/** Значения задаются в .env как NEXT_PUBLIC_* или VITE_* (см. `env` в next.config.ts). */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
