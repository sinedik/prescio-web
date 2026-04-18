import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { updateProfileAction, type ProfileUpdate } from '../actions/profile'

export interface Profile {
  id: string
  email: string
  is_pro: boolean
  plan: 'free' | 'pro' | 'alpha'
  interests: string[]
  analyses_today: number
  analyses_date: string | null
  analyses_total: number
  onboarding_done: boolean
  created_at: string
  // Extended profile fields
  display_name?: string
  country?: string
  trading_experience?: string
  typical_stake_usd?: string
  language?: string
  default_platform?: string
  alert_resolution_days?: number
  streak_days?: number
  top_category?: string
  notif_email_edge?: boolean
  notif_email_digest?: boolean
  notif_resolution_reminder?: boolean
  last_active_date?: string
  theme?: 'dark' | 'light'
  timezone?: string
  avatar_url?: string | null
  deleted_at?: string | null
  subscription_status?: 'active' | 'past_due' | 'paused' | 'canceled' | 'trialing' | null
  current_period_end?: string | null
}

// Module-level cache — survives StrictMode double-mount, component re-renders
let profileCache: { userId: string | null; data: Profile | null; fetching: boolean } = {
  userId: null,
  data: null,
  fetching: false,
}

// Callbacks registered by the active useAuth instance to receive updates
let onProfileUpdate: ((p: Profile) => void) | null = null

async function fetchProfile(userId: string, force = false): Promise<void> {
  if (!force && (profileCache.fetching || profileCache.userId === userId)) return
  profileCache.fetching = true
  try {
    const [{ data: profile }, { data: subs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .limit(1),
    ])
    if (profile) {
      const sub = subs?.[0]
      const merged: Profile = {
        ...(profile as Profile),
        subscription_status: (sub?.status as Profile['subscription_status']) ?? null,
        current_period_end: sub?.current_period_end ?? null,
      }
      profileCache.data = merged
      profileCache.userId = userId
      onProfileUpdate?.(merged)
    }
  } finally {
    profileCache.fetching = false
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(profileCache.data)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    onProfileUpdate = setProfile

    const sessionTimeout = new Promise<{ data: { session: null } }>(resolve =>
      setTimeout(() => resolve({ data: { session: null } }), 5000)
    )
    Promise.race([supabase.auth.getSession(), sessionTimeout]).then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        if (profileCache.userId === session.user.id && profileCache.data) {
          setProfile(profileCache.data)
          setLoading(false)
        } else {
          fetchProfile(session.user.id).finally(() => setLoading(false))
        }
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(prev => prev?.access_token === session?.access_token ? prev : session)
      setUser(prev => prev?.id === session?.user?.id ? prev : session?.user ?? null)

      if (session?.user) {
        if (event === 'SIGNED_IN') {
          // Only treat as a real sign-in (and show loading) when the user actually changed.
          // Supabase can fire SIGNED_IN during token refreshes for the same user — ignore those.
          if (profileCache.userId !== session.user.id) {
            profileCache.userId = null
            profileCache.data = null
            setLoading(true)
            fetchProfile(session.user.id).finally(() => setLoading(false))
          } else if (!profileCache.data) {
            fetchProfile(session.user.id).finally(() => setLoading(false))
          }
        } else if (event === 'USER_UPDATED') {
          fetchProfile(session.user.id, true)
        }
      } else {
        setProfile(null)
        profileCache.userId = null
        profileCache.data = null
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      onProfileUpdate = null
    }
  }, [])

  async function signIn(email: string, password: string, captchaToken?: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (error) throw error
  }

  async function signUp(email: string, password: string, displayName?: string, captchaToken?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        captchaToken,
      },
    })
    if (error) throw error
    if (data.session) {
      const { authApi } = await import('../lib/api')
      authApi.markHasPassword().catch(() => {})
    }
    return { needsConfirmation: !data.session }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/markets` },
    })
    if (error) throw error
  }

  async function signInWithTwitter() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/markets` },
    })
    if (error) throw error
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id, true)
  }

  async function updateProfile(data: ProfileUpdate) {
    if (!user) return
    await updateProfileAction(data)
    if (profileCache.data) {
      profileCache.data = { ...profileCache.data, ...data }
      onProfileUpdate?.(profileCache.data)
    }
  }

  const isPro = profile ? (profile.plan === 'pro' || profile.plan === 'alpha' || profile.is_pro) : false
  const isAlpha = profile ? profile.plan === 'alpha' : false
  const plan: 'free' | 'pro' | 'alpha' = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')

  return {
    user,
    profile,
    session,
    isPro,
    isAlpha,
    plan,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithTwitter,
    loading,
    refreshProfile,
    updateProfile,
  }
}
