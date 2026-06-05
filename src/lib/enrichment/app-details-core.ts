import { eq } from "drizzle-orm"
import { upsertSteamAppDetailsRow } from "@/lib/db/steam-app-details"
import { getDb } from "@/lib/db/client"
import { steamAppDetails, steamGames } from "@/lib/db/schema"
import { APP_DETAILS_TTL_HOURS } from "@/lib/enrichment/resolve-enrichment-appids"
import { fetchSteamDeckCompatibility } from "@/lib/steam/fetch-steam-deck-compatibility"
import { hasStoredSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import { getSteamAppName } from "@/lib/steam/steam-app-list"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"
import { SteamStoreCooldownError } from "@/lib/steam/steam-store-fetch"
import { isCacheFresh } from "@/lib/utils/cache"
import { isPlaceholderGameName } from "@/lib/utils/placeholder-game-name"

export const APP_DETAILS_DELAY_MS = 300

export type AppDetailsEnrichResult = {
  checked: number
  updated: number
  failed: number
  skipped: number
}

export type EnrichAppDetailsOptions = {
  /** Skip Deck compat storefront call (seed bulk pass). */
  skipDeck?: boolean
}

const tryBackfillNameFromAppList = async (appid: number): Promise<boolean> => {
  const db = getDb()
  const existingGameRows = await db
    .select({ name: steamGames.name })
    .from(steamGames)
    .where(eq(steamGames.appid, appid))
    .limit(1)
  const existingGame = existingGameRows[0]

  if (existingGame?.name && !isPlaceholderGameName(existingGame.name)) {
    return false
  }

  const listName = await getSteamAppName(appid)
  if (!listName?.trim()) return false

  await db
    .update(steamGames)
    .set({ name: listName.trim(), updatedAt: new Date() })
    .where(eq(steamGames.appid, appid))

  return true
}

/** Single-app Steam store details + Deck compat for job steps and full refresh. */
export const enrichSingleAppDetails = async (
  appid: number,
  force = false,
  options: EnrichAppDetailsOptions = {}
): Promise<AppDetailsEnrichResult> => {
  const { skipDeck = false } = options
  const db = getDb()

  if (!force) {
    const existingRows = await db
      .select({
        lastCheckedAt: steamAppDetails.lastCheckedAt,
        steamDeckCompatibility: steamAppDetails.steamDeckCompatibility,
        platforms: steamAppDetails.platforms,
      })
      .from(steamAppDetails)
      .where(eq(steamAppDetails.appid, appid))
      .limit(1)
    const existing = existingRows[0]
    const deckStored = existing?.steamDeckCompatibility
    const needsDeckRefresh =
      !skipDeck && (!deckStored || deckStored === "unknown")
    const needsPlatformRefresh = !hasStoredSteamPlatforms(existing?.platforms)
    const cacheFresh = isCacheFresh(
      existing?.lastCheckedAt?.toISOString(),
      APP_DETAILS_TTL_HOURS
    )

    if (cacheFresh && !needsDeckRefresh && !needsPlatformRefresh) {
      return { checked: 1, updated: 0, failed: 0, skipped: 1 }
    }

    if (cacheFresh && needsDeckRefresh && !needsPlatformRefresh && existing) {
      try {
        const steamDeckCompatibility = await fetchSteamDeckCompatibility(appid)
        await db
          .update(steamAppDetails)
          .set({
            steamDeckCompatibility: steamDeckCompatibility ?? "unknown",
            lastCheckedAt: new Date(),
          })
          .where(eq(steamAppDetails.appid, appid))
        await new Promise((r) => setTimeout(r, APP_DETAILS_DELAY_MS))
        return { checked: 1, updated: 1, failed: 0, skipped: 0 }
      } catch (error) {
        if (error instanceof SteamStoreCooldownError) throw error
        return { checked: 1, updated: 0, failed: 1, skipped: 0 }
      }
    }
  }

  try {
    const details = await fetchSteamAppDetails(appid)
    if (!details) {
      const backfilled = await tryBackfillNameFromAppList(appid)
      await new Promise((r) => setTimeout(r, APP_DETAILS_DELAY_MS))
      return {
        checked: 1,
        updated: backfilled ? 1 : 0,
        failed: backfilled ? 0 : 1,
        skipped: 0,
      }
    }

    if (!skipDeck) {
      const steamDeckCompatibility = await fetchSteamDeckCompatibility(appid)
      details.steamDeckCompatibility = steamDeckCompatibility
    }

    const now = new Date()
    await upsertSteamAppDetailsRow(details)

    const existingGameRows = await db
      .select({
        name: steamGames.name,
        iconUrl: steamGames.iconUrl,
        logoUrl: steamGames.logoUrl,
      })
      .from(steamGames)
      .where(eq(steamGames.appid, appid))
      .limit(1)
    const existingGame = existingGameRows[0]

    const gameUpdates: {
      name?: string
      iconUrl?: string | null
      logoUrl?: string | null
      updatedAt: Date
    } = { updatedAt: now }

    const resolvedName =
      details.name?.trim() ?? (await getSteamAppName(appid))?.trim()

    if (
      resolvedName &&
      (!existingGame?.name || isPlaceholderGameName(existingGame.name))
    ) {
      gameUpdates.name = resolvedName
    }

    if (details.headerImage) {
      gameUpdates.logoUrl = details.headerImage
      if (!existingGame?.iconUrl) {
        gameUpdates.iconUrl = details.headerImage
      }
    }

    if (Object.keys(gameUpdates).length > 1) {
      await db.update(steamGames).set(gameUpdates).where(eq(steamGames.appid, appid))
    }

    await new Promise((r) => setTimeout(r, APP_DETAILS_DELAY_MS))
    return { checked: 1, updated: 1, failed: 0, skipped: 0 }
  } catch (error) {
    if (error instanceof SteamStoreCooldownError) throw error
    return { checked: 1, updated: 0, failed: 1, skipped: 0 }
  }
}
