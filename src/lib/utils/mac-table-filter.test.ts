import { describe, expect, it } from "vitest"
import type { DashboardGame } from "@/types/dashboard"
import { filterMacTableGames } from "@/lib/utils/mac-table-filter"
import { isMacSupported } from "@/lib/utils/platform-support"

const game = (overrides: Partial<DashboardGame>): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

const macNative = game({
  appid: 1,
  name: "Mac Game",
  steamDetails: {
    platforms: { mac: true, windows: true },
    genres: [{ description: "Action" }],
  },
})

const windowsOnly = game({
  appid: 2,
  name: "Windows Only",
  steamDetails: {
    platforms: { mac: false, windows: true },
  },
})

describe("filterMacTableGames", () => {
  const all = [macNative, windowsOnly]

  it("includes only isMacSupported games in the base set", () => {
    expect(isMacSupported(macNative)).toBe(true)
    expect(isMacSupported(windowsOnly)).toBe(false)

    const result = filterMacTableGames(all, {
      search: "",
      selectedGenres: [],
      playedOnly: false,
      neverPlayedOnly: false,
    })
    expect(result.map((g) => g.appid)).toEqual([1])
  })

  it("filters by genre within the Mac-native subset", () => {
    const rpgMac = game({
      appid: 5,
      name: "Mac RPG",
      steamDetails: {
        platforms: { mac: true },
        genres: [{ description: "RPG" }],
      },
    })

    const result = filterMacTableGames([macNative, rpgMac], {
      search: "",
      selectedGenres: ["RPG"],
      playedOnly: false,
      neverPlayedOnly: false,
    })
    expect(result.map((g) => g.appid)).toEqual([5])
  })

  it("applies search and playtime filters", () => {
    const played = game({
      ...macNative,
      appid: 6,
      name: "Played Mac",
      playtimeForeverMinutes: 120,
    })

    const result = filterMacTableGames([macNative, played], {
      search: "played",
      selectedGenres: [],
      playedOnly: true,
      neverPlayedOnly: false,
    })
    expect(result.map((g) => g.appid)).toEqual([6])
  })
})
