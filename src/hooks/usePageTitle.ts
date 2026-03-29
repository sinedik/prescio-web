import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Prescio` : 'Prescio — See the Edge Before the Market Does'
    return () => {
      document.title = 'Prescio'
    }
  }, [title])
}
