import { getAllSteamAppNames } from "@/lib/steam/steam-api"
import { isPlaceholderGameName } from "@/lib/utils/placeholder-game-name"
import type { SteamWishlistItem } from "@/types/steam"

export type WishlistGameUpsertMeta = {
  appid: number
  name: string
  logoUrl?: string
}

export const dedupeWishlistItems = (
  items: SteamWishlistItem[]
): SteamWishlistItem[] => {
  const seen = new Set<number>()
  const deduped: SteamWishlistItem[] = []

  for (const item of items) {
    if (seen.has(item.appid)) continue
    seen.add(item.appid)
    deduped.push(item)
  }

  return deduped
}

export const resolveWishlistItemsFromStore = async (
  items: SteamWishlistItem[]
): Promise<{
  items: SteamWishlistItem[]
  upsertMeta: WishlistGameUpsertMeta[]
}> => {
  const deduped = dedupeWishlistItems(items)
  const placeholderAppids = deduped
    .filter((item) => isPlaceholderGameName(item.name))
    .map((item) => item.appid)

  let appNames: Map<number, string> | null = null
  if (placeholderAppids.length > 0) {
    try {
      appNames = await getAllSteamAppNames()
    } catch (error) {
      console.warn("[wishlist-metadata] Failed to load GetAppList names:", error)
    }
  }

  let resolvedNameCount = 0
  const itemsWithNames = deduped.map((item) => {
    if (!isPlaceholderGameName(item.name)) return item

    const resolvedName = appNames?.get(item.appid)?.trim()
    if (!resolvedName) return item

    resolvedNameCount += 1
    return { ...item, name: resolvedName }
  })

  const upsertMeta = itemsWithNames.map((item) => ({
    appid: item.appid,
    name: item.name,
  }))

  if (placeholderAppids.length > 0) {
    console.info(
      `[wishlist] resolved GetAppList names: ${resolvedNameCount}/${placeholderAppids.length} placeholders`
    )
  }

  return { items: itemsWithNames, upsertMeta }
}
