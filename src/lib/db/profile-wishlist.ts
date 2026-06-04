import { eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { DB_MIGRATE_HINT } from "@/lib/db/catalog-table-error"
import { loadSteamGameJoinRowsByAppids } from "@/lib/db/load-steam-game-join-rows"
import { isMissingRelationError } from "@/lib/db/db-relation-error"
import {
  profileWishlist,
  steamGames,
  steamProfiles,
} from "@/lib/db/schema"
import type { WishlistGameUpsertMeta } from "@/lib/steam/resolve-wishlist-metadata"
import { getSteamStoreUrl } from "@/lib/utils/steam-url"
import { getErrorMessage } from "@/lib/utils/get-error-message"
import { isPlaceholderGameName } from "@/lib/utils/placeholder-game-name"
import type { SteamWishlistItem } from "@/types/steam"

const CHUNK_SIZE = 150

const isMissingWishlistSchema = (message: string): boolean =>
  /profile_wishlist|wishlist_last_synced|wishlist_sync_error|does not exist|Could not find the table/i.test(
    message
  )

export const upsertWishlistGames = async (
  items: SteamWishlistItem[],
  meta: WishlistGameUpsertMeta[] = items.map((item) => ({
    appid: item.appid,
    name: item.name,
  }))
) => {
  if (items.length === 0) return

  const db = getDb()
  const now = new Date()
  const metaByAppid = new Map(meta.map((entry) => [entry.appid, entry]))
  const appids = items.map((item) => item.appid)

  const existingRows = await db
    .select({
      appid: steamGames.appid,
      name: steamGames.name,
      iconUrl: steamGames.iconUrl,
      logoUrl: steamGames.logoUrl,
    })
    .from(steamGames)
    .where(inArray(steamGames.appid, appids))

  const existingByAppid = new Map(
    existingRows.map((row) => [
      row.appid,
      {
        name: row.name,
        iconUrl: row.iconUrl,
        logoUrl: row.logoUrl,
      },
    ])
  )

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE).map((item) => {
      const entry = metaByAppid.get(item.appid)
      const existing = existingByAppid.get(item.appid)
      const resolvedName = entry?.name ?? item.name
      const name =
        existing && !isPlaceholderGameName(existing.name)
          ? existing.name
          : resolvedName

      return {
        appid: item.appid,
        name,
        iconUrl:
          existing?.iconUrl ??
          entry?.logoUrl ??
          existing?.logoUrl ??
          null,
        logoUrl: entry?.logoUrl ?? existing?.logoUrl ?? null,
        storeUrl: getSteamStoreUrl(item.appid),
        updatedAt: now,
      }
    })
    await db.insert(steamGames).values(chunk).onConflictDoUpdate({
      target: steamGames.appid,
      set: {
        name: steamGames.name,
        iconUrl: steamGames.iconUrl,
        logoUrl: steamGames.logoUrl,
        storeUrl: steamGames.storeUrl,
        updatedAt: now,
      },
    })
  }
}

const safeUpdateWishlistProfileFields = async (
  steamid: string,
  fields: {
    wishlist_last_synced_at?: string | null
    wishlist_sync_error?: string | null
  }
) => {
  const db = getDb()
  try {
    await db
      .update(steamProfiles)
      .set({
        wishlistLastSyncedAt: fields.wishlist_last_synced_at
          ? new Date(fields.wishlist_last_synced_at)
          : fields.wishlist_last_synced_at === null
            ? null
            : undefined,
        wishlistSyncError:
          fields.wishlist_sync_error === null
            ? null
            : fields.wishlist_sync_error ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(steamProfiles.steamid, steamid))
  } catch (error) {
    if (!isMissingWishlistSchema(getErrorMessage(error))) {
      throw error
    }
  }
}

export const syncProfileWishlist = async (
  steamid: string,
  items: SteamWishlistItem[],
  upsertMeta?: WishlistGameUpsertMeta[]
) => {
  const db = getDb()
  const now = new Date()

  await upsertWishlistGames(items, upsertMeta)

  try {
    await db.delete(profileWishlist).where(eq(profileWishlist.steamid, steamid))
  } catch (error) {
    const message = getErrorMessage(error)
    if (isMissingWishlistSchema(message)) {
      throw new Error(
        `Wishlist database tables are missing. ${DB_MIGRATE_HINT}`
      )
    }
    throw error
  }

  if (items.length > 0) {
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE).map((item) => ({
        steamid,
        appid: item.appid,
        addedAt: item.addedAt ? new Date(item.addedAt * 1000) : null,
        lastSyncedAt: now,
      }))
      await db.insert(profileWishlist).values(chunk)
    }
  }

  await safeUpdateWishlistProfileFields(steamid, {
    wishlist_last_synced_at: now.toISOString(),
    wishlist_sync_error: null,
  })
}

export const setWishlistSyncError = async (
  steamid: string,
  message: string
) => {
  await safeUpdateWishlistProfileFields(steamid, {
    wishlist_sync_error: message,
  })
}

export const fetchProfileWishlistRows = async (steamid: string) => {
  const db = getDb()

  try {
    const wishlistLinks = await db
      .select({
        lastSyncedAt: profileWishlist.lastSyncedAt,
        appid: profileWishlist.appid,
      })
      .from(profileWishlist)
      .where(eq(profileWishlist.steamid, steamid))

    const wishlistAppids = wishlistLinks.map((r) => r.appid)
    const gamesByAppid = await loadSteamGameJoinRowsByAppids(wishlistAppids)

    const rows = wishlistLinks.map((link) => ({
      last_synced_at: link.lastSyncedAt?.toISOString(),
      steam_games: gamesByAppid.get(link.appid) ?? null,
    }))

    return {
      rows,
      wishlistAppids,
      schemaMissing: false as const,
    }
  } catch (error) {
    const message = getErrorMessage(error)
    if (isMissingWishlistSchema(message) || isMissingRelationError(error)) {
      return { rows: [], wishlistAppids: [], schemaMissing: true as const }
    }
    throw error
  }
}

export const getWishlistSchemaHint = (): string =>
  `Run pnpm db:migrate to enable wishlist sync.`
