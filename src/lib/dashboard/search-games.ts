import type { DashboardCollection } from "@/components/dashboard/dashboard-context"
import type { DashboardGame } from "@/types/dashboard"

export type GameSearchHit = {
  game: DashboardGame
  collection: DashboardCollection
}

const rankScore = (name: string, query: string): number => {
  const lower = name.toLowerCase()
  const q = query.toLowerCase()
  if (lower.startsWith(q)) return 0
  if (lower.includes(q)) return 1
  return 2
}

export const searchDashboardGames = (
  libraryGames: DashboardGame[],
  wishlistGames: DashboardGame[],
  query: string,
  limit = 20
): GameSearchHit[] => {
  const trimmed = query.trim()
  if (!trimmed) return []

  const byAppid = new Map<number, GameSearchHit>()

  for (const game of libraryGames) {
    byAppid.set(game.appid, { game, collection: "library" })
  }
  for (const game of wishlistGames) {
    if (!byAppid.has(game.appid)) {
      byAppid.set(game.appid, { game, collection: "wishlist" })
    }
  }

  return [...byAppid.values()]
    .filter((hit) =>
      hit.game.name.toLowerCase().includes(trimmed.toLowerCase())
    )
    .sort((a, b) => {
      const scoreA = rankScore(a.game.name, trimmed)
      const scoreB = rankScore(b.game.name, trimmed)
      if (scoreA !== scoreB) return scoreA - scoreB
      return a.game.name.localeCompare(b.game.name)
    })
    .slice(0, limit)
}
