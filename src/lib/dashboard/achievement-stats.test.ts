import { describe, expect, it } from "vitest"
import {
  computeCompletionPercent,
  isPerfectAchievementCompletion,
} from "@/lib/dashboard/achievement-completion"
import { computeLibraryAchievementStats } from "@/lib/dashboard/achievement-stats"
import type { DashboardGame } from "@/types/dashboard"

const gameWithAchievements = (
  appid: number,
  unlocked: number,
  total: number
): DashboardGame => ({
  appid,
  name: `Game ${appid}`,
  playtimeForeverMinutes: 60,
  playtime2WeeksMinutes: 0,
  achievements: {
    unlockedCount: unlocked,
    totalCount: total,
    completionPercent: 0,
    hasAchievements: total > 0,
    lastCheckedAt: "2026-01-01T00:00:00.000Z",
  },
})

describe("computeCompletionPercent", () => {
  it("floors like the Steam client", () => {
    expect(computeCompletionPercent(1, 3)).toBe(33)
    expect(computeCompletionPercent(2, 3)).toBe(66)
    expect(computeCompletionPercent(3, 3)).toBe(100)
  })
})

describe("isPerfectAchievementCompletion", () => {
  it("requires every achievement unlocked", () => {
    expect(isPerfectAchievementCompletion(10, 10)).toBe(true)
    expect(isPerfectAchievementCompletion(9, 10)).toBe(false)
  })
})

describe("computeLibraryAchievementStats", () => {
  it("counts perfect games by unlocked vs total, not rounded percent", () => {
    const stats = computeLibraryAchievementStats([
      gameWithAchievements(1, 3, 3),
      gameWithAchievements(2, 2, 2),
      gameWithAchievements(3, 1, 3),
    ])
    expect(stats.completedCount).toBe(2)
    expect(stats.trackableCount).toBe(3)
  })

  it("averages only games with at least one unlock", () => {
    const stats = computeLibraryAchievementStats([
      gameWithAchievements(1, 3, 3),
      gameWithAchievements(2, 0, 10),
      gameWithAchievements(3, 1, 3),
    ])
    expect(stats.withProgressCount).toBe(2)
    expect(stats.averageCompletionPercent).toBe(67)
  })

  it("treats synced 0% games as hasData", () => {
    const stats = computeLibraryAchievementStats([
      gameWithAchievements(1, 0, 10),
    ])
    expect(stats.hasData).toBe(true)
    expect(stats.trackableCount).toBe(1)
    expect(stats.withProgressCount).toBe(0)
  })
})
