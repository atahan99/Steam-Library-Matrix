import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/steam/steam-api", () => ({
  getPlayerAchievementStats: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}))

import { getPlayerAchievementStats } from "@/lib/steam/steam-api"
import { getDb } from "@/lib/db/client"
import { enrichSingleAchievement } from "@/lib/enrichment/achievements"

const mockedGetPlayerAchievementStats = vi.mocked(getPlayerAchievementStats)
const mockedGetDb = vi.mocked(getDb)

describe("enrichSingleAchievement", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("passes cached totalCount to getPlayerAchievementStats on refresh", async () => {
    mockedGetDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => ({
              all: () => [
                {
                  lastCheckedAt: new Date(Date.now() - 200 * 3_600_000),
                  totalCount: 42,
                },
              ],
            }),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => Promise.resolve(),
        }),
      }),
    } as never)

    mockedGetPlayerAchievementStats.mockResolvedValue({
      hasAchievements: true,
      unlockedCount: 10,
      totalCount: 42,
      completionPercent: 24,
    })

    await enrichSingleAchievement("76561198000000000", 570, false, {
      applyDelay: false,
    })

    expect(mockedGetPlayerAchievementStats).toHaveBeenCalledWith(
      "76561198000000000",
      570,
      { cachedTotalCount: 42 }
    )
  })
})
