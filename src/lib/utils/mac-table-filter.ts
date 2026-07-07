import {
  gameMatchesGenreFilter,
} from "@/lib/utils/genre-label"
import {
  hasMacCompatData,
  hasNativeAppleSilicon,
  isCrossoverPlayable,
  isRosettaPlayable,
} from "@/lib/utils/platform-support"
import type { DashboardGame } from "@/types/dashboard"

export type MacCompatFilter = "all" | "apple-silicon" | "rosetta" | "crossover"

export type MacTableFilterInput = {
  search: string
  selectedGenres: string[]
  playedOnly: boolean
  neverPlayedOnly: boolean
  compatFilter: MacCompatFilter
}

const matchesCompatFilter = (
  game: DashboardGame,
  filter: MacCompatFilter
): boolean => {
  switch (filter) {
    case "apple-silicon":
      return hasNativeAppleSilicon(game)
    case "rosetta":
      return isRosettaPlayable(game)
    case "crossover":
      return isCrossoverPlayable(game)
    default:
      return true
  }
}

export const filterMacTableGames = (
  games: DashboardGame[],
  filters: MacTableFilterInput
): DashboardGame[] => {
  const searchLower = filters.search.toLowerCase()

  return games
    .filter(hasMacCompatData)
    .filter((g) => g.name.toLowerCase().includes(searchLower))
    .filter((g) =>
      gameMatchesGenreFilter(g.steamDetails, filters.selectedGenres)
    )
    .filter((g) => {
      if (filters.playedOnly) return g.playtimeForeverMinutes > 0
      if (filters.neverPlayedOnly) return g.playtimeForeverMinutes === 0
      return true
    })
    .filter((g) => matchesCompatFilter(g, filters.compatFilter))
}
