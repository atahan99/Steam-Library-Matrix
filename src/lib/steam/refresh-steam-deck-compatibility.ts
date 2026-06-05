import { eq, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { steamAppDetails } from "@/lib/db/schema"
import { fetchSteamDeckCompatibility } from "@/lib/steam/fetch-steam-deck-compatibility"
import { hasStoredSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import type { SteamDeckCompatibility } from "@/lib/utils/detect-steam-deck"

const DEFAULT_CONCURRENCY = 5
const DEFAULT_GAP_MS = 120

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const getAppidsNeedingDeckRefresh = async (
  appids: number[]
): Promise<Set<number>> => {
  if (appids.length === 0) return new Set()

  const db = getDb()
  const needsRefresh = new Set<number>()
  const chunkSize = 500

  for (let i = 0; i < appids.length; i += chunkSize) {
    const chunk = appids.slice(i, i + chunkSize)
    const data = await db
      .select({
        appid: steamAppDetails.appid,
        steamDeckCompatibility: steamAppDetails.steamDeckCompatibility,
      })
      .from(steamAppDetails)
      .where(inArray(steamAppDetails.appid, chunk))

    const storedByAppid = new Map(
      data.map((row) => [row.appid, row.steamDeckCompatibility])
    )

    for (const appid of chunk) {
      const stored = storedByAppid.get(appid)
      if (!stored || stored === "unknown") needsRefresh.add(appid)
    }
  }

  return needsRefresh
}

export const upsertSteamDeckCompatibility = async (
  appid: number,
  compatibility: SteamDeckCompatibility
): Promise<void> => {
  const db = getDb()
  const now = new Date()
  const existingRows = await db
    .select({ platforms: steamAppDetails.platforms })
    .from(steamAppDetails)
    .where(eq(steamAppDetails.appid, appid))
    .limit(1)
  const existing = existingRows[0]
  const hasPlatforms = hasStoredSteamPlatforms(existing?.platforms)

  if (!existing) {
    await db.insert(steamAppDetails).values({
      appid,
      steamDeckCompatibility: compatibility,
      updatedAt: now,
    })
    return
  }

  await db
    .update(steamAppDetails)
    .set({
      steamDeckCompatibility: compatibility,
      ...(hasPlatforms ? { lastCheckedAt: now } : {}),
      updatedAt: now,
    })
    .where(eq(steamAppDetails.appid, appid))
}

export type RefreshSteamDeckResult = {
  requested: number
  refreshed: number
  failed: number
}

export const refreshSteamDeckCompatibilityForAppids = async (
  appids: number[],
  options?: { concurrency?: number; gapMs?: number }
): Promise<RefreshSteamDeckResult> => {
  const deckRefreshAppids = await getAppidsNeedingDeckRefresh(appids)
  const toRefresh = [...deckRefreshAppids]

  if (toRefresh.length === 0) {
    return { requested: appids.length, refreshed: 0, failed: 0 }
  }

  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY
  const gapMs = options?.gapMs ?? DEFAULT_GAP_MS
  let index = 0
  let refreshed = 0
  let failed = 0

  const worker = async () => {
    while (index < toRefresh.length) {
      const current = toRefresh[index]
      index += 1
      if (current === undefined) continue

      try {
        const steamDeckCompatibility =
          await fetchSteamDeckCompatibility(current)
        await upsertSteamDeckCompatibility(
          current,
          steamDeckCompatibility ?? "unknown"
        )
        refreshed += 1
      } catch (error) {
        console.warn(
          `[steam-deck] compatibility refresh failed for appid ${current}`,
          error
        )
        failed += 1
      }

      await wait(gapMs)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, toRefresh.length) }, () => worker())
  )

  return {
    requested: appids.length,
    refreshed,
    failed,
  }
}
