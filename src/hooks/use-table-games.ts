"use client"

import { useMemo } from "react"
import {
  useDashboard,
  useDashboardCollection,
} from "@/components/dashboard/dashboard-context"
import { filterWishlistBaseGames } from "@/lib/utils/wishlist-base-game"
import type { DashboardGame } from "@/types/dashboard"

export const useTableGames = (): DashboardGame[] => {
  const { games, wishlistGames } = useDashboard()
  const { collection } = useDashboardCollection()
  const filteredWishlist = useMemo(
    () => filterWishlistBaseGames(wishlistGames),
    [wishlistGames]
  )
  return collection === "wishlist" ? filteredWishlist : games
}
