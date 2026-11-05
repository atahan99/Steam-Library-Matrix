import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/utils/fetch-with-timeout", () => ({ fetchWithTimeout: fetchMock }))

import { getPlayerAchievementStats } from "@/lib/steam/steam-api"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

// Player call is rejected with 403; the schema call answers with `schema`.
const route = (schema: unknown) =>
  fetchMock.mockImplementation(async (url: string) =>
    url.includes("GetPlayerAchievements")
      ? json({ playerstats: { error: "Profile is not public", success: false } }, 403)
      : json(schema)
  )

describe("getPlayerAchievementStats on HTTP 403", () => {
  beforeEach(() => {
    vi.stubEnv("STEAM_API_KEY", "test-key")
    fetchMock.mockReset()
  })

  it("records 'no achievements' for stat-less apps like playtests", async () => {
    route({ game: {} })
    await expect(getPlayerAchievementStats("76561198000000001", 3659740)).resolves.toEqual({
      hasAchievements: false,
      unlockedCount: 0,
      totalCount: 0,
      completionPercent: 0,
    })
  })

  it("stays retryable when the game has achievements (profile may really be private)", async () => {
    route({ game: { availableGameStats: { achievements: [{ name: "A1" }] } } })
    await expect(getPlayerAchievementStats("76561198000000001", 570)).resolves.toBeNull()
  })
})
