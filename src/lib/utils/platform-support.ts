import { hasStoredSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import type { DashboardGame } from "@/types/dashboard"

export const hasPlatformData = (game: DashboardGame): boolean =>
  hasStoredSteamPlatforms(game.steamDetails?.platforms)

export const isWindowsSupported = (game: DashboardGame): boolean =>
  game.steamDetails?.platforms?.windows === true

export const isLinuxSupported = (game: DashboardGame): boolean =>
  game.steamDetails?.platforms?.linux === true

/** Native Mac support from Steam store app details (`platforms.mac`). */
export const isMacSupported = (game: DashboardGame): boolean =>
  game.steamDetails?.platforms?.mac === true

export type OsFilterPlatform = "windows" | "linux" | "mac"

export const gameMatchesOsFilter = (
  game: DashboardGame,
  selected: OsFilterPlatform[]
): boolean => {
  if (selected.length === 0) return true
  if (!hasPlatformData(game)) return false
  return selected.some((platform) => {
    if (platform === "windows") return isWindowsSupported(game)
    if (platform === "linux") return isLinuxSupported(game)
    return isMacSupported(game)
  })
}
