import type { Metadata } from 'next'
import { SportScreenClient } from './SportScreenClient'

export const metadata: Metadata = {
  title: 'Sport',
  description: 'Sports events with AI-powered odds analysis. Football, basketball, tennis and more — find value bets before the bookmakers correct them.',
}

export default function SportPage() {
  return <SportScreenClient />
}
