import { describe, expect, it } from "vitest"
import type { DashboardGame } from "@/types/dashboard"
import {
  buildRandomPickerEligiblePool,
  getTopPlayedAppIds,
  isCompletedForRandomPicker,
  pickRandomGames,
} from "@/lib/dashboard/random-game-picker"

const game = (
  appid: number,
  opts: {
    forever?: number
    recent?: number
    releaseDate?: string
    achievements?: DashboardGame["achievements"]
    hltb?: DashboardGame["hltb"]
  } = {}
): DashboardGame => ({
  appid,
  name: `Game ${appid}`,
  playtimeForeverMinutes: opts.forever ?? 0,
  playtime2WeeksMinutes: opts.recent ?? 0,
  achievements: opts.achievements,
  hltb: opts.hltb,
  steamDetails: opts.releaseDate
    ? { releaseDate: { comingSoon: false, date: opts.releaseDate } }
    : undefined,
})

describe("getTopPlayedAppIds", () => {
  it("returns up to 30 highest playtime app ids", () => {
    const games = Array.from({ length: 40 }, (_, i) =>
      game(i + 1, { forever: (40 - i) * 60 })
    )
    const top = getTopPlayedAppIds(games)
    expect(top.size).toBe(30)
    expect(top.has(1)).toBe(true)
    expect(top.has(30)).toBe(true)
    expect(top.has(31)).toBe(false)
  })
})

describe("isCompletedForRandomPicker", () => {
  it("returns true for 100% achievements", () => {
    expect(
      isCompletedForRandomPicker(
        game(1, {
          achievements: {
            unlockedCount: 50,
            totalCount: 50,
            completionPercent: 100,
            hasAchievements: true,
          },
        })
      )
    ).toBe(true)
  })

  it("returns true when playtime meets HLTB completionist", () => {
    expect(
      isCompletedForRandomPicker(
        game(1, {
          forever: 6000,
          hltb: { completionistMinutes: 5000 },
        })
      )
    ).toBe(true)
  })

  it("returns true when playtime meets HLTB main story", () => {
    expect(
      isCompletedForRandomPicker(
        game(1, {
          forever: 1200,
          hltb: { mainStoryMinutes: 1000 },
        })
      )
    ).toBe(true)
  })
})

describe("buildRandomPickerEligiblePool", () => {
  it("excludes completed games", () => {
    const eligible = buildRandomPickerEligiblePool([
      game(1, {
        forever: 5000,
        achievements: {
          unlockedCount: 10,
          totalCount: 10,
          completionPercent: 100,
          hasAchievements: true,
        },
      }),
      game(2, { forever: 0, releaseDate: "1 Jan, 2000" }),
      game(3, { forever: 0, releaseDate: "1 Jan, 2001" }),
    ])
    expect(eligible.map((g) => g.appid)).toEqual([2, 3])
  })

  it("excludes top 30 played and recent activity", () => {
    const games = [
      ...Array.from({ length: 30 }, (_, i) =>
        game(i + 1, { forever: 1000 - i })
      ),
      game(99, { forever: 0, recent: 10 }),
      game(100, { forever: 5 }),
    ]
    const eligible = buildRandomPickerEligiblePool(games)
    expect(eligible.map((g) => g.appid)).toEqual([100])
  })
})

describe("pickRandomGames", () => {
  it("returns distinct backlog and surprise picks", () => {
    const games = [
      game(1, { forever: 5000 }),
      game(2, { forever: 0, releaseDate: "1 Jan, 1990" }),
      game(3, { forever: 0, releaseDate: "1 Jan, 2000" }),
      game(4, { forever: 10, releaseDate: "1 Jan, 2010" }),
    ]
    const result = pickRandomGames(games, () => 0)
    expect(result).not.toBeNull()
    expect(result!.backlog.appid).not.toBe(result!.surprise.appid)
  })

  it("prefers oldest unplayed for backlog", () => {
    const games = [
      game(1, { forever: 5000 }),
      game(2, { forever: 0, releaseDate: "1 Jan, 1985" }),
      game(3, { forever: 0, releaseDate: "1 Jan, 1995" }),
      game(4, { forever: 0, releaseDate: "1 Jan, 2005" }),
    ]
    const result = pickRandomGames(games, () => 0)
    expect(result!.backlog.appid).toBe(2)
  })

  it("returns null when fewer than two eligible games", () => {
    const games = [game(1, { forever: 5000 }), game(2, { forever: 100 })]
    expect(pickRandomGames(games)).toBeNull()
  })
})
