# Responsive Audit — UX/UI Observations

Recorded during full responsive pass (2026-04-17). Items for future redesign iterations.

---

## Markets page (`MarketsPage.tsx`)

- Filter bar collapses to stacked layout on mobile (`flex-col sm:flex-row`). On mobile the platform filter row (Polymarket / Kalshi / Metaculus) scrolls horizontally — functional but not ideal. Future: convert to compact segmented control or horizontal chips with single-row scroll.
- The AI "REFRESH" button loses its label on mobile (hidden text). Consider a dedicated floating refresh indicator or a top-right icon-only button.
- No skeleton loading state shows category/platform info, so switching filters feels laggy. Future: add optimistic filter state.

---

## Profile page (`ProfilePage.tsx`)

- The subscription tab is plain text-only on mobile. Future redesign should include plan card with visual hierarchy (feature list, current badge, upgrade CTA).
- Market interests grid (`grid-cols-2 sm:grid-cols-3`) — buttons with labels like "US Politics" wrap awkwardly at 2 cols on 320px. Future: auto-fit chips (`flex-wrap gap-2`) instead of fixed grid.
- Stats block (2-column) renders well but feels generic. Future: replace with activity heatmap or streak calendar.

---

## Analysis Loader (`AnalysisLoader.tsx`)

- Canvas scales to `width: 100%` but height is fixed (default 220px). On phones landscape, this takes up most of the screen. Could pass a smaller `height` prop for mobile contexts.
- The thought text overlay (`padding: 0 48px`) gets very tight on 320px screens — text nearly touches the canvas edges. Future: reduce side padding at mobile breakpoint.

---

## Dota/CS2 match screens

- `DotaMinimap` is `aspect-ratio: 1/1` and fits parent width — looks good. However on phones in portrait mode it can be 300px+ tall (takes dominant space). Consider making minimap collapsible or constraining max-height on mobile.
- CS2 round history can have 30+ pills — horizontal scroll works but UX would benefit from a "show last N" default with expand toggle on mobile.
- Dota scoreboard table (players) wraps at narrow widths — some stat columns disappear with `hidden sm:*` classes but the remaining data is sufficient.

---

## Sport event page (`SportEventPage.tsx`)

- Head-to-head stats use `grid-cols-2 divide-x` — at very narrow widths the left/right stat label text can be cut off. Consider reducing font size or wrapping labels at 360px.
- Odds list uses horizontal scroll with `overflow-x-auto` — functional but not labeled as scrollable. Future: add scroll indicator or arrow hint.

---

## Bottom tab bar (`BottomTabBar.tsx`)

- Tab labels at `text-[9px]` can be hard to read on low-res screens. Consider removing labels and using larger icons, or making label optional per device pixel ratio.
- No active animation or transition on tab switch. Future: add subtle scale or color transition on active tab.
- On Android with gesture navigation, `env(safe-area-inset-bottom)` may not apply. Test on Samsung/Pixel with gesture navigation enabled.

---

## Landing page (`LandingPage.tsx`)

- Mock UI screenshots (lines 287, 385) use `grid-cols-3` for decorative market cards — on 375px these are about 85px each which is acceptable since they're decorative. No fix needed but verify at 320px.
- Feature section `grid-cols-1 md:grid-cols-3` works well. However on tablet (640-1023px) a single-column layout for features may feel sparse. Consider `sm:grid-cols-2`.
- Hero CTA buttons stack vertically on mobile — good, but the spacing (`gap-4`) between them is slightly large for 375px. Minor.

---

## Onboarding page (`OnboardingPage.tsx`)

- Experience options (`grid-cols-1 sm:grid-cols-3`) — on mobile each option gets full width which is good. `py-5 px-3` size is tap-friendly.
- Step indicators (3 dots) are small at 6px height. On mobile, slightly larger (8px) would help.

---

## Auth page (`AuthPage.tsx`)

- Two-column split layout (left: branding, right: form) — left panel is `hidden lg:flex`, so on mobile only the form shows. Clean and correct.
- Mobile back button position (top-left, absolute) may overlap with very long system status bars on some Android devices. Minor.

---

## General observations

- `100dvh` is used in `.live-shell` — correct for mobile browsers with dynamic address bars. Verify on Chrome Android (address bar hide/show causes layout reflow).
- No "scroll to top" behavior when navigating between tabs in bottom tab bar. Users may land mid-scroll on return navigation. Future: add scroll restoration per route.
- Touch targets: most interactive elements are `py-2` or larger. A few small elements (10px icons, 9px badge labels) are below the 44px recommended tap target size — acceptable for non-critical UI chrome.
