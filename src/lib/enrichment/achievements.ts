import { and, eq } from "drizzle-orm"
import {
  ACHIEVEMENTS_MIGRATION_HINT,
  isMissingAchievementsSchema,
} from "@/lib/db/profile-achievements-safe"
import { getDb } from "@/lib/db/client"
import { profileGameAchievements, profileGames } from "@/lib/db/schema"
import { ACHIEVEMENTS_TTL_HOURS } from "@/lib/enrichment/resolve-enrichment-appids"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
import { getPlayerAchievementStats } from "@/lib/steam/steam-api"
import { isCacheFresh } from "@/lib/utils/cache"

const REQUEST_DELAY_MS = 300
const CONCURRENT_REQUEST_DELAY_MS = 50

export const enrichSingleAchievement = async (
  steamid: string,
  appid: number,
  force = false,
  options?: { applyDelay?: boolean }
): Promise<{ checked: number; updated: number; failed: number; skipped: number }> => {
  const applyDelay = options?.applyDelay ?? true
  const delayMs = applyDelay ? REQUEST_DELAY_MS : CONCURRENT_REQUEST_DELAY_MS
  const db = getDb()

  let cachedTotalCount = 0
  if (!force) {
    const existingRows = await db
      .select({
        lastCheckedAt: profileGameAchievements.lastCheckedAt,
        totalCount: profileGameAchievements.totalCount,
      })
      .from(profileGameAchievements)
      .where(
        and(
          eq(profileGameAchievements.steamid, steamid),
          eq(profileGameAchievements.appid, appid)
        )
      )
      .limit(1)
      .all()

    const existing = existingRows[0]
    if (isCacheFresh(existing?.lastCheckedAt?.toISOString(), ACHIEVEMENTS_TTL_HOURS)) {
      return { checked: 1, updated: 0, failed: 0, skipped: 1 }
    }
    cachedTotalCount = existing?.totalCount ?? 0
  }

  try {
    const stats = await getPlayerAchievementStats(steamid, appid, {
      cachedTotalCount: cachedTotalCount > 0 ? cachedTotalCount : undefined,
    })
    if (stats === null) {
      if (applyDelay) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }

    const now = new Date()
    try {
      await db
        .insert(profileGameAchievements)
        .values({
          steamid,
          appid,
          unlockedCount: stats.unlockedCount,
          totalCount: stats.totalCount,
          completionPercent: stats.completionPercent,
          hasAchievements: stats.hasAchievements,
          lastCheckedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            profileGameAchievements.steamid,
            profileGameAchievements.appid,
          ],
          set: {
            unlockedCount: stats.unlockedCount,
            totalCount: stats.totalCount,
            completionPercent: stats.completionPercent,
            hasAchievements: stats.hasAchievements,
            lastCheckedAt: now,
            updatedAt: now,
          },
        })
      if (applyDelay) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
      return { checked: 1, updated: 1, failed: 0, skipped: 0 }
    } catch (error) {
      if (isMissingAchievementsSchema(error)) {
        throw new Error(ACHIEVEMENTS_MIGRATION_HINT)
      }
      if (applyDelay) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }
  } catch (error) {
    if (error instanceof Error && error.message === ACHIEVEMENTS_MIGRATION_HINT) {
      throw error
    }
    if (applyDelay) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
    return { checked: 1, updated: 0, failed: 1, skipped: 0 }
  }
}

const getLibraryAppids = async (steamid: string): Promise<number[]> => {
  const db = getDb()
  const data = await db
    .select({ appid: profileGames.appid })
    .from(profileGames)
    .where(eq(profileGames.steamid, steamid))

  return data.map((row) => row.appid)
}

export const enrichAchievements = async (
  steamid: string,
  force = false
): Promise<{ checked: number; updated: number; failed: number }> => {
  const logId = await startRefreshLog(steamid, "steam_achievements")

  let appids: number[]
  try {
    appids = await getLibraryAppids(steamid)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load appids"
    await finishRefreshLog(logId, "failed", message)
    throw error
  }

  let checked = 0
  let updated = 0
  let failed = 0

  for (const appid of appids) {
    try {
      const result = await enrichSingleAchievement(steamid, appid, force)
      checked += result.checked
      updated += result.updated
      failed += result.failed
    } catch (error) {
      if (error instanceof Error && error.message === ACHIEVEMENTS_MIGRATION_HINT) {
        await finishRefreshLog(logId, "failed", ACHIEVEMENTS_MIGRATION_HINT)
        throw error
      }
      failed += 1
    }
  }

  await finishRefreshLog(
    logId,
    failed > 0 ? "partial" : "success",
    `checked=${checked} updated=${updated} failed=${failed}`
  )

  return { checked, updated, failed }
}
