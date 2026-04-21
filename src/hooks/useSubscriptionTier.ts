import { useAuth } from './useAuth'

export function useSubscriptionTier(): 'free' | 'pro' | 'alpha' {
  const { plan } = useAuth()
  return plan ?? 'free'
}
