import {
  getReleaseTimestamp,
  isCompletedForRandomPicker,
} from "@/lib/dashboard/random-game-picker"
import type { DashboardGame } from "@/types/dashboard"

/** A game with zero lifetime playtime — the core of the backlog. */
export const isNeverPlayed = (game: DashboardGame): boolean =>
  game.playtimeForeverMinutes === 0

/** Quick wins are unplayed games with a short HLTB main story (≤ this many minutes). */
export const QUICK_WIN_MAX_MAIN_MINUTES = 6 * 60
const ALMOST_THERE_MIN_PERCENT = 50
const ALMOST_THERE_MAX_PERCENT = 99
const WEEKS_PER_YEAR = 52
/** GetOwnedGames reports playtime over a rolling two-week window. */
const RECENT_WINDOW_WEEKS = 2

export type BacklogStats = {
  ownedCount: number
  neverPlayedCount: number
  neverPlayedPercent: number
  /** Never-played games that have an HLTB main-story estimate. */
  clearableCount: number
  /** Total HLTB main-story hours across the clearable backlog. */
  hoursToClear: number
  /** Recent play rate in hours per week, from the last two weeks. */
  weeklyHours: number
  /** Years to clear the backlog at the recent pace; null when there is no recent play. */
  yearsToClear: number | null
}

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export const getBacklogStats = (games: DashboardGame[]): BacklogStats => {
  const ownedCount = games.length
  const neverPlayed = games.filter(isNeverPlayed)
  const neverPlayedCount = neverPlayed.length

  let clearMinutes = 0
  let clearableCount = 0
  for (const game of neverPlayed) {
    const main = game.hltb?.mainStoryMinutes
    if (main && main > 0) {
      clearMinutes += main
      clearableCount += 1
    }
  }

  const recentMinutes = games.reduce(
    (sum, game) => sum + Math.max(0, game.playtime2WeeksMinutes),
    0
  )
  const weeklyMinutes = recentMinutes / RECENT_WINDOW_WEEKS

  return {
    ownedCount,
    neverPlayedCount,
    neverPlayedPercent:
      ownedCount > 0 ? Math.round((neverPlayedCount / ownedCount) * 100) : 0,
    clearableCount,
    hoursToClear: Math.round(clearMinutes / 60),
    weeklyHours: roundTo(weeklyMinutes / 60, 1),
    yearsToClear:
      weeklyMinutes > 0
        ? roundTo(clearMinutes / (weeklyMinutes * WEEKS_PER_YEAR), 1)
        : null,
  }
}

/** Unplayed, not-completed games with a short HLTB main story — "finish in an evening". */
export const getQuickWins = (
  games: DashboardGame[],
  limit = 6
): DashboardGame[] =>
  games
    .filter((game) => {
      if (!isNeverPlayed(game)) return false
      if (isCompletedForRandomPicker(game)) return false
      const main = game.hltb?.mainStoryMinutes
      return Boolean(main && main > 0 && main <= QUICK_WIN_MAX_MAIN_MINUTES)
    })
    .sort(
      (a, b) =>
        (a.hltb?.mainStoryMinutes ?? 0) - (b.hltb?.mainStoryMinutes ?? 0)
    )
    .slice(0, limit)

/** Games with high but incomplete achievement progress — nudge them to 100%. */
export const getAlmostThere = (
  games: DashboardGame[],
  limit = 6
): DashboardGame[] =>
  games
    .filter((game) => {
      const achievements = game.achievements
      return Boolean(
        achievements?.hasAchievements &&
          achievements.totalCount > 0 &&
          achievements.completionPercent >= ALMOST_THERE_MIN_PERCENT &&
          achievements.completionPercent <= ALMOST_THERE_MAX_PERCENT
      )
    })
    .sort(
      (a, b) =>
        (b.achievements?.completionPercent ?? 0) -
        (a.achievements?.completionPercent ?? 0)
    )
    .slice(0, limit)

/** Deepest backlog: unplayed, not-completed games sorted oldest release first. */
export const getOldestUnplayed = (
  games: DashboardGame[],
  limit = 6
): DashboardGame[] =>
  games
    .filter((game) => isNeverPlayed(game) && !isCompletedForRandomPicker(game))
    .sort((a, b) => getReleaseTimestamp(a) - getReleaseTimestamp(b))
    .slice(0, limit)
