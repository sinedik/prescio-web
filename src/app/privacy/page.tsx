import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/site'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Privacy Policy | Prescio',
  description: 'How Prescio collects, uses, and protects your personal data.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/privacy` },
  openGraph: {
    title: 'Privacy Policy | Prescio',
    description: 'How Prescio collects, uses, and protects your personal data.',
    url: `${site}/privacy`,
    type: 'website',
  },
}

const SECTIONS = [
  {
    title: '1. Who We Are',
    body: `Prescio ("we", "our", "us") is an individually operated information and analytics service available at prescio.io. We provide AI-powered intelligence tools for prediction markets and sports analytics. For privacy matters, contact us at support@prescio.io.`,
  },
  {
    title: '2. What Data We Collect',
    body: `We collect the following categories of personal data:

• Account data: email address and password hash when you register.
• Usage data: pages visited, features used, timestamps — collected automatically via server logs and analytics.
• Payment data: when you subscribe to Prescio Pro, payment processing is handled entirely by Paddle.com (our Merchant of Record). We do not store your card details. Paddle may share with us your email, country, and subscription status.
• Communications: if you contact support, we retain your messages.`,
  },
  {
    title: '3. How We Use Your Data',
    body: `We use collected data to:

• Provide, maintain, and improve the service.
• Authenticate your account and enforce subscription access.
• Send transactional emails (account confirmation, password reset, subscription receipts).
• Detect and prevent fraud or abuse.
• Comply with legal obligations.

We do not sell your personal data to third parties. We do not use your data for advertising profiling.`,
  },
  {
    title: '4. Legal Basis for Processing',
    body: `We process your data on the following bases:

• Contract performance: to deliver the service you signed up for.
• Legitimate interests: to maintain security, prevent fraud, and improve the product.
• Legal obligation: where required by applicable law.
• Consent: where you have explicitly provided it (e.g. marketing emails, if any).`,
  },
  {
    title: '5. Data Sharing',
    body: `We share data only with trusted processors necessary to operate the service:

• Supabase — database and authentication infrastructure.
• Paddle — subscription billing and payment processing (Merchant of Record).
• Vercel / hosting provider — serving the web application.
• OpenAI / AI model providers — analysis requests are processed via their APIs; we do not send personally identifiable information in analysis prompts.

All processors are contractually bound to handle data securely and only for the purposes we specify.`,
  },
  {
    title: '6. Data Retention',
    body: `We retain your account data for as long as your account is active. If you delete your account, we remove your personal data within 30 days, except where retention is required by law (e.g. billing records, which Paddle retains per their own policy).`,
  },
  {
    title: '7. Cookies and Tracking',
    body: `We use minimal cookies required for authentication (session token). We may use privacy-respecting analytics that do not track individuals across sites. We do not use third-party advertising cookies.`,
  },
  {
    title: '8. Your Rights',
    body: `Depending on your jurisdiction, you may have the right to:

• Access the personal data we hold about you.
• Correct inaccurate data.
• Request deletion of your data ("right to be forgotten").
• Object to or restrict certain processing.
• Data portability.

To exercise any of these rights, email support@prescio.io. We will respond within 30 days.`,
  },
  {
    title: '9. Security',
    body: `We implement industry-standard measures to protect your data: HTTPS everywhere, hashed passwords, access controls, and encrypted database connections. No system is 100% secure; we will notify you of any breach affecting your data as required by law.`,
  },
  {
    title: '10. Children',
    body: `Prescio is not directed at individuals under the age of 18. We do not knowingly collect data from minors. If you believe a minor has provided us data, contact support@prescio.io and we will delete it.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify registered users of material changes by email or via an in-app notice. The "Last updated" date at the top of this page reflects the most recent revision.`,
  },
  {
    title: '12. Contact',
    body: `For any privacy-related questions or requests:\n\nEmail: support@prescio.io\nWebsite: prescio.io`,
  },
]

export default function PrivacyPage() {
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

      <h1 className="text-xl font-bold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-xs mb-10" style={{ color: 'rgb(var(--text-muted))' }}>
        Last updated: April 1, 2026
      </p>

      <p className="mb-10" style={{ color: 'rgb(var(--text-secondary))' }}>
        This policy explains what personal data Prescio collects, why, and how we protect it.
        By using Prescio you agree to the practices described here.
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
