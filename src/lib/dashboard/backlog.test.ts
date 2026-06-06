import { describe, expect, it } from "vitest"
import {
  getAlmostThere,
  getBacklogStats,
  getOldestUnplayed,
  getQuickWins,
} from "@/lib/dashboard/backlog"
import type { DashboardGame } from "@/types/dashboard"

const makeGame = (overrides: Partial<DashboardGame>): DashboardGame => ({
  appid: 1,
  name: "Game",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

describe("getBacklogStats", () => {
  it("counts never-played games and sums HLTB hours to clear", () => {
    const games = [
      makeGame({ appid: 1, playtimeForeverMinutes: 600 }), // played
      makeGame({ appid: 2, hltb: { mainStoryMinutes: 300 } }), // unplayed, 5h
      makeGame({ appid: 3, hltb: { mainStoryMinutes: 120 } }), // unplayed, 2h
      makeGame({ appid: 4 }), // unplayed, no HLTB
    ]

    const stats = getBacklogStats(games)

    expect(stats.ownedCount).toBe(4)
    expect(stats.neverPlayedCount).toBe(3)
    expect(stats.neverPlayedPercent).toBe(75)
    expect(stats.clearableCount).toBe(2)
    expect(stats.hoursToClear).toBe(7) // (300 + 120) / 60
  })

  it("estimates years to clear from the two-week pace", () => {
    const games = [
      makeGame({ appid: 1, hltb: { mainStoryMinutes: 52 * 60 } }), // 52h backlog
      makeGame({ appid: 2, playtimeForeverMinutes: 100, playtime2WeeksMinutes: 120 }), // 1h/week
    ]

    const stats = getBacklogStats(games)

    expect(stats.weeklyHours).toBe(1) // 120 min over 2 weeks = 1h/week
    expect(stats.yearsToClear).toBe(1) // 52h at 1h/week ≈ 1 year
  })

  it("returns null years to clear when there is no recent play", () => {
    const stats = getBacklogStats([
      makeGame({ appid: 1, hltb: { mainStoryMinutes: 600 } }),
    ])

    expect(stats.weeklyHours).toBe(0)
    expect(stats.yearsToClear).toBeNull()
  })
})

describe("getQuickWins", () => {
  it("returns short unplayed games sorted ascending by main story", () => {
    const games = [
      makeGame({ appid: 1, hltb: { mainStoryMinutes: 300 } }),
      makeGame({ appid: 2, hltb: { mainStoryMinutes: 90 } }),
      makeGame({ appid: 3, hltb: { mainStoryMinutes: 9 * 60 } }), // too long
      makeGame({ appid: 4, playtimeForeverMinutes: 60, hltb: { mainStoryMinutes: 60 } }), // played
      makeGame({ appid: 5 }), // no HLTB
    ]

    const wins = getQuickWins(games)

    expect(wins.map((g) => g.appid)).toEqual([2, 1])
  })

  it("excludes games already completed via 100% achievements", () => {
    const completed = makeGame({
      appid: 9,
      hltb: { mainStoryMinutes: 60 },
      achievements: {
        hasAchievements: true,
        totalCount: 10,
        unlockedCount: 10,
        completionPercent: 100,
      },
    })

    expect(getQuickWins([completed])).toHaveLength(0)
  })
})

describe("getAlmostThere", () => {
  it("returns 50-99% completion games sorted descending", () => {
    const games = [
      makeGame({
        appid: 1,
        achievements: { hasAchievements: true, totalCount: 10, unlockedCount: 6, completionPercent: 60 },
      }),
      makeGame({
        appid: 2,
        achievements: { hasAchievements: true, totalCount: 10, unlockedCount: 9, completionPercent: 90 },
      }),
      makeGame({
        appid: 3,
        achievements: { hasAchievements: true, totalCount: 10, unlockedCount: 10, completionPercent: 100 },
      }),
      makeGame({
        appid: 4,
        achievements: { hasAchievements: true, totalCount: 10, unlockedCount: 1, completionPercent: 10 },
      }),
    ]

    expect(getAlmostThere(games).map((g) => g.appid)).toEqual([2, 1])
  })
})

describe("getOldestUnplayed", () => {
  it("returns unplayed games oldest release first", () => {
    const games = [
      makeGame({ appid: 1, steamDetails: { releaseDate: { comingSoon: false, date: "2020-01-01" } } }),
      makeGame({ appid: 2, steamDetails: { releaseDate: { comingSoon: false, date: "2012-01-01" } } }),
      makeGame({ appid: 3, playtimeForeverMinutes: 500, steamDetails: { releaseDate: { comingSoon: false, date: "2010-01-01" } } }), // played
    ]

    expect(getOldestUnplayed(games).map((g) => g.appid)).toEqual([2, 1])
  })
})
