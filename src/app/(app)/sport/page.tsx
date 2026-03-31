import type { Metadata } from 'next'
import { SportScreenClient } from './SportScreenClient'

export const metadata: Metadata = {
  title: 'Sport & Esports',
}

export default function SportPage() {
  return <SportScreenClient />
}
