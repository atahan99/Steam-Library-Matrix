import { ACHIEVEMENTS_TTL_HOURS } from "@/lib/enrichment/enrichment-ttl"
import type { ProfileGameAchievementRow } from "@/lib/db/profile-achievements-safe"
import { isCacheFresh } from "@/lib/utils/cache"
import type { DashboardGame } from "@/types/dashboard"

export const hasAchievementData = (game: DashboardGame): boolean =>
  Boolean(
    game.achievements?.hasAchievements &&
      (game.achievements.totalCount ?? 0) > 0
  )

export const hasAchievementDataRow = (
  row?: ProfileGameAchievementRow | null
): boolean =>
  Boolean(row?.has_achievements && (row.total_count ?? 0) > 0)

export const isAchievementLookupResolved = (game: DashboardGame): boolean => {
  const lastChecked = game.achievements?.lastCheckedAt
  if (!lastChecked) return false
  return isCacheFresh(lastChecked, ACHIEVEMENTS_TTL_HOURS)
}

export const isAchievementLookupResolvedRow = (
  row?: ProfileGameAchievementRow | null
): boolean => {
  if (!row?.last_checked_at) return false
  return isCacheFresh(row.last_checked_at, ACHIEVEMENTS_TTL_HOURS)
}

export const countAchievementsEnrichedGames = (games: DashboardGame[]): number =>
  games.filter(hasAchievementData).length

export const countAchievementsResolvedGames = (games: DashboardGame[]): number =>
  games.filter(isAchievementLookupResolved).length

export const countAchievementsEnrichedRows = (
  rows: Iterable<ProfileGameAchievementRow>
): number => {
  let count = 0
  for (const row of rows) {
    if (hasAchievementDataRow(row)) count += 1
  }
  return count
}

export const countAchievementsResolvedRows = (
  rows: Iterable<ProfileGameAchievementRow>
): number => {
  let count = 0
  for (const row of rows) {
    if (isAchievementLookupResolvedRow(row)) count += 1
  }
  return count
}
