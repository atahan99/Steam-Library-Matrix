import { describe, expect, it } from "vitest"
import {
  filterTableNavItemsForGame,
  isGameListedOnDashboardTable,
  isVrListedGame,
} from "@/lib/dashboard/game-table-membership"
import { dashboardTableNavItems } from "@/lib/dashboard/dashboard-nav"
import type { DashboardGame } from "@/types/dashboard"

const game = (partial: Partial<DashboardGame> & Pick<DashboardGame, "appid">): DashboardGame =>
  ({
    name: `Game ${partial.appid}`,
    playtimeForeverMinutes: 0,
    playtime2WeeksMinutes: 0,
    ...partial,
  }) as DashboardGame

const context = {
  games: [game({ appid: 1 }), game({ appid: 2 })],
  wishlistGames: [game({ appid: 3 })],
}

describe("game-table-membership", () => {
  it("includes library pool games on library, hltb, and protondb tables", () => {
    const owned = game({ appid: 1 })
    expect(isGameListedOnDashboardTable("library", owned, context)).toBe(true)
    expect(isGameListedOnDashboardTable("howlongtobeat", owned, context)).toBe(
      true
    )
    expect(isGameListedOnDashboardTable("protondb", owned, context)).toBe(true)
  })

  it("includes wishlist-only games in library pool tables", () => {
    const wishlistOnly = game({ appid: 3 })
    expect(isGameListedOnDashboardTable("library", wishlistOnly, context)).toBe(
      true
    )
  })

  it("excludes games outside the library and wishlist pool", () => {
    const outsider = game({ appid: 999 })
    expect(isGameListedOnDashboardTable("library", outsider, context)).toBe(
      false
    )
  })

  it("matches mac table rows only for native mac games", () => {
    const macGame = game({
      appid: 10,
      steamDetails: { platforms: { mac: true } },
    })
    const windowsGame = game({
      appid: 11,
      steamDetails: { platforms: { windows: true } },
    })

    expect(isGameListedOnDashboardTable("mac", macGame, context)).toBe(true)
    expect(isGameListedOnDashboardTable("mac", windowsGame, context)).toBe(false)
  })

  it("matches vr table rows only for vr-supported games", () => {
    expect(
      isVrListedGame(
        game({ appid: 20, steamDetails: { vrSupported: true } })
      )
    ).toBe(true)
    expect(
      isGameListedOnDashboardTable(
        "vr",
        game({ appid: 21, steamDetails: { vrSupported: false } }),
        context
      )
    ).toBe(false)
  })

  it("matches anti-cheat table rows using isAntiCheatTableRow rules", () => {
    const listed = game({
      appid: 30,
      antiCheat: {
        status: "Supported",
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    const unknownOnly = game({
      appid: 31,
      antiCheat: {
        status: "Unknown",
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })

    expect(isGameListedOnDashboardTable("anticheat", listed, context)).toBe(true)
    expect(isGameListedOnDashboardTable("anticheat", unknownOnly, context)).toBe(
      false
    )
  })

  it("filters nav items to listed tables only", () => {
    const bg3 = game({
      appid: 1,
      steamDetails: {
        platforms: { windows: true },
        vrSupported: false,
      },
      protondb: { tier: "gold", lastCheckedAt: "2026-01-01T00:00:00.000Z" },
      hltb: { mainStoryMinutes: 120 },
    })

    const items = filterTableNavItemsForGame(
      dashboardTableNavItems,
      bg3,
      context
    )

    expect(items.map((item) => item.segment).sort()).toEqual(
      ["howlongtobeat", "library", "protondb"].sort()
    )
  })
})
