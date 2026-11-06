import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchMock, insertMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  insertMock: vi.fn(),
}))

vi.mock("@/lib/enrichment/hltb-client", () => ({
  searchHltbGames: searchMock,
  fetchHltbDetail: vi.fn(),
  hoursToMinutes: vi.fn(),
  computeAllStylesMinutes: vi.fn(),
}))
vi.mock("@/lib/db/client", () => ({ getDb: () => ({ insert: insertMock }) }))
vi.mock("@/lib/db/schema", () => ({ howlongtobeatEntries: { appid: "appid" } }))

import { enrichSingleHowLongToBeatGame } from "@/lib/enrichment/howlongtobeat"

describe("enrichSingleHowLongToBeatGame", () => {
  beforeEach(() => {
    searchMock.mockReset()
    insertMock.mockReset()
    insertMock.mockReturnValue({
      values: () => ({ onConflictDoUpdate: async () => undefined }),
    })
  })

  it.each([
    ["5xx", new Error("HLTB HTTP 503")],
    ["network", new TypeError("fetch failed")],
  ])("does not negative-cache a %s error", async (_label, error) => {
    searchMock.mockRejectedValue(error)
    const result = await enrichSingleHowLongToBeatGame(1, "Portal", { applyDelay: false })
    expect(result).toEqual({ checked: 1, updated: 0, failed: 1, skippedLowConfidence: 0 })
    expect(insertMock).not.toHaveBeenCalled()
  })

  it("negative-caches a clean search with no results", async () => {
    searchMock.mockResolvedValue([])
    await enrichSingleHowLongToBeatGame(1, "Portal", { applyDelay: false })
    expect(insertMock).toHaveBeenCalledTimes(1)
  })
})
