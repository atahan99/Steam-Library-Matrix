import { describe, expect, it } from "vitest"
import { searchDashboardGames } from "@/lib/dashboard/search-games"
import type { DashboardGame } from "@/types/dashboard"

const g = (appid: number, name: string): DashboardGame =>
  ({
    appid,
    name,
    playtimeForeverMinutes: 0,
    playtime2WeeksMinutes: 0,
  }) as DashboardGame

describe("searchDashboardGames", () => {
  it("returns empty for blank query", () => {
    expect(searchDashboardGames([g(1, "Half-Life")], [], "  ")).toEqual([])
  })

  it("dedupes wishlist when also in library", () => {
    const hits = searchDashboardGames(
      [g(1, "Portal")],
      [g(1, "Portal")],
      "portal"
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.collection).toBe("library")
  })

  it("ranks prefix matches first", () => {
    const hits = searchDashboardGames(
      [
        g(1, "Dota 2"),
        g(2, "Half-Life"),
        g(3, "Half-Life 2"),
      ],
      [],
      "half"
    )
    expect(hits.map((h) => h.game.appid)).toEqual([2, 3])
  })
})
