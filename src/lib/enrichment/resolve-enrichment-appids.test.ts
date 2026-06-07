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

  it("re-queues stale and never-checked app_details but keeps fresh rows regardless of Deck status", async () => {
    const staleCheckedAt = new Date(Date.now() - 200 * 60 * 60 * 1000)
    const select = vi.fn().mockReturnValue(
      makeSelectChain([
        {
          appid: 1,
          lastCheckedAt: staleCheckedAt,
          steamDeckCompatibility: "playable",
        },
        {
          // Fresh but Deck "unknown" — a real answer, not a gap; must not re-queue.
          appid: 2,
          lastCheckedAt: new Date(),
          steamDeckCompatibility: "unknown",
        },
        {
          appid: 3,
          lastCheckedAt: new Date(),
          steamDeckCompatibility: "verified",
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

    // Only the stale row (1) and the never-checked row (4) need work; the fresh
    // rows (2 unknown-Deck, 3 verified) are done. Sort keeps known-Deck before
    // the missing row.
    expect(appids).toEqual([1, 4])
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

  it("missingOnly excludes HLTB confirmed-absent negative cache rows", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(
        makeSelectChain([
          {
            appid: 100,
            mainStoryMinutes: null,
            matchedName: "[failed: no results]",
          },
          { appid: 200, mainStoryMinutes: null, matchedName: "[failed: timeout]" },
        ])
      )
      .mockReturnValueOnce(makeSelectChain([]))

    mockedGetDb.mockReturnValue({ select } as never)
    mockedGetProfileGamesForEnrichment.mockResolvedValue([
      { appid: 100, name: "Absent" },
      { appid: 200, name: "Retryable" },
    ])

    const rows = await resolveAppidsForSource("hltb", {
      steamid: "76561198000000001",
      force: false,
      missingOnly: true,
    })

    expect(rows).toEqual([{ appid: 200, name: "Retryable" }])
  })

  it("caches protondb checked recently regardless of tier, but re-queues stale rows", async () => {
    const stale = new Date(Date.now() - 200 * 60 * 60 * 1000) // older than the 168h TTL
    const select = vi.fn().mockReturnValue(
      makeSelectChain([
        { appid: 1, lastCheckedAt: new Date() }, // fresh, unknown tier → cached
        { appid: 2, lastCheckedAt: new Date() }, // fresh, gold → cached
        { appid: 3, lastCheckedAt: stale }, // stale → re-queue
      ])
    )
    mockedGetDb.mockReturnValue({ select } as never)
    mockedGetProfileAppids.mockResolvedValue([1, 2, 3])

    const appids = await resolveAppidsForSource("protondb", {
      steamid: "76561198000000001",
      force: false,
    })

    expect(appids).toEqual([3])
  })
})
