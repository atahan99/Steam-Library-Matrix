import { describe, expect, it } from "vitest"
import {
  UNTAGGED_GENRE,
  buildGenreChartData,
  getLargestGenreByCount,
  getLargestGenreByPlaytime,
  matchesGenreChartFilter,
} from "@/lib/dashboard/genre-chart-data"
import { UTILITIES_FILTER_GENRE } from "@/lib/utils/genre-label"
import type { DashboardGame } from "@/types/dashboard"

const game = (
  appid: number,
  playtimeForeverMinutes: number,
  steamDetails?: DashboardGame["steamDetails"]
): DashboardGame => ({
  appid,
  name: `Game ${appid}`,
  playtimeForeverMinutes,
  playtime2WeeksMinutes: 0,
  steamDetails,
})

describe("buildGenreChartData", () => {
  it("counts games and playtime per genre with multi-label attribution", () => {
    const data = buildGenreChartData([
      game(1, 60, {
        type: "game",
        genres: [{ description: "Action" }, { description: "Indie" }],
      }),
      game(2, 120, {
        type: "game",
        genres: [{ description: "Action" }],
      }),
      game(3, 30, {
        type: "game",
        genres: [{ description: "RPG" }],
      }),
    ])

    expect(data.map((d) => d.genre)).toEqual(["Action", "Indie", "RPG"])
    expect(data.find((d) => d.genre === "Action")).toMatchObject({
      count: 2,
      playtimeMinutes: 180,
    })
    expect(data.find((d) => d.genre === "Indie")).toMatchObject({
      count: 1,
      playtimeMinutes: 60,
    })
    expect(data.find((d) => d.genre === "RPG")).toMatchObject({
      count: 1,
      playtimeMinutes: 30,
    })
  })

  it("buckets games without genres as Untagged and sorts Utilities last", () => {
    const data = buildGenreChartData([
      game(1, 10, {
        type: "game",
        genres: [{ description: "Photo Editing" }],
      }),
      game(2, 20),
      game(3, 5, {
        type: "game",
        genres: [{ description: "Strategy" }],
      }),
    ])

    expect(data.map((d) => d.genre)).toEqual([
      "Strategy",
      UTILITIES_FILTER_GENRE,
      UNTAGGED_GENRE,
    ])
    expect(data.find((d) => d.genre === UNTAGGED_GENRE)).toMatchObject({
      count: 1,
      playtimeMinutes: 20,
    })
  })
})

describe("getLargestGenreByCount", () => {
  it("reports share against unique game count", () => {
    const games = [
      game(1, 60, {
        type: "game",
        genres: [{ description: "Action" }, { description: "Indie" }],
      }),
      game(2, 120, {
        type: "game",
        genres: [{ description: "Action" }],
      }),
    ]
    expect(getLargestGenreByCount(games)).toEqual({
      label: "Action",
      count: 2,
      share: 100,
    })
  })
})

describe("getLargestGenreByPlaytime", () => {
  it("picks the genre with the most attributed playtime", () => {
    const games = [
      game(1, 60, {
        type: "game",
        genres: [{ description: "Indie" }],
      }),
      game(2, 180, {
        type: "game",
        genres: [{ description: "RPG" }],
      }),
    ]
    expect(getLargestGenreByPlaytime(games)).toEqual({
      label: "RPG",
      playtimeMinutes: 180,
      share: 75,
    })
  })
})

describe("matchesGenreChartFilter", () => {
  const actionIndie = game(1, 0, {
    type: "game",
    genres: [{ description: "Action" }, { description: "Indie" }],
  })

  it("matches all when filter is all", () => {
    expect(matchesGenreChartFilter(actionIndie, "all")).toBe(true)
  })

  it("matches a selected genre label", () => {
    expect(matchesGenreChartFilter(actionIndie, "Indie")).toBe(true)
    expect(matchesGenreChartFilter(actionIndie, "RPG")).toBe(false)
  })

  it("matches Untagged only when the game has no filter genres", () => {
    expect(matchesGenreChartFilter(game(2, 0), UNTAGGED_GENRE)).toBe(true)
    expect(matchesGenreChartFilter(actionIndie, UNTAGGED_GENRE)).toBe(false)
  })
})

describe("community tags mode", () => {
  const tagged = (appid: number, tags: string[], playtime = 0): DashboardGame => ({
    appid,
    name: `Game ${appid}`,
    playtimeForeverMinutes: playtime,
    playtime2WeeksMinutes: 0,
    steamspy: { tags },
  })

  it("counts each game's top 3 tags, most common first, untagged last", () => {
    const games = [
      tagged(1, ["Roguelike", "Indie", "Pixel Graphics", "Difficult"], 60),
      tagged(2, ["Roguelike", "Story Rich"], 30),
      game(3, 0),
    ]
    const data = buildGenreChartData(games, "tags")
    expect(data.map((d) => [d.genre, d.count])).toEqual([
      ["Roguelike", 2],
      ["Indie", 1],
      ["Pixel Graphics", 1],
      ["Story Rich", 1],
      [UNTAGGED_GENRE, 1],
    ])
    expect(data.find((d) => d.genre === "Roguelike")?.playtimeMinutes).toBe(90)
  })

  it("filters by tag without affecting store-genre mode", () => {
    const g = tagged(1, ["Roguelike"])
    expect(matchesGenreChartFilter(g, "Roguelike", "tags")).toBe(true)
    expect(matchesGenreChartFilter(g, "Roguelike")).toBe(false)
  })
})
