# prescio-web — Roadmap

## Текущее состояние

### Готово
| Область | Что работает |
|---------|-------------|
| **Landing page** | Маркетинговая страница с hero, фичами, CTA на pricing |
| **Auth** | Вход/регистрация, forgot password, onboarding flow |
| **Events** | Список unified events с фильтрами, detail страница с AI-анализом |
| **Markets** | Браузер маркетов, detail страница с анализом, price history и odds |
| **Market [slug]** | Публичная SEO страница маркета |
| **Esports** | `/cybersport/[game]/[matchId]` (dota2 + cs2): live и finished режимы |
| **Dota live** | Minimap, hero rows (dead overlay, ult dot, aegis, GPM/CS, items), respawn countdown; GRID fallback если STRATZ недоступен |
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
| Нет error boundaries — при сбое API белый экран | High |
| AI анализ в MarketDetail не всегда загружается | High |
| Mobile: не проверен responsive на реальных устройствах | High |
| Edge highlighting отсутствует — не видно где рынок ошибается | High |
| Onboarding не объясняет ценность продукта понятно | Medium |
| `tsconfig.tsbuildinfo` попал в git | Low |

---

## Roadmap

### Phase 0 — Hardening (сейчас)
**Цель:** нет белых экранов, понятно что делает продукт

| Задача | Приоритет | Критерий |
|--------|-----------|----------|
| Error boundaries на все screens | Critical | При сбое API — сообщение, не крэш |
| Edge highlight в EventCard / MarketCard — AI prob vs market prob | High | Визуально выделено где AI не согласен с рынком |
| Landing page — усилить "почему Prescio" с примерами edge | High | Юзер понимает ценность до регистрации |
| `npx tsc --noEmit` чистый билд | High | Нет TypeScript ошибок |

---

### Phase 1 — Onboarding + Paywall UX (1–2 недели)
**Цель:** новый пользователь понимает продукт, лимиты плана прозрачны

| Задача | Приоритет | Критерий |
|--------|-----------|----------|
| Onboarding redesign — 3 шага: "что это", "как работает", "выбери интересы" | High | Bounce rate на онбординге < 40% |
| Paywall — зафиксировать лимиты (Free 3 / Pro 20 / Alpha 50 анализов в день) | Critical | В UI отображается остаток, при 0 показывается paywall |
| Pro plan UI — показывать сколько анализов осталось сегодня | High | Виджет в header или profile |
| CS2 match detail — полная визуализация (аналог Dota 2 UI) | High | `/cybersport/cs2/[matchId]` наполнить live-виджетами |

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
| Landing page A/B тест — разные value propositions | Medium |
| Sharing — поделиться анализом события по ссылке (публичная) | High |
| Embeds — виджет маркета для внешних сайтов | Low |
| PWA / мобильное приложение | Low |

---

## Монетизация (план по лимитам)

| Фича | Free | Pro | Alpha |
|------|------|-----|-------|
| Events и markets | Да | Да | Да |
| AI анализ события | 3/день | 20/день | 50/день |
| AI поиск | — | 10/день | 30/день |
| Live Dota 2 / CS2 | Да | Да | Да |
| История матчей | 7 дней | 90 дней | Безлимит |
| Уведомления | — | Да | Да |
| Экспорт / API | — | — | Да |

> Цены и лимиты — гипотеза, нужно тестировать с первыми пользователями

---

## Открытые вопросы
- История матчей ограничивать по времени или по количеству?
- Нужна ли публичная страница аналитики (sharable link) до лонча?
- Добавлять ли dashboard обратно после traction, или оставить `/events` как главный экран?
