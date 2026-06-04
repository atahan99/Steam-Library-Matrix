import type { DashboardGame } from "@/types/dashboard"

export const intersectGames = (
  baseGames: DashboardGame[],
  ...otherLists: DashboardGame[][]
): DashboardGame[] => {
  if (otherLists.length === 0) return []

  const otherSets = otherLists.map(
    (list) => new Set(list.map((game) => game.appid))
  )

  return baseGames.filter((game) =>
    otherSets.every((appids) => appids.has(game.appid))
  )
}
