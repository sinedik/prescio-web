# prescio-web

Frontend for Prescio — prediction market intelligence platform.

## Stack

- **Next.js 15** (App Router)
- **React 18** + TypeScript
- **Tailwind CSS** (CSS variable–based theme system)
- **Supabase** (auth + user data)
- **Paddle** (billing)

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in env vars
npm run dev
```

App runs at `http://localhost:3000`. Expects `prescio-api` on port `8000` (proxied via Next.js rewrites).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle client token |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_PRO` | Paddle price ID for Pro plan |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_ALPHA` | Paddle price ID for Alpha plan |
| `API_PROXY_TARGET` | Backend URL for Next.js rewrite proxy (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (for SEO/OG) |

## Project Structure

```
src/
  app/              Next.js App Router pages
    (app)/          Authenticated section
      (live)/
        cybersport/[game]/[matchId]/   Esports live + finished match detail (dota2 | cs2)
      events/       Prediction events list + detail
      markets/      Prediction markets list
      market/[slug] Public market page (SEO)
      portfolio/    Portfolio tracker
      watchlist/    Watchlist
      profile/      User settings
    auth/           Login / signup
    forgot-password/
    onboarding/     New user onboarding
    pricing/        Plans + Paddle checkout
    privacy/ terms/ Legal
    page.tsx        Landing page
  components/       Shared UI components
  hooks/
    usePolling.ts   Data polling with visibility-aware background refresh
    useAuth.ts      Auth state (Supabase session + profile cache)
  contexts/
    AuthContext.tsx Single auth subscription shared across the app
    ThemeContext.tsx Light/dark theme
  lib/
    api.ts          Typed API client (wraps fetch to /api/*)
    supabase.ts     Supabase client
  types/            TypeScript types
```

## Theming

Colors are defined as CSS custom properties (raw RGB channels) in `src/app/globals.css`:

```css
/* dark theme (default) */
--bg-base:        8 8 8;
--bg-surface:     14 17 24;
--text-primary:   221 227 240;
--accent:         99 102 241;
/* ... */
```

Used in Tailwind via `bg-bg-base`, `text-text-primary`, `border-bg-border`, etc.
Light theme overrides the same variables on `[data-theme="light"]`.

**Important**: always use Tailwind CSS variable classes — never hardcode hex colors like `#0e1118` in components.

## Key Behaviors

### Data Fetching (`usePolling`)
- Shows loading skeleton only on the **first** fetch (no data yet)
- Background refetches (tab visibility restore, interval) update silently — no loading flash
- Pauses polling when tab is hidden, resumes on visibility restore

### Auth (`useAuthContext`)
- Always use `useAuthContext()` from `contexts/AuthContext.tsx` — never call `useAuth()` directly in components (creates duplicate Supabase subscriptions)
- Token refresh (`TOKEN_REFRESHED`) does not trigger loading state or profile re-fetch

## Plans

| Plan | Features |
|---|---|
| `free` | Events and markets list, 3 AI analyses/day |
| `pro` | 20 AI analyses/day, bookmaker odds, AI search, price history |
| `alpha` | 50 AI analyses/day, all Pro features + early access, no watermark on shared analyses |
