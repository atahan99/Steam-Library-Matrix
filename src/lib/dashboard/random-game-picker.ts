import { isPerfectAchievementCompletion } from "@/lib/dashboard/achievement-completion"
import type { DashboardGame } from "@/types/dashboard"

export type RandomFn = () => number

export type RandomGamePickerResult = {
  backlog: DashboardGame
  surprise: DashboardGame
}

const TOP_PLAYED_EXCLUDE_COUNT = 30

export const getTopPlayedAppIds = (games: DashboardGame[]): Set<number> => {
  const ranked = [...games]
    .filter((g) => g.playtimeForeverMinutes > 0)
    .sort((a, b) => b.playtimeForeverMinutes - a.playtimeForeverMinutes)
    .slice(0, TOP_PLAYED_EXCLUDE_COUNT)
  return new Set(ranked.map((g) => g.appid))
}

export const getReleaseTimestamp = (game: DashboardGame): number => {
  const raw = game.steamDetails?.releaseDate?.date
  if (!raw) return Number.POSITIVE_INFINITY
  const parsed = Date.parse(raw)
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

export const isCompletedForRandomPicker = (game: DashboardGame): boolean => {
  const achievements = game.achievements
  if (
    achievements?.hasAchievements &&
    achievements.totalCount > 0 &&
    isPerfectAchievementCompletion(
      achievements.unlockedCount,
      achievements.totalCount
    )
  ) {
    return true
  }

  const hltb = game.hltb
  const playtime = game.playtimeForeverMinutes
  if (!hltb || playtime <= 0) return false

  if (
    hltb.completionistMinutes &&
    hltb.completionistMinutes > 0 &&
    playtime >= hltb.completionistMinutes
  ) {
    return true
  }

  if (
    hltb.mainExtraMinutes &&
    hltb.mainExtraMinutes > 0 &&
    playtime >= hltb.mainExtraMinutes
  ) {
    return true
  }

  if (
    hltb.mainStoryMinutes &&
    hltb.mainStoryMinutes > 0 &&
    playtime >= hltb.mainStoryMinutes
  ) {
    return true
  }

  return false
}

export const buildRandomPickerEligiblePool = (
  games: DashboardGame[]
): DashboardGame[] => {
  const topPlayed = getTopPlayedAppIds(games)
  return games.filter(
    (g) =>
      !topPlayed.has(g.appid) &&
      g.playtime2WeeksMinutes <= 0 &&
      !isCompletedForRandomPicker(g)
  )
}

const pickUniform = <T>(items: T[], random: RandomFn): T | undefined => {
  if (items.length === 0) return undefined
  const index = Math.floor(random() * items.length)
  return items[index]
}

const pickBacklogGame = (
  eligible: DashboardGame[],
  random: RandomFn
): DashboardGame | undefined => {
  const unplayed = eligible.filter((g) => g.playtimeForeverMinutes === 0)
  const pool = unplayed.length > 0 ? unplayed : eligible
  if (pool.length === 0) return undefined

  const sorted = [...pool].sort(
    (a, b) => getReleaseTimestamp(a) - getReleaseTimestamp(b)
  )
  const quartileSize = Math.max(1, Math.ceil(sorted.length * 0.25))
  const oldestSlice = sorted.slice(0, quartileSize)
  return pickUniform(oldestSlice, random)
}

const pickSurpriseGame = (
  eligible: DashboardGame[],
  excludeAppId: number,
  random: RandomFn
): DashboardGame | undefined => {
  const pool = eligible.filter((g) => g.appid !== excludeAppId)
  return pickUniform(pool, random)
}

export const pickRandomGames = (
  games: DashboardGame[],
  random: RandomFn = Math.random
): RandomGamePickerResult | null => {
  const eligible = buildRandomPickerEligiblePool(games)
  if (eligible.length < 2) return null

  const backlog = pickBacklogGame(eligible, random)
  if (!backlog) return null

  const surprise = pickSurpriseGame(eligible, backlog.appid, random)
  if (!surprise) return null

  return { backlog, surprise }
}
