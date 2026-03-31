import { getSiteUrl } from '@/lib/site'

/** Schema.org: сайт + организация (поисковики понимают бренд без «угадывания» по HTML). */
export function LandingJsonLd() {
  const url = getSiteUrl()
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${url}/#website`,
        name: 'Prescio',
        url,
        description:
          'AI-powered analysis of Polymarket, Kalshi and Metaculus — find mispriced prediction markets.',
        publisher: { '@id': `${url}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${url}/#organization`,
        name: 'Prescio',
        url,
        logo: `${url}/og-image.png`,
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
