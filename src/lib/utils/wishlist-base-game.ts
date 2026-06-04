import type { DashboardGame } from "@/types/dashboard"

export const isWishlistBaseGame = (game: DashboardGame): boolean => {
  const type = game.steamDetails?.type?.toLowerCase()
  if (!type) return true
  return type === "game"
}

export const filterWishlistBaseGames = (
  games: DashboardGame[]
): DashboardGame[] => games.filter(isWishlistBaseGame)
