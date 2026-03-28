import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  email: string
  is_pro: boolean
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      profileCache.data = data as Profile
      profileCache.userId = userId
      onProfileUpdate?.(data as Profile)
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

    supabase.auth.getSession().then(({ data: { session } }) => {
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
          profileCache.userId = null
          profileCache.data = null
          setLoading(true)
          fetchProfile(session.user.id).finally(() => setLoading(false))
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

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/markets` },
    })
    if (error) throw error
  }

  async function signInWithTwitter() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: { redirectTo: `${window.location.origin}/markets` },
    })
    if (error) throw error
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id, true)
  }

  async function updateProfile(data: Partial<Omit<Profile, 'id' | 'email' | 'created_at'>>) {
    if (!user) return
    await supabase.from('profiles').update(data).eq('id', user.id)
    if (profileCache.data) {
      profileCache.data = { ...profileCache.data, ...data }
      onProfileUpdate?.(profileCache.data)
    }
  }

  return {
    user,
    profile,
    session,
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
