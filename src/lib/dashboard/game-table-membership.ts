import { isAntiCheatTableRow } from "@/lib/anticheat/stats"
import type { DashboardNavItem } from "@/lib/dashboard/dashboard-nav"
import { isMacSupported } from "@/lib/utils/platform-support"
import { filterWishlistBaseGames } from "@/lib/utils/wishlist-base-game"
import type { DashboardGame } from "@/types/dashboard"

export type DashboardTableContext = {
  games: DashboardGame[]
  wishlistGames: DashboardGame[]
}

export const isVrListedGame = (game: DashboardGame): boolean =>
  game.steamDetails?.vrSupported === true || game.steamDetails?.vrOnly === true

const isInLibraryOrWishlistTable = (
  game: DashboardGame,
  context: DashboardTableContext
): boolean => {
  const appid = game.appid
  if (context.games.some((row) => row.appid === appid)) return true
  return filterWishlistBaseGames(context.wishlistGames).some(
    (row) => row.appid === appid
  )
}

const TABLE_MEMBERSHIP: Record<
  string,
  (game: DashboardGame, context: DashboardTableContext) => boolean
> = {
  library: isInLibraryOrWishlistTable,
  howlongtobeat: isInLibraryOrWishlistTable,
  protondb: isInLibraryOrWishlistTable,
  anticheat: (game) => isAntiCheatTableRow(game),
  mac: (game) => isMacSupported(game),
  vr: (game) => isVrListedGame(game),
}

export const isGameListedOnDashboardTable = (
  segment: string,
  game: DashboardGame,
  context: DashboardTableContext
): boolean => {
  const matches = TABLE_MEMBERSHIP[segment]
  if (!matches) return false
  return matches(game, context)
}

export const filterTableNavItemsForGame = (
  items: DashboardNavItem[],
  game: DashboardGame,
  context: DashboardTableContext
): DashboardNavItem[] =>
  items.filter((item) =>
    isGameListedOnDashboardTable(item.segment, game, context)
  )
