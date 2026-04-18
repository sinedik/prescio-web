'use client'
import { usePathname } from 'next/navigation'
import PrescioLoader from './PrescioLoader'
import { ACCENT_RGB, disciplineFromPath } from './disciplines'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

// Suspense fallback used by every sport/cybersport route-level `loading.tsx`.
// Discipline accent comes from the URL (loading.tsx can't see route params)
// and the label is the same i18n key as the in-screen loader — so the text
// doesn't flicker when SSR resolves and the page loader takes over.
export default function RouteLoader({ wrapInMain = false }: { wrapInMain?: boolean }) {
  const pathname = usePathname() ?? ''
  const discipline = disciplineFromPath(pathname)
  const color = discipline ? ACCENT_RGB[discipline] : 'rgb(var(--accent))'
  const { lang } = useLang()
  const t = useT(lang)
  const loader = <PrescioLoader color={color} label={t('sport.loading_matches')} />
  if (wrapInMain) {
    return <main className="flex-1 min-w-0 px-6 pb-5 pt-0">{loader}</main>
  }
  return loader
}
