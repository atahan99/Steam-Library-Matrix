import { eq } from "drizzle-orm"
import { upsertSteamAppDetailsRow } from "@/lib/db/steam-app-details"
import { getDb } from "@/lib/db/client"
import { steamAppDetails, steamGames } from "@/lib/db/schema"
import { APP_DETAILS_TTL_HOURS } from "@/lib/enrichment/resolve-enrichment-appids"
import { fetchSteamDeckCompatibility } from "@/lib/steam/fetch-steam-deck-compatibility"
import { getSteamAppName } from "@/lib/steam/steam-app-list"
import { fetchSteamAppDetailsOutcome } from "@/lib/steam/steam-store"
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
      })
      .from(steamAppDetails)
      .where(eq(steamAppDetails.appid, appid))
      .limit(1)
    const cacheFresh = isCacheFresh(
      existingRows[0]?.lastCheckedAt?.toISOString(),
      APP_DETAILS_TTL_HOURS
    )

    // A recently-checked row is done, whatever it found. Previously a Deck status
    // of "unknown" (or a delisted game with no platforms) forced a refetch every
    // pass, which kept the worker looping on CPU. "unknown" is Valve's real
    // answer, not a gap; the next TTL refresh re-checks the whole row anyway.
    if (cacheFresh) {
      return { checked: 1, updated: 0, failed: 0, skipped: 1 }
    }
  }

  try {
    const outcome = await fetchSteamAppDetailsOutcome(appid)
    if (outcome.kind !== "ok") {
      const backfilled = await tryBackfillNameFromAppList(appid)
      // not-found is terminal (delisted / beta / no store page): record a
      // "checked" sentinel so we stop refetching and stop counting it as a
      // perpetual failure. unavailable is transient, so leave it to retry.
      if (outcome.kind === "not-found") {
        await upsertSteamAppDetailsRow({ appid })
      }
      await new Promise((r) => setTimeout(r, APP_DETAILS_DELAY_MS))
      return {
        checked: 1,
        updated: outcome.kind === "not-found" || backfilled ? 1 : 0,
        failed: outcome.kind === "not-found" || backfilled ? 0 : 1,
        skipped: 0,
      }
    }

    const details = outcome.details
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
