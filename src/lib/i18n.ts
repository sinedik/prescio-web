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

  // ── Landing (full) ───────────────────────────────────────────────────────────
  'landing.nav.how_it_works':    { en: 'How it works',  ru: 'Как работает' },
  'landing.nav.pricing':         { en: 'Pricing',        ru: 'Цены' },
  'landing.nav.sign_in':         { en: 'Sign In',        ru: 'Войти' },

  'landing.hero.badge':          { en: 'AI-POWERED INTELLIGENCE PLATFORM', ru: 'AI-ПЛАТФОРМА АНАЛИТИКИ' },
  'landing.hero.headline1':      { en: 'Markets are wrong.', ru: 'Рынки ошибаются.' },
  'landing.hero.headline2':      { en: 'Prescio shows you where.', ru: 'Prescio показывает где.' },
  'landing.hero.desc':           { en: 'AI-powered analytics for prediction markets, sports, esports, and crypto. One platform to track everything — Pro users get AI edge analysis before the crowd corrects them.', ru: 'AI-аналитика для предсказательных рынков, спорта, киберспорта и крипто. Одна платформа — Pro-пользователи получают AI-анализ до того, как толпа исправит рынок.' },
  'landing.hero.cta_free':       { en: 'Start for free →', ru: 'Начать бесплатно →' },
  'landing.hero.sign_in':        { en: 'Sign in', ru: 'Войти' },
  'landing.hero.no_card':        { en: 'No credit card required to start', ru: 'Карта не нужна для старта' },
  'landing.hero.subtitle':       { en: 'markets · sports · esports · crypto', ru: 'рынки · спорт · киберспорт · крипто' },
  'landing.hero.pill_markets':   { en: 'Prediction markets', ru: 'Предсказательные рынки' },
  'landing.hero.pill_sports':    { en: 'Sports analytics', ru: 'Спортивная аналитика' },
  'landing.hero.pill_esports':   { en: 'Esports', ru: 'Киберспорт' },
  'landing.hero.pill_crypto':    { en: 'Crypto signals', ru: 'Крипто-сигналы' },

  'landing.stats.volume':        { en: 'Prediction market volume', ru: 'Объём предсказательных рынков' },
  'landing.stats.leagues':       { en: 'Football leagues covered', ru: 'Футбольных лиг' },
  'landing.stats.assets':        { en: 'Asset classes', ru: 'Класса активов' },

  'landing.pillars.headline':    { en: 'One platform. Four markets.', ru: 'Одна платформа. Четыре рынка.' },
  'landing.pillars.sub':         { en: "AI finds mispriced probability — whether it's a Polymarket question, a Champions League match, a Dota 2 tournament, or a crypto coin.", ru: 'AI находит неверно оценённую вероятность — в вопросе Polymarket, матче ЛЧ, турнире Dota 2 или крипто-монете.' },
  'landing.pillars.pm_title':    { en: 'Find mispriced markets', ru: 'Найти недооценённые рынки' },
  'landing.pillars.pm_desc':     { en: 'Polymarket, Kalshi, and Metaculus — scanned every 2 hours. AI cross-references primary sources to find where crowd probability diverges from reality.', ru: 'Polymarket, Kalshi и Metaculus — сканирование каждые 2 часа. AI сопоставляет первоисточники, чтобы найти где вероятность толпы расходится с реальностью.' },
  'landing.pillars.pm_b1':       { en: 'Resolution criteria analysis — read the fine print', ru: 'Анализ условий разрешения — читаем мелкий шрифт' },
  'landing.pillars.pm_b2':       { en: 'ISW · AP · BBC · official briefings', ru: 'ISW · AP · BBC · официальные брифинги' },
  'landing.pillars.pm_b3':       { en: 'Kelly-optimal position sizing', ru: 'Оптимальный размер позиции по Келли' },
  'landing.pillars.sports_title':{ en: 'Spot value in football odds', ru: 'Ценность в футбольных коэффициентах' },
  'landing.pillars.sports_desc': { en: 'AI models match form, injuries, and historical data to find where bookmaker odds diverge from real probability — across the top 15+ football leagues.', ru: 'AI моделирует форму команд, травмы и историю, чтобы найти где коэффициенты расходятся с реальной вероятностью — по 15+ лигам.' },
  'landing.pillars.sports_b1':   { en: 'Form, injuries, head-to-head, venue stats', ru: 'Форма, травмы, личные встречи, стадион' },
  'landing.pillars.sports_b2':   { en: 'Expected goals (xG) model', ru: 'Модель ожидаемых голов (xG)' },
  'landing.pillars.sports_b3':   { en: 'Value bet detection across 15+ leagues', ru: 'Поиск ценных ставок в 15+ лигах' },
  'landing.pillars.esports_title':{ en: 'Dota 2 match intelligence', ru: 'Аналитика матчей Dota 2' },
  'landing.pillars.esports_desc':{ en: 'Live Dota 2 match tracking with AI win probability. Draft analysis, team form, tournament context — everything in one feed.', ru: 'Отслеживание матчей Dota 2 в реальном времени с AI-вероятностью победы. Анализ дрефта, форма команды — всё в одной ленте.' },
  'landing.pillars.esports_b1':  { en: 'Live match tracking with win probability', ru: 'Отслеживание матчей с вероятностью победы' },
  'landing.pillars.esports_b2':  { en: 'Draft analysis & team form', ru: 'Анализ дрефта и форма команды' },
  'landing.pillars.esports_b3':  { en: 'Tournament context & historical data', ru: 'Контекст турнира и исторические данные' },
  'landing.pillars.crypto_title':{ en: 'AI signals on coin markets', ru: 'AI-сигналы на крипто-рынках' },
  'landing.pillars.crypto_desc': { en: "Track major coins with AI-generated market signals. Prescio aggregates on-chain data, volume patterns, and market structure to highlight what's worth watching.", ru: 'Отслеживайте монеты с AI-сигналами. Prescio агрегирует on-chain данные, паттерны объёма и структуру рынка.' },
  'landing.pillars.crypto_b1':   { en: 'On-chain data · volume · market structure', ru: 'On-chain данные · объём · структура рынка' },
  'landing.pillars.crypto_b2':   { en: 'AI sentiment and trend signals', ru: 'AI-сигналы сентимента и тренда' },
  'landing.pillars.crypto_b3':   { en: 'Available in the same Markets feed', ru: 'Доступно в той же ленте Маркетов' },

  'landing.how.title':           { en: 'How it works', ru: 'Как работает' },
  'landing.how.subtitle':        { en: 'Three steps, every two hours.', ru: 'Три шага, каждые два часа.' },
  'landing.how.s1_title':        { en: 'Aggregates four market types', ru: 'Агрегирует четыре типа рынков' },
  'landing.how.s1_desc':         { en: 'Prescio aggregates Polymarket, Kalshi, Metaculus, live football odds, esports matches, and crypto markets — filtering hundreds of signals down to the ones worth watching.', ru: 'Prescio агрегирует Polymarket, Kalshi, Metaculus, котировки футбола, матчи киберспорта и крипто-рынки — фильтруя сотни сигналов до тех, что достойны внимания.' },
  'landing.how.s2_title':        { en: 'Cross-references curated data', ru: 'Сопоставляет отобранные данные' },
  'landing.how.s2_desc':         { en: 'For prediction markets: ISW, AP, BBC, official briefings. For sports: match stats, xG models, injury reports, head-to-head history. Not Twitter. Not Reddit. The signal, not the noise.', ru: 'Для предсказательных рынков: ISW, AP, BBC, официальные брифинги. Для спорта: xG-модели, отчёты о травмах. Не Twitter. Не Reddit. Сигнал, а не шум.' },
  'landing.how.s3_title':        { en: 'Free: track everything. Pro: act with edge.', ru: 'Free: следите за всем. Pro: действуйте с преимуществом.' },
  'landing.how.s3_desc':         { en: 'Free users track prediction markets and sports live — prices, odds, and resolution dates. Pro users get AI edge analysis, fair value estimates, and Kelly-optimal position sizing.', ru: 'Free-пользователи отслеживают рынки и спорт в реальном времени. Pro получают AI-анализ, оценку справедливой стоимости и оптимальный размер позиции по Келли.' },

  'landing.why.title':           { en: 'Why Prescio', ru: 'Почему Prescio' },
  'landing.why.c1_title':        { en: 'Value where others see noise', ru: 'Ценность там, где другие видят шум' },
  'landing.why.c1_desc':         { en: 'In prediction markets: the crowd prices fear, not resolution criteria. In football: bookmakers price narratives, not xG. Prescio surfaces the gap.', ru: 'На предсказательных рынках: толпа оценивает страх, а не условия. В футболе: букмекеры оценивают нарратив, а не xG. Prescio показывает разрыв.' },
  'landing.why.c2_title':        { en: 'Curated data, not aggregated noise', ru: 'Отобранные данные, а не шум' },
  'landing.why.c2_desc':         { en: 'Prediction markets: ISW, AP, BBC, official briefings. Sports: match stats, xG models, injury reports, head-to-head history. No Twitter. No Reddit.', ru: 'Предсказательные рынки: ISW, AP, BBC, брифинги. Спорт: xG-модели, отчёты о травмах. Никакого Twitter. Никакого Reddit.' },
  'landing.why.c3_title':        { en: 'Mathematically optimal sizing', ru: 'Математически оптимальный размер позиции' },
  'landing.why.c3_desc':         { en: 'Quarter Kelly by default. Half Kelly when you have a track record. Never guessing, never overbet. Position size that survives variance — for both markets.', ru: 'Четверть Келли по умолчанию. Половина Келли при наличии трекрекорда. Никаких догадок. Размер позиции, который выдерживает дисперсию.' },

  'landing.cta.headline1':       { en: 'Stop guessing.', ru: 'Прекратите гадать.' },
  'landing.cta.headline2':       { en: 'Start seeing.', ru: 'Начните видеть.' },
  'landing.cta.desc':            { en: 'Free to track. Pro to get the edge. No credit card required to start.', ru: 'Отслеживание бесплатно. Преимущество — с Pro. Карта не нужна.' },
  'landing.cta.button':          { en: 'Get started for free →', ru: 'Начать бесплатно →' },

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
