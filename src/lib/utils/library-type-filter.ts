import type { DashboardGame } from "@/types/dashboard"

export type LibraryTypeFilter = "all" | "game" | "dlc"

export const parseLibraryTypeFilter = (
  value: string | null
): LibraryTypeFilter => {
  if (value === "game" || value === "dlc") return value
  return "all"
}

export const gameMatchesLibraryTypeFilter = (
  game: DashboardGame,
  filter: LibraryTypeFilter
): boolean => {
  if (filter === "all") return true
  const type = game.steamDetails?.type?.toLowerCase()
  if (filter === "dlc") return type === "dlc"
  // ponytail: unenriched rows count as games until appdetails lands (same as wishlist-base-game)
  return !type || type === "game"
}
