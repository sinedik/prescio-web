'use client'

import Link from 'next/link'
import { useLang } from '@/contexts/LanguageContext'
import { useT } from '@/lib/i18n'

const SECTIONS_EN = [
  {
    title: '1. Who We Are',
    body: `Prescio ("we", "our", "us") is an individually operated information and analytics service available at prescio.io. We provide AI-powered intelligence tools for prediction markets and sports analytics. For privacy matters, contact us at support@prescio.io.`,
  },
  {
    title: '2. What Data We Collect',
    body: `We collect the following categories of personal data:\n\n• Account data: email address and password hash when you register.\n• Usage data: pages visited, features used, timestamps — collected automatically via server logs and analytics.\n• Payment data: when you subscribe to Prescio Pro, payment processing is handled entirely by Paddle.com (our Merchant of Record). We do not store your card details. Paddle may share with us your email, country, and subscription status.\n• Communications: if you contact support, we retain your messages.`,
  },
  {
    title: '3. How We Use Your Data',
    body: `We use collected data to:\n\n• Provide, maintain, and improve the service.\n• Authenticate your account and enforce subscription access.\n• Send transactional emails (account confirmation, password reset, subscription receipts).\n• Detect and prevent fraud or abuse.\n• Comply with legal obligations.\n\nWe do not sell your personal data to third parties. We do not use your data for advertising profiling.`,
  },
  {
    title: '4. Legal Basis for Processing',
    body: `We process your data on the following bases:\n\n• Contract performance: to deliver the service you signed up for.\n• Legitimate interests: to maintain security, prevent fraud, and improve the product.\n• Legal obligation: where required by applicable law.\n• Consent: where you have explicitly provided it (e.g. marketing emails, if any).`,
  },
  {
    title: '5. Data Sharing',
    body: `We share data only with trusted processors necessary to operate the service:\n\n• Supabase — database and authentication infrastructure.\n• Paddle — subscription billing and payment processing (Merchant of Record).\n• Vercel / hosting provider — serving the web application.\n• OpenAI / AI model providers — analysis requests are processed via their APIs; we do not send personally identifiable information in analysis prompts.\n\nAll processors are contractually bound to handle data securely and only for the purposes we specify.`,
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
    body: `Depending on your jurisdiction, you may have the right to:\n\n• Access the personal data we hold about you.\n• Correct inaccurate data.\n• Request deletion of your data ("right to be forgotten").\n• Object to or restrict certain processing.\n• Data portability.\n\nTo exercise any of these rights, email support@prescio.io. We will respond within 30 days.`,
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

const SECTIONS_RU = [
  {
    title: '1. О нас',
    body: `Prescio («мы», «наш», «нас») — индивидуально управляемый информационный и аналитический сервис, доступный по адресу prescio.io. Мы предоставляем инструменты на базе AI для рынков предсказаний и спортивной аналитики. По вопросам конфиденциальности обращайтесь: support@prescio.io.`,
  },
  {
    title: '2. Какие данные мы собираем',
    body: `Мы собираем следующие категории персональных данных:\n\n• Данные аккаунта: адрес электронной почты и хэш пароля при регистрации.\n• Данные использования: посещённые страницы, используемые функции, временны́е метки — собираются автоматически через логи сервера и аналитику.\n• Платёжные данные: при подписке на Prescio Pro обработка платежей осуществляется полностью через Paddle.com (наш официальный торговец). Мы не храним данные вашей карты. Paddle может передавать нам ваш email, страну и статус подписки.\n• Переписка: если вы обращаетесь в поддержку, мы сохраняем ваши сообщения.`,
  },
  {
    title: '3. Как мы используем ваши данные',
    body: `Мы используем собранные данные для:\n\n• Предоставления, поддержки и улучшения сервиса.\n• Аутентификации аккаунта и контроля доступа к подписке.\n• Отправки транзакционных писем (подтверждение аккаунта, сброс пароля, квитанции подписки).\n• Обнаружения и предотвращения мошенничества или злоупотреблений.\n• Соблюдения правовых обязательств.\n\nМы не продаём ваши персональные данные третьим лицам. Мы не используем ваши данные для рекламного профилирования.`,
  },
  {
    title: '4. Правовые основания для обработки',
    body: `Мы обрабатываем ваши данные на следующих основаниях:\n\n• Исполнение договора: для предоставления сервиса, на который вы зарегистрировались.\n• Законные интересы: для обеспечения безопасности, предотвращения мошенничества и улучшения продукта.\n• Правовое обязательство: там, где это требуется применимым законодательством.\n• Согласие: там, где вы его явно предоставили (например, маркетинговые письма, при наличии).`,
  },
  {
    title: '5. Передача данных',
    body: `Мы передаём данные только доверенным обработчикам, необходимым для работы сервиса:\n\n• Supabase — инфраструктура базы данных и аутентификации.\n• Paddle — биллинг подписки и обработка платежей (официальный торговец).\n• Vercel / хостинг-провайдер — обслуживание веб-приложения.\n• OpenAI / провайдеры AI-моделей — запросы на анализ обрабатываются через их API; мы не передаём персональные данные в промпты анализа.\n\nВсе обработчики обязаны по договору обрабатывать данные безопасно и только в указанных нами целях.`,
  },
  {
    title: '6. Хранение данных',
    body: `Мы храним данные вашего аккаунта до тех пор, пока он активен. Если вы удалите аккаунт, мы удалим ваши персональные данные в течение 30 дней, за исключением случаев, когда хранение требуется по закону (например, записи о биллинге, которые Paddle хранит согласно своей политике).`,
  },
  {
    title: '7. Файлы cookie и отслеживание',
    body: `Мы используем минимальный набор файлов cookie, необходимых для аутентификации (токен сессии). Мы можем использовать аналитику, уважающую конфиденциальность, которая не отслеживает пользователей на разных сайтах. Мы не используем сторонние рекламные cookie.`,
  },
  {
    title: '8. Ваши права',
    body: `В зависимости от вашей юрисдикции у вас могут быть следующие права:\n\n• Доступ к персональным данным, которые мы храним о вас.\n• Исправление неточных данных.\n• Запрос на удаление данных («право на забвение»).\n• Возражение против определённых видов обработки или её ограничение.\n• Переносимость данных.\n\nДля реализации любого из этих прав отправьте письмо на support@prescio.io. Мы ответим в течение 30 дней.`,
  },
  {
    title: '9. Безопасность',
    body: `Мы применяем отраслевые стандарты защиты данных: HTTPS повсеместно, хэшированные пароли, контроль доступа и зашифрованные соединения с базой данных. Ни одна система не является на 100% защищённой; мы уведомим вас о любой утечке, затронувшей ваши данные, в соответствии с требованиями закона.`,
  },
  {
    title: '10. Несовершеннолетние',
    body: `Prescio не предназначен для лиц моложе 18 лет. Мы сознательно не собираем данные несовершеннолетних. Если вы считаете, что несовершеннолетний предоставил нам свои данные, обратитесь на support@prescio.io — мы удалим их.`,
  },
  {
    title: '11. Изменения в политике',
    body: `Мы можем время от времени обновлять настоящую Политику конфиденциальности. О существенных изменениях мы уведомим зарегистрированных пользователей по электронной почте или через уведомление в приложении. Дата «Последнего обновления» вверху этой страницы отражает последнюю редакцию.`,
  },
  {
    title: '12. Контакты',
    body: `По любым вопросам, связанным с конфиденциальностью:\n\nEmail: support@prescio.io\nСайт: prescio.io`,
  },
]

export default function PrivacyClient() {
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

      <h1 className="text-xl font-bold tracking-tight mb-2">{tr('privacy.title')}</h1>
      <p className="text-xs mb-10" style={{ color: 'rgb(var(--text-muted))' }}>
        {tr('legal.last_updated')} April 1, 2026
      </p>

      <p className="mb-10" style={{ color: 'rgb(var(--text-secondary))' }}>
        {tr('privacy.intro')}
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
