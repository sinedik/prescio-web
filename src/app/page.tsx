import { LandingJsonLd } from '@/components/seo/LandingJsonLd'
import LandingClient from './LandingClient'

export default function HomePage() {
  return (
    <>
      <LandingJsonLd />
      <LandingClient />
    </>
  )
}
