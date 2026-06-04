import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import {
  formatDbError,
  isMissingCatalogTableError,
} from "@/lib/db/catalog-table-error"
import { profileGameAchievements } from "@/lib/db/schema"

export type ProfileGameAchievementRow = {
  appid: number
  unlocked_count?: number
  total_count?: number
  completion_percent?: number
  has_achievements?: boolean
  last_checked_at?: string
}

export const ACHIEVEMENTS_MIGRATION_HINT =
  "Steam achievement tables are missing. Run pnpm db:migrate against your DATABASE_URL."

export const isMissingAchievementsSchema = (error: unknown): boolean => {
  const text = formatDbError(error).toLowerCase()
  return (
    isMissingCatalogTableError(error) ||
    text.includes("profile_game_achievements")
  )
}

export const loadProfileAchievementsByAppid = async (
  steamid: string
): Promise<Map<number, ProfileGameAchievementRow>> => {
  const db = getDb()

  try {
    const data = await db
      .select({
        appid: profileGameAchievements.appid,
        unlocked_count: profileGameAchievements.unlockedCount,
        total_count: profileGameAchievements.totalCount,
        completion_percent: profileGameAchievements.completionPercent,
        has_achievements: profileGameAchievements.hasAchievements,
        last_checked_at: profileGameAchievements.lastCheckedAt,
      })
      .from(profileGameAchievements)
      .where(eq(profileGameAchievements.steamid, steamid))

    const map = new Map<number, ProfileGameAchievementRow>()
    for (const row of data) {
      map.set(row.appid, {
        appid: row.appid,
        unlocked_count: row.unlocked_count,
        total_count: row.total_count,
        completion_percent: row.completion_percent,
        has_achievements: row.has_achievements,
        last_checked_at: row.last_checked_at?.toISOString(),
      })
    }
    return map
  } catch (error) {
    if (isMissingAchievementsSchema(error)) {
      return new Map()
    }
    throw error
  }
}
