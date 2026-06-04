import {
  setWishlistSyncError,
  syncProfileWishlist,
  getWishlistSchemaHint,
} from "@/lib/db/profile-wishlist"
import { isNextDynamicApiScopeError } from "@/lib/env/runtime-env"
import {
  fetchSteamWishlist,
  PRIVATE_WISHLIST_MESSAGE,
} from "@/lib/steam/fetch-wishlist"
import { resolveWishlistItemsFromStore } from "@/lib/steam/resolve-wishlist-metadata"
import { getErrorMessage } from "@/lib/utils/get-error-message"

export const shouldPersistWishlistSyncError = (error: unknown): boolean => {
  if (isNextDynamicApiScopeError(error)) return false
  const message = getErrorMessage(error)
  return !message.includes("called outside a request scope")
}

export const sanitizeWishlistSyncError = (
  message?: string | null
): string | undefined => {
  if (!message?.trim()) return undefined
  if (message.includes("called outside a request scope")) return undefined
  return message
}

export type WishlistSyncResult = {
  count: number
  error?: string
  schemaMissing?: boolean
}

export const syncSteamWishlist = async (
  steamid: string
): Promise<WishlistSyncResult> => {
  try {
    const fetched = await fetchSteamWishlist(steamid)
    const { items, upsertMeta } = await resolveWishlistItemsFromStore(fetched)
    try {
      await syncProfileWishlist(steamid, items, upsertMeta)
      return { count: items.length }
    } catch (dbError) {
      const dbMessage = getErrorMessage(dbError)
      const schemaMissing = /database tables are missing|004_profile_wishlist/i.test(
        dbMessage
      )
      const message = schemaMissing
        ? `${dbMessage} ${getWishlistSchemaHint()}`
        : dbMessage

      if (shouldPersistWishlistSyncError(dbError)) {
        try {
          await setWishlistSyncError(steamid, message)
        } catch {
          // Profile wishlist columns may also be missing
        }
      }

      return {
        count: 0,
        error: message,
        schemaMissing,
      }
    }
  } catch (error) {
    const message =
      getErrorMessage(error) || PRIVATE_WISHLIST_MESSAGE

    if (shouldPersistWishlistSyncError(error)) {
      try {
        await setWishlistSyncError(steamid, message)
      } catch {
        // Non-fatal when wishlist status columns are not migrated yet
      }
    }

    return { count: 0, error: message }
  }
}
