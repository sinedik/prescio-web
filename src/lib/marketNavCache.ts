export const MARKET_CACHE_PREFIX = 'pi_market_'

/** Сохраняет данные карточки перед переходом на /market/:slug (замена react-router location.state). */
export function stashMarketNavItem(slug: string, item: unknown) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(MARKET_CACHE_PREFIX + slug, JSON.stringify(item))
  } catch {
    /* ignore quota / private mode */
  }
}
