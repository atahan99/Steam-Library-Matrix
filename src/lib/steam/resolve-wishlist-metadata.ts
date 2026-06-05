import { upsertSteamAppDetailsRow } from "@/lib/db/steam-app-details"
import { fetchSteamDeckCompatibility } from "@/lib/steam/fetch-steam-deck-compatibility"
import {
  getAppidsNeedingDeckRefresh,
  upsertSteamDeckCompatibility,
} from "@/lib/steam/refresh-steam-deck-compatibility"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"
import { isPlaceholderGameName } from "@/lib/utils/placeholder-game-name"
import type { SteamWishlistItem } from "@/types/steam"

const CONCURRENCY = 5
const REQUEST_GAP_MS = 120

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type WishlistGameUpsertMeta = {
  appid: number
  name: string
  logoUrl?: string
}

export const resolveWishlistItemsFromStore = async (
  items: SteamWishlistItem[]
): Promise<{
  items: SteamWishlistItem[]
  upsertMeta: WishlistGameUpsertMeta[]
}> => {
  const placeholderAppids = new Set(
    items
      .filter((item) => isPlaceholderGameName(item.name))
      .map((item) => item.appid)
  )
  const deckRefreshAppids = await getAppidsNeedingDeckRefresh(
    items.map((item) => item.appid)
  )

  const needsResolveAppids = new Set([
    ...placeholderAppids,
    ...deckRefreshAppids,
  ])

  if (needsResolveAppids.size === 0) {
    return {
      items,
      upsertMeta: items.map((item) => ({ appid: item.appid, name: item.name })),
    }
  }

  const needsResolve = items.filter((item) =>
    needsResolveAppids.has(item.appid)
  )

  const resolvedNames = new Map<number, string>()
  const resolvedLogos = new Map<number, string>()
  let index = 0

  const worker = async () => {
    while (index < needsResolve.length) {
      const current = needsResolve[index]
      index += 1
      if (!current) continue

      const needsName = placeholderAppids.has(current.appid)
      const needsDeck = deckRefreshAppids.has(current.appid)

      try {
        if (needsName) {
          const [details, steamDeckCompatibility] = await Promise.all([
            fetchSteamAppDetails(current.appid),
            fetchSteamDeckCompatibility(current.appid),
          ])
          if (details?.name?.trim()) {
            resolvedNames.set(current.appid, details.name.trim())
          }
          if (details?.headerImage) {
            resolvedLogos.set(current.appid, details.headerImage)
          }
          if (details) {
            details.steamDeckCompatibility = steamDeckCompatibility
            await upsertSteamAppDetailsRow(details)
          }
        } else if (needsDeck) {
          const steamDeckCompatibility =
            await fetchSteamDeckCompatibility(current.appid)
          await upsertSteamDeckCompatibility(
            current.appid,
            steamDeckCompatibility ?? "unknown"
          )
        }
      } catch (error) {
        console.warn(
          `[wishlist-metadata] Failed to resolve store details for appid ${current.appid}:`,
          error
        )
      }

      await wait(REQUEST_GAP_MS)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, needsResolve.length) }, () =>
      worker()
    )
  )

  const itemsWithNames = items.map((item) => {
    const resolvedName = resolvedNames.get(item.appid)
    if (!resolvedName) return item
    return { ...item, name: resolvedName }
  })

  const upsertMeta = itemsWithNames.map((item) => ({
    appid: item.appid,
    name: item.name,
    logoUrl: resolvedLogos.get(item.appid),
  }))

  console.info(
    `[wishlist] resolved store metadata: ${resolvedNames.size}/${placeholderAppids.size} names, ${deckRefreshAppids.size} deck refreshes`
  )

  return { items: itemsWithNames, upsertMeta }
}
