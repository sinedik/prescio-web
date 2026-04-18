'use server'
import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export interface ProfileUpdate {
  display_name?: string
  country?: string
  trading_experience?: string
  typical_stake_usd?: string
  language?: string
  default_platform?: string
  alert_resolution_days?: number
  top_category?: string
  notif_email_edge?: boolean
  notif_email_digest?: boolean
  notif_resolution_reminder?: boolean
  onboarding_done?: boolean
  interests?: string[]
  theme?: 'dark' | 'light'
}

async function currentUserId(): Promise<string> {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Not authenticated')
  return data.user.id
}

export async function updateProfileAction(data: ProfileUpdate) {
  const supabase = await getSupabaseServerClient()
  const userId = await currentUserId()
  const { error } = await supabase.from('profiles').update(data).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/profile')
}

export async function completeOnboardingAction(payload: {
  interests?: { category: string; subcategory?: string }[]
  experience?: string
}) {
  const supabase = await getSupabaseServerClient()
  const userId = await currentUserId()

  const update: ProfileUpdate = { onboarding_done: true }
  if (payload.experience) update.trading_experience = payload.experience

  const { error } = await supabase.from('profiles').update(update).eq('id', userId)
  if (error) throw new Error(error.message)

  if (payload.interests && payload.interests.length > 0) {
    const { updateInterestsAction } = await import('./interests')
    try { await updateInterestsAction(payload.interests) } catch { /* optional */ }
  }

  revalidatePath('/profile')
}

export async function skipOnboardingAction() {
  const supabase = await getSupabaseServerClient()
  const userId = await currentUserId()
  const { error } = await supabase.from('profiles').update({ onboarding_done: true }).eq('id', userId)
  if (error) throw new Error(error.message)
}
