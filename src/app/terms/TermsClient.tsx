'use client'

import Link from 'next/link'
import { useLang } from '@/contexts/LanguageContext'
import { useT } from '@/lib/i18n'

const SECTIONS_EN = [
  {
    title: '1. About Prescio',
    body: `Prescio ("we", "us", "our") is an AI-powered information and analytics platform for prediction markets and sports. We provide intelligence tools, market data aggregation, and AI-generated analysis to help users make better-informed decisions. Prescio does not operate a prediction market, does not accept bets or wagers, and does not provide financial or investment advice.\n\nThe service is individually operated and available at prescio.io.`,
  },
  {
    title: '2. Acceptance of Terms',
    body: `By accessing or using Prescio you confirm that you are at least 18 years old and agree to be bound by these Terms of Service. If you do not agree, do not use the service.\n\nWe may update these Terms from time to time. Continued use after changes constitutes acceptance of the revised Terms. We will notify registered users of material changes by email or in-app notice.`,
  },
  {
    title: '3. Nature of the Service',
    body: `Prescio is an informational and analytical service. All content — including AI-generated analysis, market probability summaries, and sports data — is provided for informational purposes only.\n\nNothing on Prescio constitutes financial, investment, legal, or betting advice. Prediction markets involve risk; past performance and AI analysis do not guarantee future outcomes. You are solely responsible for any decisions you make based on information from Prescio.`,
  },
  {
    title: '4. Accounts',
    body: `You must provide a valid email address to register. You are responsible for keeping your credentials confidential and for all activity under your account. Notify us immediately at support@prescio.io if you suspect unauthorized access.\n\nWe reserve the right to suspend or terminate accounts that violate these Terms.`,
  },
  {
    title: '5. Prescio Pro Subscription',
    body: `Prescio offers a paid subscription ("Prescio Pro") that unlocks additional features including unlimited AI analysis. Subscriptions are billed on a recurring basis (monthly or annual) through Paddle.com, our authorized Merchant of Record.\n\nBy subscribing you also agree to Paddle's Terms of Service and Privacy Policy. Paddle handles all payment processing, invoicing, and applicable taxes on our behalf.`,
  },
  {
    title: '6. Refund Policy',
    body: `All subscription payments are final and non-refundable except:\n\n• Where required by applicable consumer protection law (e.g. statutory 14-day cooling-off period in the EU/UK for digital services not yet activated).\n• At our sole discretion in cases of clear billing error or service unavailability exceeding 72 consecutive hours.\n\nTo request a refund, email legal@prescio.io with your order details within 14 days of the charge. Paddle, as Merchant of Record, may also handle refund requests directly in accordance with their policies.\n\nDowngrading or canceling a subscription stops future charges but does not entitle you to a prorated refund for the current billing period.`,
  },
  {
    title: '7. Cancellation',
    body: `You may cancel your subscription at any time from your account settings or by contacting support@prescio.io. Cancellation takes effect at the end of the current billing period; you retain Pro access until that date. No partial refunds are issued for unused days.`,
  },
  {
    title: '8. Acceptable Use',
    body: `You agree not to:\n\n• Scrape, crawl, or systematically extract data from Prescio without written permission.\n• Reverse-engineer, decompile, or attempt to extract source code.\n• Use the service to train AI models or build competing products without authorization.\n• Share, resell, or sublicense your account or Pro features.\n• Attempt to circumvent paywalls, rate limits, or access controls.\n• Use the service in any way that violates applicable law.\n\nViolations may result in immediate account termination without refund.`,
  },
  {
    title: '9. Intellectual Property',
    body: `All content, design, code, and AI-generated outputs on Prescio are owned by or licensed to us. You may use analysis outputs for your personal, non-commercial decision-making. You may not republish, redistribute, or commercially exploit Prescio content without written permission.\n\nMarket data sourced from third-party platforms (Polymarket, Kalshi, Metaculus, etc.) remains the property of those platforms subject to their respective terms.`,
  },
  {
    title: '10. Disclaimer of Warranties',
    body: `Prescio is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that AI-generated analysis will be accurate, complete, or suitable for any purpose.\n\nPrediction markets and sports outcomes are inherently uncertain. Use Prescio outputs as one input among many — not as the sole basis for decisions involving real money.`,
  },
  {
    title: '11. Limitation of Liability',
    body: `To the maximum extent permitted by law, Prescio and its operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to losses from trading, betting, or investment decisions informed by Prescio content.\n\nOur total liability to you for any claim shall not exceed the amount you paid us in the 3 months preceding the claim.`,
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

const SECTIONS_RU = [
  {
    title: '1. О Prescio',
    body: `Prescio («мы», «нас», «наш») — информационно-аналитическая платформа на базе AI для рынков предсказаний и спорта. Мы предоставляем инструменты аналитики, агрегацию рыночных данных и AI-анализ для помощи пользователям в принятии более взвешенных решений. Prescio не является рынком предсказаний, не принимает ставки и не предоставляет финансовые или инвестиционные консультации.\n\nСервис управляется индивидуально и доступен по адресу prescio.io.`,
  },
  {
    title: '2. Принятие условий',
    body: `Используя Prescio, вы подтверждаете, что вам не менее 18 лет, и соглашаетесь с настоящими Условиями использования. Если вы не согласны, не используйте сервис.\n\nМы можем периодически обновлять Условия. Продолжение использования после изменений означает принятие обновлённых Условий. О существенных изменениях мы уведомим зарегистрированных пользователей по электронной почте или через уведомление в приложении.`,
  },
  {
    title: '3. Характер сервиса',
    body: `Prescio является информационным и аналитическим сервисом. Весь контент — включая AI-анализ, сводки вероятностей рынка и спортивные данные — предоставляется исключительно в информационных целях.\n\nНичто на Prescio не является финансовой, инвестиционной, юридической или беттинговой рекомендацией. Рынки предсказаний сопряжены с риском; прошлые результаты и AI-анализ не гарантируют будущих результатов. Вы несёте полную ответственность за любые решения, принятые на основе информации из Prescio.`,
  },
  {
    title: '4. Аккаунты',
    body: `Для регистрации вы должны предоставить действительный адрес электронной почты. Вы несёте ответственность за конфиденциальность своих учётных данных и за все действия в вашем аккаунте. Немедленно уведомьте нас по адресу support@prescio.io, если подозреваете несанкционированный доступ.\n\nМы оставляем за собой право приостановить или удалить аккаунты, нарушающие настоящие Условия.`,
  },
  {
    title: '5. Подписка Prescio Pro',
    body: `Prescio предлагает платную подписку («Prescio Pro»), открывающую дополнительные функции, включая неограниченный AI-анализ. Подписки оплачиваются на регулярной основе (ежемесячно или ежегодно) через Paddle.com, нашего официального торговца.\n\nОформляя подписку, вы также соглашаетесь с Условиями использования и Политикой конфиденциальности Paddle. Paddle обрабатывает все платежи, выставляет счета и рассчитывает применимые налоги от нашего имени.`,
  },
  {
    title: '6. Политика возврата',
    body: `Все платежи за подписку являются окончательными и не подлежат возврату, за исключением:\n\n• Случаев, предусмотренных применимым законодательством о защите прав потребителей (например, установленный 14-дневный период отказа в ЕС/Великобритании для цифровых услуг, ещё не активированных).\n• По нашему усмотрению в случаях явной ошибки биллинга или недоступности сервиса более 72 часов подряд.\n\nДля запроса возврата отправьте письмо на legal@prescio.io с деталями заказа в течение 14 дней с момента списания. Paddle, как официальный торговец, также может обрабатывать запросы на возврат в соответствии со своей политикой.\n\nПонижение уровня или отмена подписки прекращает будущие списания, но не даёт права на пропорциональный возврат за текущий период.`,
  },
  {
    title: '7. Отмена подписки',
    body: `Вы можете отменить подписку в любое время в настройках аккаунта или обратившись на support@prescio.io. Отмена вступает в силу по окончании текущего расчётного периода; до этой даты доступ к Pro сохраняется. Частичный возврат за неиспользованные дни не предусмотрен.`,
  },
  {
    title: '8. Допустимое использование',
    body: `Вы соглашаетесь не:\n\n• Выполнять скрейпинг, краулинг или систематическое извлечение данных из Prescio без письменного разрешения.\n• Проводить обратную разработку, декомпилировать или пытаться извлечь исходный код.\n• Использовать сервис для обучения AI-моделей или создания конкурирующих продуктов без разрешения.\n• Делиться, перепродавать или сублицензировать свой аккаунт или функции Pro.\n• Пытаться обойти пейволы, ограничения запросов или средства контроля доступа.\n• Использовать сервис способами, нарушающими применимое законодательство.\n\nНарушения могут повлечь немедленное удаление аккаунта без возврата средств.`,
  },
  {
    title: '9. Интеллектуальная собственность',
    body: `Весь контент, дизайн, код и AI-сгенерированные результаты на Prescio принадлежат нам или лицензированы нами. Вы можете использовать результаты анализа для личных, некоммерческих целей. Вы не вправе воспроизводить, распространять или коммерчески эксплуатировать контент Prescio без письменного разрешения.\n\nРыночные данные, полученные от сторонних платформ (Polymarket, Kalshi, Metaculus и др.), остаются собственностью этих платформ в соответствии с их условиями.`,
  },
  {
    title: '10. Отказ от гарантий',
    body: `Prescio предоставляется «как есть» и «по мере доступности» без каких-либо явных или подразумеваемых гарантий. Мы не гарантируем бесперебойную или безошибочную работу сервиса, а также точность, полноту или пригодность AI-анализа для какой-либо цели.\n\nРезультаты рынков предсказаний и спортивные исходы изначально неопределённы. Используйте данные Prescio как один из факторов, а не как единственную основу для решений, связанных с реальными деньгами.`,
  },
  {
    title: '11. Ограничение ответственности',
    body: `В максимальной степени, допустимой законом, Prescio и его оператор не несут ответственности за какой-либо косвенный, случайный, специальный, последующий или штрафной ущерб, возникший в результате использования сервиса, включая убытки от торговли, ставок или инвестиционных решений на основе контента Prescio.\n\nНаша совокупная ответственность перед вами по любому требованию не превышает суммы, уплаченной вами нам за 3 месяца, предшествующих требованию.`,
  },
  {
    title: '12. Применимое право',
    body: `Настоящие Условия регулируются законодательством Республики Казахстан. Споры разрешаются в судах Казахстана, если только обязательное местное законодательство о защите прав потребителей в вашей юрисдикции не предусматривает иного.`,
  },
  {
    title: '13. Контакты',
    body: `По вопросам, касающимся настоящих Условий:\n\nEmail: legal@prescio.io\nПоддержка: support@prescio.io\nСайт: prescio.io`,
  },
]

export default function TermsClient() {
  const { lang } = useLang()
  const tr = useT(lang)
  const sections = lang === 'ru' ? SECTIONS_RU : SECTIONS_EN

  return (
    <div
      className="min-h-screen font-mono text-sm px-6 py-16 mx-auto max-w-2xl leading-relaxed"
      style={{ background: 'rgb(var(--bg-base))', color: 'rgb(var(--text-primary))' }}
    >
      <p className="text-xs mb-8" style={{ color: 'rgb(var(--text-muted))' }}>
        <Link href="/" className="hover:underline transition-colors">
          {tr('legal.back_home')}
        </Link>
      </p>

      <h1 className="text-xl font-bold tracking-tight mb-2">{tr('terms.title')}</h1>
      <p className="text-xs mb-10" style={{ color: 'rgb(var(--text-muted))' }}>
        {tr('legal.last_updated')} April 1, 2026
      </p>

      <p className="mb-10" style={{ color: 'rgb(var(--text-secondary))' }}>
        {tr('terms.intro')}
      </p>

      <div className="flex flex-col gap-8">
        {sections.map(({ title, body }) => (
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
          © {new Date().getFullYear()} Prescio. {lang === 'ru' ? 'Все права защищены.' : 'All rights reserved.'}
        </p>
      </div>
    </div>
  )
}
