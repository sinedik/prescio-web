import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/site'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Terms of Service | Prescio',
  description: 'Terms and conditions governing use of Prescio.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/terms` },
  openGraph: {
    title: 'Terms of Service | Prescio',
    description: 'Terms and conditions governing use of Prescio.',
    url: `${site}/terms`,
    type: 'website',
  },
}

const SECTIONS = [
  {
    title: '1. About Prescio',
    body: `Prescio ("we", "us", "our") is an AI-powered information and analytics platform for prediction markets and sports. We provide intelligence tools, market data aggregation, and AI-generated analysis to help users make better-informed decisions. Prescio does not operate a prediction market, does not accept bets or wagers, and does not provide financial or investment advice.

The service is individually operated and available at prescio.io.`,
  },
  {
    title: '2. Acceptance of Terms',
    body: `By accessing or using Prescio you confirm that you are at least 18 years old and agree to be bound by these Terms of Service. If you do not agree, do not use the service.

We may update these Terms from time to time. Continued use after changes constitutes acceptance of the revised Terms. We will notify registered users of material changes by email or in-app notice.`,
  },
  {
    title: '3. Nature of the Service',
    body: `Prescio is an informational and analytical service. All content — including AI-generated analysis, market probability summaries, and sports data — is provided for informational purposes only.

Nothing on Prescio constitutes financial, investment, legal, or betting advice. Prediction markets involve risk; past performance and AI analysis do not guarantee future outcomes. You are solely responsible for any decisions you make based on information from Prescio.`,
  },
  {
    title: '4. Accounts',
    body: `You must provide a valid email address to register. You are responsible for keeping your credentials confidential and for all activity under your account. Notify us immediately at support@prescio.io if you suspect unauthorized access.

We reserve the right to suspend or terminate accounts that violate these Terms.`,
  },
  {
    title: '5. Prescio Pro Subscription',
    body: `Prescio offers a paid subscription ("Prescio Pro") that unlocks additional features including unlimited AI analysis. Subscriptions are billed on a recurring basis (monthly or annual) through Paddle.com, our authorized Merchant of Record.

By subscribing you also agree to Paddle's Terms of Service and Privacy Policy. Paddle handles all payment processing, invoicing, and applicable taxes on our behalf.`,
  },
  {
    title: '6. Refund Policy',
    body: `All subscription payments are final and non-refundable except:

• Where required by applicable consumer protection law (e.g. statutory 14-day cooling-off period in the EU/UK for digital services not yet activated).
• At our sole discretion in cases of clear billing error or service unavailability exceeding 72 consecutive hours.

To request a refund, email legal@prescio.io with your order details within 14 days of the charge. Paddle, as Merchant of Record, may also handle refund requests directly in accordance with their policies.

Downgrading or canceling a subscription stops future charges but does not entitle you to a prorated refund for the current billing period.`,
  },
  {
    title: '7. Cancellation',
    body: `You may cancel your subscription at any time from your account settings or by contacting support@prescio.io. Cancellation takes effect at the end of the current billing period; you retain Pro access until that date. No partial refunds are issued for unused days.`,
  },
  {
    title: '8. Acceptable Use',
    body: `You agree not to:

• Scrape, crawl, or systematically extract data from Prescio without written permission.
• Reverse-engineer, decompile, or attempt to extract source code.
• Use the service to train AI models or build competing products without authorization.
• Share, resell, or sublicense your account or Pro features.
• Attempt to circumvent paywalls, rate limits, or access controls.
• Use the service in any way that violates applicable law.

Violations may result in immediate account termination without refund.`,
  },
  {
    title: '9. Intellectual Property',
    body: `All content, design, code, and AI-generated outputs on Prescio are owned by or licensed to us. You may use analysis outputs for your personal, non-commercial decision-making. You may not republish, redistribute, or commercially exploit Prescio content without written permission.

Market data sourced from third-party platforms (Polymarket, Kalshi, Metaculus, etc.) remains the property of those platforms subject to their respective terms.`,
  },
  {
    title: '10. Disclaimer of Warranties',
    body: `Prescio is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that AI-generated analysis will be accurate, complete, or suitable for any purpose.

Prediction markets and sports outcomes are inherently uncertain. Use Prescio outputs as one input among many — not as the sole basis for decisions involving real money.`,
  },
  {
    title: '11. Limitation of Liability',
    body: `To the maximum extent permitted by law, Prescio and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to losses from trading, betting, or investment decisions informed by Prescio content.

Our total liability to you for any claim shall not exceed the amount you paid us in the 3 months preceding the claim.`,
  },
  {
    title: '12. Governing Law',
    body: `These Terms are governed by the laws of the Republic of Kazakhstan. Any disputes shall be resolved in the courts of Kazakhstan, unless mandatory local consumer law in your jurisdiction provides otherwise.`,
  },
  {
    title: '13. Contact',
    body: `For questions about these Terms:\n\nEmail: legal@prescio.io\nSupport: support@prescio.io\nWebsite: prescio.io`,
  },
]

export default function TermsPage() {
  return (
    <div
      className="min-h-screen font-mono text-sm px-6 py-16 mx-auto max-w-2xl leading-relaxed"
      style={{ background: 'rgb(var(--bg-base))', color: 'rgb(var(--text-primary))' }}
    >
      <p className="text-xs mb-8" style={{ color: 'rgb(var(--text-muted))' }}>
        <Link href="/" className="hover:underline transition-colors">
          ← Home
        </Link>
      </p>

      <h1 className="text-xl font-bold tracking-tight mb-2">Terms of Service</h1>
      <p className="text-xs mb-10" style={{ color: 'rgb(var(--text-muted))' }}>
        Last updated: April 1, 2026
      </p>

      <p className="mb-10" style={{ color: 'rgb(var(--text-secondary))' }}>
        Please read these Terms carefully before using Prescio. They govern your access to and use
        of the service.
      </p>

      <div className="flex flex-col gap-8">
        {SECTIONS.map(({ title, body }) => (
          <section key={title}>
            <h2 className="font-bold mb-3" style={{ color: 'rgb(var(--text-primary))' }}>
              {title}
            </h2>
            <p className="whitespace-pre-line" style={{ color: 'rgb(var(--text-secondary))' }}>
              {body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t" style={{ borderColor: 'rgb(var(--bg-border))' }}>
        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
          © {new Date().getFullYear()} Prescio. All rights reserved.
        </p>
      </div>
    </div>
  )
}
