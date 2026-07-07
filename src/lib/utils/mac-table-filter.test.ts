import { describe, expect, it } from "vitest"
import type { DashboardGame } from "@/types/dashboard"
import { filterMacTableGames } from "@/lib/utils/mac-table-filter"
import { hasMacCompatData } from "@/lib/utils/platform-support"

const game = (overrides: Partial<DashboardGame>): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

const macCompatGame = game({
  appid: 1,
  name: "Mac Game",
  macosCompat: {
    native: "playable",
    rosetta2: "unknown",
    crossover: "unknown",
    lastCheckedAt: "2026-01-01T00:00:00.000Z",
  },
  steamDetails: {
    genres: [{ description: "Action" }],
  },
})

const noCompat = game({
  appid: 2,
  name: "No Mac Data",
})

describe("filterMacTableGames", () => {
  const all = [macCompatGame, noCompat]

  it("includes only hasMacCompatData games in the base set", () => {
    expect(hasMacCompatData(macCompatGame)).toBe(true)
    expect(hasMacCompatData(noCompat)).toBe(false)

    const result = filterMacTableGames(all, {
      search: "",
      selectedGenres: [],
      playedOnly: false,
      neverPlayedOnly: false,
      compatFilter: "all",
    })
    expect(result.map((g) => g.appid)).toEqual([1])
  })

  it("filters by genre within the Mac-compat subset", () => {
    const rpgMac = game({
      appid: 5,
      name: "Mac RPG",
      macosCompat: {
        native: "playable",
        rosetta2: "unknown",
        crossover: "unknown",
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
      steamDetails: {
        genres: [{ description: "RPG" }],
      },
    })

    const result = filterMacTableGames([macCompatGame, rpgMac], {
      search: "",
      selectedGenres: ["RPG"],
      playedOnly: false,
      neverPlayedOnly: false,
      compatFilter: "all",
    })
    expect(result.map((g) => g.appid)).toEqual([5])
  })

  it("applies search and playtime filters", () => {
    const played = game({
      ...macCompatGame,
      appid: 6,
      name: "Played Mac",
      playtimeForeverMinutes: 120,
    })

    const result = filterMacTableGames([macCompatGame, played], {
      search: "played",
      selectedGenres: [],
      playedOnly: true,
      neverPlayedOnly: false,
      compatFilter: "all",
    })
    expect(result.map((g) => g.appid)).toEqual([6])
  })
})
