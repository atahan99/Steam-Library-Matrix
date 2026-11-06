import {
  getLibraryFilterGenres,
  sortGenreFilterOptions,
} from "@/lib/utils/genre-label"
import type { DashboardGame } from "@/types/dashboard"

export const UNTAGGED_GENRE = "Untagged"

const CHART_FILLS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

export type GenreChartDatum = {
  genre: string
  label: string
  count: number
  playtimeMinutes: number
  fill: string
}

export type GenreChartFilter = string | "all"

/** Store genres (Steam's broad categories) or SteamSpy community tags. */
export type GenreMode = "genres" | "tags"

// A game's top few tags describe it; all eight would inflate every slice.
const TAGS_PER_GAME = 3
const MAX_TAG_SLICES = 20

export const labelsForGame = (game: DashboardGame, mode: GenreMode = "genres"): string[] =>
  mode === "tags"
    ? (game.steamspy?.tags ?? []).slice(0, TAGS_PER_GAME)
    : getLibraryFilterGenres(game.steamDetails)

export const buildGenreChartData = (
  games: DashboardGame[],
  mode: GenreMode = "genres"
): GenreChartDatum[] => {
  const byGenre = new Map<string, { count: number; playtimeMinutes: number }>()

  for (const game of games) {
    const genres = labelsForGame(game, mode)
    const labels = genres.length > 0 ? genres : [UNTAGGED_GENRE]
    const playtime = game.playtimeForeverMinutes || 0

    for (const genre of labels) {
      const prev = byGenre.get(genre) ?? { count: 0, playtimeMinutes: 0 }
      prev.count += 1
      prev.playtimeMinutes += playtime
      byGenre.set(genre, prev)
    }
  }

  const keys = [...byGenre.keys()]
  const named = keys.filter((g) => g !== UNTAGGED_GENRE)
  // Tags are open-ended (hundreds), so keep the most common; genres keep their usual order.
  const sortedNamed =
    mode === "tags"
      ? named.sort((a, b) => byGenre.get(b)!.count - byGenre.get(a)!.count).slice(0, MAX_TAG_SLICES)
      : sortGenreFilterOptions(named)
  const ordered = [
    ...sortedNamed,
    ...(keys.includes(UNTAGGED_GENRE) ? [UNTAGGED_GENRE] : []),
  ]

  return ordered.map((genre, index) => {
    const stats = byGenre.get(genre)!
    return {
      genre,
      label: genre,
      count: stats.count,
      playtimeMinutes: stats.playtimeMinutes,
      fill: CHART_FILLS[index % CHART_FILLS.length],
    }
  })
}

export const getLargestGenreByCount = (
  games: DashboardGame[],
  mode: GenreMode = "genres"
): { label: string; count: number; share: number } | null => {
  const data = buildGenreChartData(games, mode).filter((d) => d.count > 0)
  if (data.length === 0 || games.length === 0) return null
  const top = data.reduce((a, b) => (b.count > a.count ? b : a))
  return {
    label: top.label,
    count: top.count,
    share: Math.round((top.count / games.length) * 100),
  }
}

export const getLargestGenreByPlaytime = (
  games: DashboardGame[],
  mode: GenreMode = "genres"
): { label: string; playtimeMinutes: number; share: number } | null => {
  const data = buildGenreChartData(games, mode).filter((d) => d.playtimeMinutes > 0)
  if (data.length === 0) return null
  const totalPlaytime = games.reduce(
    (sum, game) => sum + (game.playtimeForeverMinutes || 0),
    0
  )
  if (totalPlaytime <= 0) return null
  const top = data.reduce((a, b) =>
    b.playtimeMinutes > a.playtimeMinutes ? b : a
  )
  return {
    label: top.label,
    playtimeMinutes: top.playtimeMinutes,
    share: Math.round((top.playtimeMinutes / totalPlaytime) * 100),
  }
}

export const matchesGenreChartFilter = (
  game: DashboardGame,
  filter: GenreChartFilter,
  mode: GenreMode = "genres"
): boolean => {
  if (filter === "all") return true
  const genres = labelsForGame(game, mode)
  if (filter === UNTAGGED_GENRE) return genres.length === 0
  return genres.includes(filter)
}
