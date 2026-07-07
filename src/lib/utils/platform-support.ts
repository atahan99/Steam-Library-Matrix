import { hasStoredSteamPlatforms } from "@/lib/steam/parse-steam-platforms"
import { isRatingKnown, isRatingPlayable } from "@/lib/mac/macos-compat-rating"
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

/** Game has any tested AppleGamingWiki signal (native, Rosetta, or CrossOver). */
export const hasMacCompatData = (game: DashboardGame): boolean => {
  const mac = game.macosCompat
  if (!mac) return false
  return (
    isRatingKnown(mac.native) ||
    isRatingKnown(mac.rosetta2) ||
    isRatingKnown(mac.crossover)
  )
}

/** A tested native Apple Silicon build exists. */
export const hasNativeAppleSilicon = (game: DashboardGame): boolean =>
  game.macosCompat ? isRatingKnown(game.macosCompat.native) : false

/** At least menu-level playable through CrossOver. */
export const isCrossoverPlayable = (game: DashboardGame): boolean =>
  game.macosCompat ? isRatingPlayable(game.macosCompat.crossover) : false

/** At least menu-level playable through Rosetta 2. */
export const isRosettaPlayable = (game: DashboardGame): boolean =>
  game.macosCompat ? isRatingPlayable(game.macosCompat.rosetta2) : false

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
