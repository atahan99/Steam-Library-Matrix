/** Match Steam profile: floor(unlocked / total * 100) per game */
export const computeCompletionPercent = (
  unlocked: number,
  total: number
): number => {
  if (total <= 0) return 0
  return Math.floor((unlocked * 100) / total)
}

/** Steam "Perfect game" = every achievement unlocked */
export const isPerfectAchievementCompletion = (
  unlocked: number,
  total: number
): boolean => total > 0 && unlocked >= total

export const isAchievementUnlocked = (achieved: unknown): boolean =>
  achieved === 1 || achieved === true
