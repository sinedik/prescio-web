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
      feed/         Events feed
      markets/      Prediction markets list + detail
      market/[slug] Public market page (SEO)
      sport/        Sport & esports events
      dota/         Dota 2 live + match detail
      dashboard/    User dashboard
      portfolio/    Portfolio tracker
      profile/      User settings
    auth/           Login / signup
    onboarding/     New user onboarding
    page.tsx        Landing page
  screens/          Page-level React components (used by app/ pages)
  components/       Shared UI components
    dota/           Dota 2 specific cards (DotaLiveCard, DotaMatchCard, DotaMinimap)
    feed/           Feed cards, filters, odds display
    paywall/        Paywall banners and modals
    search/         AI search overlay
  hooks/
    usePolling.ts   Data polling with visibility-aware background refresh
    useAuth.ts      Auth state (Supabase session + profile cache)
  contexts/
    AuthContext.tsx Single auth subscription shared across the app
    ThemeContext.tsx Light/dark theme
  lib/
    api.ts          Typed API client (wraps fetch to /api/*)
    supabase.ts     Supabase client
  types/            TypeScript types (index.ts, dota.ts)
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
| `free` | Markets list, event feed (limited) |
| `pro` | AI edge analysis, bookmaker odds, AI search |
| `alpha` | All Pro features + early access |
