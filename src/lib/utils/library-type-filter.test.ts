import { describe, expect, it } from "vitest"
import type { DashboardGame } from "@/types/dashboard"
import {
  gameMatchesLibraryTypeFilter,
  parseLibraryTypeFilter,
} from "@/lib/utils/library-type-filter"

const game = (type?: string): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  steamDetails: type ? { type } : undefined,
})

describe("parseLibraryTypeFilter", () => {
  it("accepts game and dlc, defaults to all", () => {
    expect(parseLibraryTypeFilter("game")).toBe("game")
    expect(parseLibraryTypeFilter("dlc")).toBe("dlc")
    expect(parseLibraryTypeFilter(null)).toBe("all")
    expect(parseLibraryTypeFilter("nope")).toBe("all")
  })
})

describe("gameMatchesLibraryTypeFilter", () => {
  it("filters by steamDetails.type", () => {
    expect(gameMatchesLibraryTypeFilter(game("game"), "all")).toBe(true)
    expect(gameMatchesLibraryTypeFilter(game("dlc"), "all")).toBe(true)

    expect(gameMatchesLibraryTypeFilter(game("game"), "game")).toBe(true)
    expect(gameMatchesLibraryTypeFilter(game("DLC"), "game")).toBe(false)
    expect(gameMatchesLibraryTypeFilter(game(), "game")).toBe(true)

    expect(gameMatchesLibraryTypeFilter(game("dlc"), "dlc")).toBe(true)
    expect(gameMatchesLibraryTypeFilter(game("DLC"), "dlc")).toBe(true)
    expect(gameMatchesLibraryTypeFilter(game("game"), "dlc")).toBe(false)
    expect(gameMatchesLibraryTypeFilter(game(), "dlc")).toBe(false)
  })
})
