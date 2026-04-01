export type Lang = 'en' | 'ru'

const translations = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  'nav.feed':     { en: 'FEED',    ru: 'ЛЕНТА' },
  'nav.markets':  { en: 'MARKETS', ru: 'МАРКЕТЫ' },
  'nav.sport':    { en: 'SPORT',   ru: 'СПОРТ' },
  'nav.esports':  { en: 'ESPORTS', ru: 'КИБЕРСПОРТ' },

  // ── Common ───────────────────────────────────────────────────────────────────
  'common.live':        { en: 'LIVE',       ru: 'ОНЛАЙН' },
  'common.loading':     { en: 'Loading…',   ru: 'Загрузка…' },
  'common.no_data':     { en: 'No data',    ru: 'Нет данных' },
  'common.see_all':     { en: 'See all',    ru: 'Все' },
  'common.upgrade':     { en: 'Upgrade',    ru: 'Улучшить' },
  'common.go_to_feed':  { en: 'Go to Feed →', ru: 'Перейти в ленту →' },
  'common.just_now':    { en: 'just now',   ru: 'только что' },
  'common.today':       { en: 'today',      ru: 'сегодня' },
  'common.yesterday':   { en: 'yesterday',  ru: 'вчера' },

  // ── Plans ────────────────────────────────────────────────────────────────────
  'plan.free':  { en: 'FREE',  ru: 'FREE' },
  'plan.pro':   { en: 'PRO',   ru: 'PRO' },
  'plan.alpha': { en: 'ALPHA', ru: 'ALPHA' },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  'dashboard.title':             { en: 'Dashboard',          ru: 'Главная' },
  'dashboard.top_edge':          { en: 'Top Edge Events',    ru: 'Топ Edge-событий' },
  'dashboard.watchlist':         { en: 'Watchlist',          ru: 'Вотчлист' },
  'dashboard.recent_analyses':   { en: 'Recent Analyses',    ru: 'Последние анализы' },
  'dashboard.analyses_today':    { en: 'AI Analyses today',  ru: 'AI-анализов сегодня' },
  'dashboard.searches_today':    { en: 'AI Searches today',  ru: 'AI-поисков сегодня' },
  'dashboard.upgrade_desc':      { en: 'Upgrade to Pro — 20 analyses/day + AI Search', ru: 'Перейди на Pro — 20 анализов/день + AI-поиск' },
  'dashboard.no_edge':           { en: 'No edge events right now', ru: 'Нет edge-событий прямо сейчас' },
  'dashboard.no_watchlist':      { en: 'No items in watchlist yet', ru: 'Вотчлист пуст' },
  'dashboard.no_analyses':       { en: 'No analyses yet',    ru: 'Анализов пока нет' },
  'dashboard.first_analysis':    { en: 'Run your first AI analysis', ru: 'Запусти первый AI-анализ' },
  'dashboard.browse_feed':       { en: 'Browse feed →',      ru: 'В ленту →' },
  'dashboard.watchlist_manage':  { en: 'Manage',             ru: 'Управление' },
  'dashboard.history':           { en: 'History',            ru: 'История' },

  // ── Feed ─────────────────────────────────────────────────────────────────────
  'feed.title':            { en: 'Feed',            ru: 'Лента' },
  'feed.ai_search':        { en: 'AI Search',       ru: 'AI-поиск' },
  'feed.no_events':        { en: 'No events found', ru: 'Событий не найдено' },
  'feed.sort_recent':      { en: 'Recent',          ru: 'Новые' },
  'feed.sort_edge':        { en: 'Edge',            ru: 'Edge' },
  'feed.sort_volume':      { en: 'Volume',          ru: 'Объём' },

  // ── Markets ──────────────────────────────────────────────────────────────────
  'markets.title':         { en: 'Markets',         ru: 'Маркеты' },

  // ── Sport ────────────────────────────────────────────────────────────────────
  'sport.title':           { en: 'Sport',           ru: 'Спорт' },
  'sport.upcoming':        { en: 'Upcoming',        ru: 'Предстоящие' },
  'sport.live':            { en: 'Live',            ru: 'Онлайн' },
  'sport.finished':        { en: 'Finished',        ru: 'Завершённые' },

  // ── Dota / Esports ───────────────────────────────────────────────────────────
  'dota.title':            { en: 'Esports',         ru: 'Киберспорт' },
  'dota.live_matches':     { en: 'Live Matches',    ru: 'Текущие матчи' },
  'dota.recent_matches':   { en: 'Recent Matches',  ru: 'Недавние матчи' },
  'dota.no_live':          { en: 'No live matches right now', ru: 'Матчей в эфире нет' },
  'dota.radiant':          { en: 'Radiant',         ru: 'Radiant' },
  'dota.dire':             { en: 'Dire',            ru: 'Dire' },

  // ── Event Detail ─────────────────────────────────────────────────────────────
  'event.ai_analysis':     { en: 'AI Analysis',     ru: 'AI-анализ' },
  'event.run_analysis':    { en: 'Run AI analysis', ru: 'Запустить AI-анализ' },
  'event.fair_prob':       { en: 'Fair probability',ru: 'Честная вероятность' },
  'event.edge':            { en: 'Edge',            ru: 'Edge' },
  'event.key_factors':     { en: 'Key Factors',     ru: 'Ключевые факторы' },
  'event.scenarios':       { en: 'Scenarios',       ru: 'Сценарии' },
  'event.news':            { en: 'News context',    ru: 'Контекст новостей' },
  'event.market_price':    { en: 'Market price',    ru: 'Цена рынка' },
  'event.watchlist_add':   { en: 'Add to watchlist',ru: 'Добавить в вотчлист' },
  'event.watchlist_remove':{ en: 'Remove',          ru: 'Удалить' },
  'event.resolves':        { en: 'Resolves',        ru: 'Резолюция' },
  'event.volume':          { en: 'Volume',          ru: 'Объём' },
  'event.analysis_pending':{ en: 'Analysis pending…',ru: 'Анализ в очереди…' },

  // ── Paywall ──────────────────────────────────────────────────────────────────
  'paywall.title':         { en: 'Upgrade to Pro',  ru: 'Перейти на Pro' },
  'paywall.limit_reached': { en: 'Daily limit reached', ru: 'Дневной лимит исчерпан' },
  'paywall.free_limit':    { en: '3 AI analyses per day on Free plan', ru: '3 AI-анализа в день на Free-плане' },
  'paywall.pro_cta':       { en: 'Get Pro — $15/mo', ru: 'Перейти на Pro — $15/мес' },
  'paywall.cancel_any':    { en: 'Cancel anytime',  ru: 'Отмена в любое время' },

  // ── Auth ─────────────────────────────────────────────────────────────────────
  'auth.sign_in':          { en: 'Sign in',         ru: 'Войти' },
  'auth.sign_up':          { en: 'Sign up',         ru: 'Регистрация' },
  'auth.sign_out':         { en: 'Sign out',        ru: 'Выйти' },
  'auth.email':            { en: 'Email',           ru: 'Email' },
  'auth.password':         { en: 'Password',        ru: 'Пароль' },
  'auth.forgot_password':  { en: 'Forgot password?',ru: 'Забыли пароль?' },
  'auth.no_account':       { en: "Don't have an account?", ru: 'Нет аккаунта?' },
  'auth.have_account':     { en: 'Already have an account?', ru: 'Уже есть аккаунт?' },
  'auth.continue_google':  { en: 'Continue with Google', ru: 'Войти через Google' },

  // ── Profile ──────────────────────────────────────────────────────────────────
  'profile.title':         { en: 'Profile',         ru: 'Профиль' },
  'profile.subscription':  { en: 'Subscription',    ru: 'Подписка' },
  'profile.billing':       { en: 'Billing portal',  ru: 'Управление оплатой' },
  'profile.language':      { en: 'Language',        ru: 'Язык' },
  'profile.theme':         { en: 'Theme',           ru: 'Тема' },

  // ── Landing ──────────────────────────────────────────────────────────────────
  'landing.hero_heading':  { en: 'Markets are wrong.\nPrescio shows you where.', ru: 'Рынки ошибаются.\nPrescio показывает где.' },
  'landing.hero_sub':      { en: 'AI-powered analytics for prediction markets, sports, esports, and crypto.', ru: 'AI-аналитика для prediction markets, спорта, киберспорта и крипто.' },
  'landing.cta_primary':   { en: 'Get started for free →', ru: 'Начать бесплатно →' },
  'landing.cta_secondary': { en: 'See how it works',       ru: 'Как это работает' },
  'landing.stop_guessing': { en: 'Stop guessing.',         ru: 'Хватит гадать.' },
  'landing.start_seeing':  { en: 'Start seeing.',          ru: 'Начни видеть.' },

  // ── Status ───────────────────────────────────────────────────────────────────
  'status.connecting': { en: 'CONNECTING', ru: 'ПОДКЛЮЧЕНИЕ' },
  'status.live':       { en: 'LIVE',       ru: 'ОНЛАЙН' },
  'status.updating':   { en: 'UPDATING',   ru: 'ОБНОВЛЕНИЕ' },
  'status.stale':      { en: 'STALE',      ru: 'УСТАРЕЛО' },
  'status.offline':    { en: 'OFFLINE',    ru: 'ОФЛАЙН' },

  // ── Watchlist ────────────────────────────────────────────────────────────────
  'watchlist.title':   { en: 'Watchlist',  ru: 'Вотчлист' },
  'watchlist.events':  { en: 'Events',     ru: 'События' },
  'watchlist.markets': { en: 'Markets',    ru: 'Маркеты' },
  'watchlist.empty_events':  { en: 'No events in watchlist yet.', ru: 'В вотчлисте пока нет событий.' },
  'watchlist.empty_markets': { en: 'No markets in watchlist yet.', ru: 'В вотчлисте пока нет маркетов.' },
  'watchlist.browse_feed':   { en: 'Browse the feed and click Watch to add events.', ru: 'Открой ленту и нажми Watch чтобы добавить событие.' },
  'watchlist.open_market':   { en: 'Open a market and click Watch to add it.', ru: 'Открой маркет и нажми Watch чтобы добавить его.' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key]
  if (!entry) return key
  return entry[lang] ?? entry.en
}

/** Хук-обёртка — используй внутри компонентов через useLang() */
export function useT(lang: Lang) {
  return (key: TranslationKey) => t(key, lang)
}
