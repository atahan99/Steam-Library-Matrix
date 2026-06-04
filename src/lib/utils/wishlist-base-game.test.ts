import { describe, expect, it } from "vitest"
import type { DashboardGame } from "@/types/dashboard"
import {
  filterWishlistBaseGames,
  isWishlistBaseGame,
} from "@/lib/utils/wishlist-base-game"

const game = (type?: string): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  steamDetails: type ? { type } : undefined,
})

describe("isWishlistBaseGame", () => {
  it("includes games with type game", () => {
    expect(isWishlistBaseGame(game("game"))).toBe(true)
  })

  it("excludes dlc", () => {
    expect(isWishlistBaseGame(game("dlc"))).toBe(false)
  })

  it("excludes other non-base store types", () => {
    expect(isWishlistBaseGame(game("demo"))).toBe(false)
    expect(isWishlistBaseGame(game("music"))).toBe(false)
  })

  it("keeps items without enriched type until app details arrive", () => {
    expect(isWishlistBaseGame(game())).toBe(true)
  })
})

describe("filterWishlistBaseGames", () => {
  it("removes dlc from the list", () => {
    expect(
      filterWishlistBaseGames([game("game"), game("dlc"), game("game")])
    ).toHaveLength(2)
  })
})
