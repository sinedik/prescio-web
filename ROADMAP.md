# prescio-web — Roadmap

## Текущее состояние

### Готово
| Область | Что работает |
|---------|-------------|
| **Landing page** | Маркетинговая страница с hero, фичами, CTA на pricing |
| **Auth** | Вход/регистрация, forgot password, onboarding flow |
| **Feed** | Список unified events с фильтрами по категории/источнику |
| **Markets** | Браузер маркетов, detail страница с анализом и odds |
| **Events** | Detail страница события с Metaculus данными |
| **Sport** | Список спортивных событий, detail страница |
| **Dota 2** | Live серии (polling 30s), история матчей, match detail (live + finished) |
| **Dota live** | Minimap, hero rows (dead overlay, ult dot, aegis, GPM/CS, items), respawn countdown |
| **Watchlist** | Сохранение событий/маркетов |
| **Portfolio** | Позиции, P&L |
| **Search overlay** | AI-поиск с историей |
| **Paywall** | Modal + banner, Paddle checkout |
| **Pricing page** | Free/Pro/Alpha тиры |
| **SEO base** | robots.ts, sitemap.ts, og:image, JSON-LD |
| **Deploy** | Vercel |

### Известные проблемы
| Проблема | Приоритет |
|----------|-----------|
| Dashboard пустой — нет meaningful content | Critical |
| Нет error boundaries — при сбое API белый экран | High |
| AI анализ в MarketDetail не всегда загружается | High |
| Mobile: не проверен responsive на реальных устройствах | High |
| Edge highlighting отсутствует — не видно где рынок ошибается | High |
| Onboarding не объясняет ценность продукта понятно | Medium |
| CS2 страниц нет | High |
| `tsconfig.tsbuildinfo` попал в git | Low |

---

## Roadmap

### Phase 0 — Hardening (сейчас)
**Цель:** нет белых экранов, понятно что делает продукт

| Задача | Приоритет | Критерий |
|--------|-----------|----------|
| Error boundaries на все screens | Critical | При сбое API — сообщение, не крэш |
| Dashboard — показывать топ-5 событий с edge_score + последние анализы | Critical | Юзер видит ценность сразу после входа |
| Edge highlight в FeedCard / MarketCard — AI prob vs market prob | High | Визуально выделено где AI не согласен с рынком |
| `npx tsc --noEmit` чистый билд | High | Нет TypeScript ошибок |

---

### Phase 1 — CS2 + Onboarding (1–2 недели)
**Цель:** второй киберспорт готов, новый пользователь понимает продукт

| Задача | Приоритет | Критерий |
|--------|-----------|----------|
| CS2 screen — история матчей (аналог DotaScreen) | Critical | `/cs2` работает |
| CS2 match detail — карты, игроки, статистика | High | `/cs2/:matchId` |
| Навигация — добавить CS2 в sidebar/tab bar | High | Юзер видит CS2 в меню |
| Onboarding redesign — 3 шага: "что это", "как работает", "выбери интересы" | High | Bounce rate на онбординге < 40% |
| Paywall — определить точный лимит для Free vs Pro | Critical | Реализовать в UI (не "безлимит") |
| Pro plan UI — показывать сколько анализов осталось сегодня | High | Виджет в header или profile |

---

### Phase 2 — Engagement (3–5 недели)
**Цель:** пользователи возвращаются, есть причина заходить каждый день

| Задача | Приоритет | Критерий |
|--------|-----------|----------|
| Watchlist triggers — уведомление когда событие из вотчлиста изменилось | High | In-app notification badge |
| Price history chart — график изменения вероятности в MarketDetail | High | Виден тренд за 7/30 дней |
| AI анализ — показывать reasoning "почему такая вероятность" | High | Юзер понимает логику AI |
| Mobile audit — проверить все экраны на 375px | High | Нет горизонтального скролла |
| Notification center — список всех алертов | Medium | Страница `/notifications` |

---

### Phase 3 — Growth (1–3 месяц)
| Задача | Приоритет |
|--------|-----------|
| LoL screen (аналог CS2) | Medium |
| Landing page A/B тест — разные value propositions | Medium |
| Sharing — поделиться анализом события по ссылке (публичная) | High |
| Embeds — виджет маркета для внешних сайтов | Low |
| PWA / мобильное приложение | Low |

---

## Монетизация (план по лимитам)

| Фича | Free | Pro | Alpha |
|------|------|-----|-------|
| Feed и маркеты | Да | Да | Да |
| AI анализ события | 3/день | 20/день | Безлимит |
| AI поиск | — | 10/день | Безлимит |
| Live Dota/CS2 | Да | Да | Да |
| История матчей | 7 дней | 90 дней | Безлимит |
| Уведомления | — | Да | Да |
| Экспорт / API | — | — | Да |

> Цены и лимиты — гипотеза, нужно тестировать с первыми пользователями

---

## Открытые вопросы
- Pro — 20 анализов/день или другой лимит?
- История матчей ограничивать по времени или по количеству?
- Нужна ли публичная страница аналитика (sharable link) до лонча?
