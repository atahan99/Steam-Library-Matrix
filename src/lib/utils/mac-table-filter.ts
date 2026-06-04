import {
  gameMatchesGenreFilter,
} from "@/lib/utils/genre-label"
import { isMacSupported } from "@/lib/utils/platform-support"
import type { DashboardGame } from "@/types/dashboard"

export type MacTableFilterInput = {
  search: string
  selectedGenres: string[]
  playedOnly: boolean
  neverPlayedOnly: boolean
}

export const filterMacTableGames = (
  games: DashboardGame[],
  filters: MacTableFilterInput
): DashboardGame[] => {
  const searchLower = filters.search.toLowerCase()

  return games
    .filter(isMacSupported)
    .filter((g) => g.name.toLowerCase().includes(searchLower))
    .filter((g) =>
      gameMatchesGenreFilter(g.steamDetails, filters.selectedGenres)
    )
    .filter((g) => {
      if (filters.playedOnly) return g.playtimeForeverMinutes > 0
      if (filters.neverPlayedOnly) return g.playtimeForeverMinutes === 0
      return true
    })
}
