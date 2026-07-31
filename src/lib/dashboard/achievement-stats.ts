import {
  computeCompletionPercent,
  isPerfectAchievementCompletion,
} from "@/lib/dashboard/achievement-completion"
import type { DashboardGame, DashboardGameAchievements } from "@/types/dashboard"

export type LibraryAchievementStats = {
  hasData: boolean
  trackableCount: number
  withProgressCount: number
  completedCount: number
  averageCompletionPercent: number
  completionRatePercent: number
}

export const resolveAchievementCompletion = (
  achievements: DashboardGameAchievements
): DashboardGameAchievements => {
  const unlockedCount = achievements.unlockedCount
  const totalCount = achievements.totalCount
  return {
    ...achievements,
    completionPercent: computeCompletionPercent(unlockedCount, totalCount),
  }
}

/**
 * Steam showcase metrics:
 * - Perfect games: all achievements unlocked (unlocked === total, total > 0)
 * - Avg completion: mean per-game % for games with achievements that have progress
 *   (at least one unlock), using floored per-game percentages like the client
 */
export const computeLibraryAchievementStats = (
  games: DashboardGame[]
): LibraryAchievementStats => {
  const trackable = games
    .filter(
      (g) => g.achievements?.hasAchievements && (g.achievements.totalCount ?? 0) > 0
    )
    .map((g) => resolveAchievementCompletion(g.achievements!))

  if (trackable.length === 0) {
    return {
      hasData: false,
      trackableCount: 0,
      withProgressCount: 0,
      completedCount: 0,
      averageCompletionPercent: 0,
      completionRatePercent: 0,
    }
  }

  const withProgress = trackable.filter((a) => a.unlockedCount > 0)

  const completedCount = trackable.filter((a) =>
    isPerfectAchievementCompletion(a.unlockedCount, a.totalCount)
  ).length

  const averageCompletionPercent =
    withProgress.length > 0
      ? Math.round(
          withProgress.reduce((sum, a) => sum + a.completionPercent, 0) /
            withProgress.length
        )
      : 0

  const completionRatePercent = Math.round(
    (completedCount / trackable.length) * 100
  )

  return {
    // trackable rows mean sync ran; withProgress can still be 0 (all at 0%)
    hasData: true,
    trackableCount: trackable.length,
    withProgressCount: withProgress.length,
    completedCount,
    averageCompletionPercent,
    completionRatePercent,
  }
}
