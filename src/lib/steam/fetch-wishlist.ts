import { nextFetchInit, prepareServerEnv } from "@/lib/env/runtime-env"
import {
  extractWishlistRawItems,
  getWishlistItemCount,
  getWishlistRaw,
  PRIVATE_WISHLIST_MESSAGE,
  type SteamWishlistApiPayload,
} from "@/lib/steam/steam-api"
import { placeholderGameName } from "@/lib/utils/placeholder-game-name"
import type { SteamWishlistItem, SteamWishlistRawItem } from "@/types/steam"

export { PRIVATE_WISHLIST_MESSAGE }

type WishlistDataEntry = {
  appid: string | number
  name?: string
  date_added?: number
}

const isLegacyFallbackEnabled = (): boolean =>
  process.env.STEAM_WISHLIST_LEGACY_FALLBACK === "true"

export const mapWishlistRawToItems = (
  rawItems: SteamWishlistRawItem[]
): SteamWishlistItem[] =>
  rawItems.map((item) => ({
    appid: item.appid,
    name: item.name?.trim() || placeholderGameName(item.appid),
    ...(item.addedAt !== undefined ? { addedAt: item.addedAt } : {}),
  }))

export const normalizeWishlistFromApi = (
  data: SteamWishlistApiPayload
): SteamWishlistItem[] => mapWishlistRawToItems(extractWishlistRawItems(data))

export const parseWishlistPayload = (raw: unknown): SteamWishlistItem[] => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return []
  }

  const items: SteamWishlistItem[] = []

  for (const entry of Object.values(raw as Record<string, WishlistDataEntry>)) {
    const appid = Number(entry.appid)
    if (!Number.isFinite(appid) || appid <= 0) continue
    const name = entry.name?.trim()
    if (!name) continue
    items.push({
      appid,
      name,
      ...(entry.date_added !== undefined ? { addedAt: entry.date_added } : {}),
    })
  }

  return items
}

const fetchLegacySteamWishlist = async (
  steamid: string
): Promise<SteamWishlistItem[]> => {
  await prepareServerEnv()
  const url = `https://store.steampowered.com/wishlist/profiles/${steamid}/wishlistdata/`
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Steam-Library-Matrix/1.0",
    },
    ...nextFetchInit(0),
  })

  const text = await res.text()
  const trimmed = text.trim()

  if (
    !res.ok ||
    trimmed.startsWith("<") ||
    trimmed.toLowerCase().includes("<!doctype")
  ) {
    throw new Error(PRIVATE_WISHLIST_MESSAGE)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch {
    throw new Error(PRIVATE_WISHLIST_MESSAGE)
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new Error(PRIVATE_WISHLIST_MESSAGE)
  }

  return parseWishlistPayload(parsed)
}

const assertWishlistNotBlocked = async (
  steamid: string,
  items: SteamWishlistItem[]
) => {
  if (items.length > 0) return

  const count = await getWishlistItemCount(steamid)
  if (count !== null && count > 0) {
    throw new Error(PRIVATE_WISHLIST_MESSAGE)
  }
}

const fetchWishlistViaWebApi = async (
  steamid: string
): Promise<SteamWishlistItem[]> => {
  const data = await getWishlistRaw(steamid)
  const items = normalizeWishlistFromApi(data)
  await assertWishlistNotBlocked(steamid, items)

  if (items.length === 0 && isLegacyFallbackEnabled()) {
    console.info("[wishlist] source: legacy_store (web_api empty, fallback enabled)")
    return fetchLegacySteamWishlist(steamid)
  }

  console.info(`[wishlist] source: web_api count=${items.length}`)
  return items
}

export const fetchSteamWishlist = async (
  steamid: string
): Promise<SteamWishlistItem[]> => {
  try {
    return await fetchWishlistViaWebApi(steamid)
  } catch (error) {
    if (!isLegacyFallbackEnabled()) {
      throw error
    }
    console.info("[wishlist] source: legacy_store (web_api failed, fallback enabled)")
    return fetchLegacySteamWishlist(steamid)
  }
}
