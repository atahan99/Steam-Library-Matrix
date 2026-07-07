export const UTILITIES_FILTER_GENRE = "Utilities"

/** Standard Steam store game genres used for library filtering. */
export const STEAM_GAME_GENRES = [
  "Action",
  "Adventure",
  "Casual",
  "Early Access",
  "Free To Play",
  "Indie",
  "Massively Multiplayer",
  "Racing",
  "RPG",
  "Simulation",
  "Sports",
  "Strategy",
] as const

export type SteamGameGenre = (typeof STEAM_GAME_GENRES)[number]

const STEAM_GAME_GENRE_SET = new Set<string>(STEAM_GAME_GENRES)

export type LibraryGenreSource = {
  type?: string | null
  genres?: unknown[]
}

export const parseGenreLabels = (genres: unknown[] | undefined): string[] => {
  if (!genres?.length) return []
  const labels = genres
    .map((g) => {
      if (typeof g === "object" && g && "description" in g) {
        return String((g as { description: string }).description).trim()
      }
      return String(g).trim()
    })
    .filter(Boolean)
  return [...new Set(labels)]
}

export const getLibraryFilterGenres = (
  source: LibraryGenreSource | undefined
): string[] => {
  if (!source) return []

  const raw = parseGenreLabels(source.genres)
  const gameGenres = raw.filter((label) => STEAM_GAME_GENRE_SET.has(label))

  const hasUtilityGenre = raw.some((label) => !STEAM_GAME_GENRE_SET.has(label))
  const isNonGameType =
    typeof source.type === "string" &&
    source.type.length > 0 &&
    source.type !== "game"

  const tags = [...gameGenres]
  if (hasUtilityGenre || isNonGameType) {
    tags.push(UTILITIES_FILTER_GENRE)
  }

  return [...new Set(tags)]
}

export const collectLibraryGenreFilterOptions = (
  sources: Array<LibraryGenreSource | undefined>
): string[] => {
  const options = new Set<string>()
  for (const source of sources) {
    for (const genre of getLibraryFilterGenres(source)) {
      options.add(genre)
    }
  }
  return sortGenreFilterOptions([...options])
}

export const sortGenreFilterOptions = (options: string[]): string[] => {
  const gameGenres = options
    .filter((option) => option !== UTILITIES_FILTER_GENRE)
    .sort((a, b) => a.localeCompare(b))
  const utilities = options.includes(UTILITIES_FILTER_GENRE)
    ? [UTILITIES_FILTER_GENRE]
    : []
  return [...gameGenres, ...utilities]
}

export const gameMatchesGenreFilter = (
  source: LibraryGenreSource | undefined,
  selected: string[]
): boolean => {
  if (selected.length === 0) return true
  const labels = getLibraryFilterGenres(source)
  if (!labels.length) return false
  return selected.some((genre) => labels.includes(genre))
}
