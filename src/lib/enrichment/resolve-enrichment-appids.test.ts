import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ACHIEVEMENTS_TTL_HOURS,
  ANTICHEAT_TTL_HOURS,
  APP_DETAILS_TTL_HOURS,
  ENRICHMENT_TTL_HOURS_168,
  HLTB_TTL_HOURS,
  PROTONDB_TTL_HOURS,
  resolveAppidsForSource,
} from "@/lib/enrichment/resolve-enrichment-appids"

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}))

vi.mock("@/lib/db/profile-appids", () => ({
  getProfileAppids: vi.fn(),
  getProfileGamesForEnrichment: vi.fn(),
}))

import { getDb } from "@/lib/db/client"
import {
  getProfileAppids,
  getProfileGamesForEnrichment,
} from "@/lib/db/profile-appids"

const mockedGetDb = vi.mocked(getDb)
const mockedGetProfileAppids = vi.mocked(getProfileAppids)
const mockedGetProfileGamesForEnrichment = vi.mocked(
  getProfileGamesForEnrichment
)

const makeSelectChain = (rows: unknown[]) => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  }
  return chain
}

describe("enrichment TTL constants", () => {
  it("exports 168h TTL for app details, proton, achievements, and anticheat", () => {
    expect(ENRICHMENT_TTL_HOURS_168).toBe(168)
    expect(APP_DETAILS_TTL_HOURS).toBe(ENRICHMENT_TTL_HOURS_168)
    expect(PROTONDB_TTL_HOURS).toBe(ENRICHMENT_TTL_HOURS_168)
    expect(ACHIEVEMENTS_TTL_HOURS).toBe(ENRICHMENT_TTL_HOURS_168)
    expect(ANTICHEAT_TTL_HOURS).toBe(ENRICHMENT_TTL_HOURS_168)
  })

  it("exports 720h TTL for hltb", () => {
    expect(HLTB_TTL_HOURS).toBe(720)
  })
})

describe("resolveAppidsForSource", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("uses scopeAppids as the authoritative appid list for protondb", async () => {
    const select = vi.fn().mockReturnValue(makeSelectChain([]))
    mockedGetDb.mockReturnValue({ select } as never)

    const appids = await resolveAppidsForSource("protondb", {
      scopeAppids: [10, 20, 10],
      force: true,
    })

    expect(appids).toEqual([10, 20])
    expect(mockedGetProfileAppids).not.toHaveBeenCalled()
  })

  it("filters stale app_details rows but keeps unknown deck compatibility", async () => {
    const staleCheckedAt = new Date(Date.now() - 200 * 60 * 60 * 1000)
    const select = vi.fn().mockReturnValue(
      makeSelectChain([
        {
          appid: 1,
          lastCheckedAt: staleCheckedAt,
          steamDeckCompatibility: "playable",
        },
        {
          appid: 2,
          lastCheckedAt: new Date(),
          steamDeckCompatibility: "unknown",
        },
        {
          appid: 3,
          lastCheckedAt: new Date(),
          steamDeckCompatibility: "verified",
          platforms: { windows: true },
        },
      ])
    )
    mockedGetDb.mockReturnValue({ select } as never)
    mockedGetProfileGamesForEnrichment.mockResolvedValue([
      { appid: 1, name: "One" },
      { appid: 2, name: "Two" },
      { appid: 3, name: "Three" },
      { appid: 4, name: "Four" },
    ])

    const appids = await resolveAppidsForSource("app_details", {
      steamid: "76561198000000001",
      force: false,
    })

    expect(appids).toEqual([2, 1, 4])
  })

  it("returns hltb rows with missingOnly and TTL filtering", async () => {
    const freshCheckedAt = new Date()
    const select = vi
      .fn()
      .mockReturnValueOnce(
        makeSelectChain([
          { appid: 100, mainStoryMinutes: 60 },
          { appid: 200, mainStoryMinutes: null },
        ])
      )
      .mockReturnValueOnce(
        makeSelectChain([{ appid: 200, lastCheckedAt: freshCheckedAt }])
      )

    mockedGetDb.mockReturnValue({ select } as never)
    mockedGetProfileGamesForEnrichment.mockResolvedValue([
      { appid: 100, name: "Has Data" },
      { appid: 200, name: "Stale Row" },
      { appid: 300, name: "Missing" },
    ])

    const rows = await resolveAppidsForSource("hltb", {
      steamid: "76561198000000001",
      force: false,
      missingOnly: true,
    })

    expect(rows).toEqual([{ appid: 300, name: "Missing" }])
  })
})
