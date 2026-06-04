/**
 * Store header capsule from Steam CDN (same asset family as appdetails `header_image`).
 * No API call or DB field required — derived from appid only.
 */
export const getSteamStoreHeaderImageUrl = (appid: number): string =>
  `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`

/** Taller library capsule when header art is missing. */
export const getSteamLibraryCapsuleImageUrl = (appid: number): string =>
  `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`

const isStoreHeaderImageUrl = (url: string): boolean =>
  /steamstatic\.com\/.*\/apps\/\d+\/(header\.jpg|library_)/i.test(url) ||
  /store_item_assets\/steam\/apps\/\d+\//i.test(url)

/**
 * Hero art for wide cards (460×215). Uses store header CDN, not low-res community logos.
 */
export const resolveGameHeroImageUrl = (
  appid: number,
  options?: { logoUrl?: string }
): string => {
  const logo = options?.logoUrl?.trim()
  if (logo && isStoreHeaderImageUrl(logo)) return logo
  return getSteamStoreHeaderImageUrl(appid)
}
