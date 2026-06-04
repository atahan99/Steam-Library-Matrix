import { describe, expect, it } from "vitest"
import {
  countAchievementsEnrichedGames,
  countAchievementsResolvedGames,
  countAchievementsEnrichedRows,
  countAchievementsResolvedRows,
  hasAchievementData,
  isAchievementLookupResolved,
} from "@/lib/enrichment/achievements-lookup-outcome"
import type { DashboardGame } from "@/types/dashboard"

const game = (
  overrides: Partial<NonNullable<DashboardGame["achievements"]>> = {}
): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  achievements: {
    unlockedCount: 0,
    totalCount: 0,
    completionPercent: 0,
    hasAchievements: false,
    ...overrides,
  },
})

describe("achievements lookup outcome", () => {
  it("treats checked games without achievements as resolved but not enriched", () => {
    const checkedNoAchievements = game({
      hasAchievements: false,
      totalCount: 0,
      lastCheckedAt: new Date().toISOString(),
    })

    expect(hasAchievementData(checkedNoAchievements)).toBe(false)
    expect(isAchievementLookupResolved(checkedNoAchievements)).toBe(true)
  })

  it("counts enriched vs resolved separately", () => {
    const games = [
      game({
        hasAchievements: true,
        totalCount: 10,
        lastCheckedAt: new Date().toISOString(),
      }),
      game({
        hasAchievements: false,
        totalCount: 0,
        lastCheckedAt: new Date().toISOString(),
      }),
      game({ hasAchievements: false, totalCount: 0 }),
    ]

    expect(countAchievementsEnrichedGames(games)).toBe(1)
    expect(countAchievementsResolvedGames(games)).toBe(2)
  })

  it("counts snake_case achievement rows for sync status", () => {
    const rows = [
      {
        appid: 1,
        has_achievements: true,
        total_count: 12,
        last_checked_at: new Date().toISOString(),
      },
      {
        appid: 2,
        has_achievements: false,
        total_count: 0,
        last_checked_at: new Date().toISOString(),
      },
    ]

    expect(countAchievementsEnrichedRows(rows)).toBe(1)
    expect(countAchievementsResolvedRows(rows)).toBe(2)
  })
})
