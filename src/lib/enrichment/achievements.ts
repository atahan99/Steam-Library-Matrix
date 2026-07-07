import { and, eq } from "drizzle-orm"
import {
  ACHIEVEMENTS_MIGRATION_HINT,
  isMissingAchievementsSchema,
} from "@/lib/db/profile-achievements-safe"
import { getDb } from "@/lib/db/client"
import { profileGameAchievements } from "@/lib/db/schema"
import { ACHIEVEMENTS_TTL_HOURS } from "@/lib/enrichment/resolve-enrichment-appids"
import { getPlayerAchievementStats } from "@/lib/steam/steam-api"
import { isCacheFresh } from "@/lib/utils/cache"
import { delay } from "@/lib/utils/delay"

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
        await delay(delayMs)
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
        await delay(delayMs)
      }
      return { checked: 1, updated: 1, failed: 0, skipped: 0 }
    } catch (error) {
      if (isMissingAchievementsSchema(error)) {
        throw new Error(ACHIEVEMENTS_MIGRATION_HINT)
      }
      if (applyDelay) {
        await delay(delayMs)
      }
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }
  } catch (error) {
    if (error instanceof Error && error.message === ACHIEVEMENTS_MIGRATION_HINT) {
      throw error
    }
    if (applyDelay) {
      await delay(delayMs)
    }
    return { checked: 1, updated: 0, failed: 1, skipped: 0 }
  }
}

