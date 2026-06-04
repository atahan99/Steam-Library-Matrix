import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/anticheat-catalog", () => ({
  getAnticheatCatalogStats: vi.fn(),
  isAnticheatCatalogStale: vi.fn(),
}))

vi.mock("@/lib/anticheat/sync-denuvo-catalog", () => ({
  isDenuvoCatalogSyncNeeded: vi.fn(),
}))

vi.mock("@/lib/db/profile-appids", () => ({
  getUnionProfileAppids: vi.fn(),
}))

vi.mock("@/lib/jobs/enqueue", () => ({
  enqueueEnrichmentJob: vi.fn(),
}))

import {
  getAnticheatCatalogStats,
  isAnticheatCatalogStale,
} from "@/lib/db/anticheat-catalog"
import { isDenuvoCatalogSyncNeeded } from "@/lib/anticheat/sync-denuvo-catalog"
import { getUnionProfileAppids } from "@/lib/db/profile-appids"
import { enqueueEnrichmentJob } from "@/lib/jobs/enqueue"
import {
  enqueueProfileWarmup,
  isAnticheatCatalogSyncNeeded,
  PROFILE_WARMUP_KINDS,
} from "@/lib/enrichment/enqueue-profile-warmup"

const mockedUnion = vi.mocked(getUnionProfileAppids)
const mockedEnqueue = vi.mocked(enqueueEnrichmentJob)
const mockedAwacyStats = vi.mocked(getAnticheatCatalogStats)
const mockedAwacyStale = vi.mocked(isAnticheatCatalogStale)
const mockedDenuvoNeeded = vi.mocked(isDenuvoCatalogSyncNeeded)

const owner = "76561198000000001"
const compare = "76561198000000002"

const freshCatalogStats = () => {
  mockedAwacyStats.mockResolvedValue({
    awacy: { source: "awacy", rowCount: 10, complete: true, lastSyncedAt: "2020-01-01" },
    levvvel: {
      source: "levvvel",
      rowCount: 10,
      complete: true,
      lastSyncedAt: "2020-01-01",
    },
  })
  mockedAwacyStale.mockReturnValue(false)
  mockedDenuvoNeeded.mockResolvedValue(false)
}

describe("isAnticheatCatalogSyncNeeded", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns true when force is true", async () => {
    expect(await isAnticheatCatalogSyncNeeded(true)).toBe(true)
    expect(mockedAwacyStats).not.toHaveBeenCalled()
  })

  it("returns false when all catalogs are fresh", async () => {
    freshCatalogStats()
    expect(await isAnticheatCatalogSyncNeeded(false)).toBe(false)
  })

  it("returns true when awacy catalog is stale", async () => {
    freshCatalogStats()
    mockedAwacyStale.mockImplementation((lastSyncedAt) =>
      lastSyncedAt === "2020-01-01" ? true : false
    )
    expect(await isAnticheatCatalogSyncNeeded(false)).toBe(true)
  })
})

describe("enqueueProfileWarmup", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("enqueues scoped jobs per kind with union appids", async () => {
    freshCatalogStats()
    mockedUnion.mockResolvedValue([100, 200])
    mockedEnqueue.mockResolvedValue({ id: "job-1", status: "created" })

    const jobs = await enqueueProfileWarmup({
      ownerSteamid: owner,
      targetSteamids: [compare],
      force: false,
      missingOnly: true,
    })

    expect(mockedUnion).toHaveBeenCalledWith([owner, compare])
    expect(mockedEnqueue).toHaveBeenCalledTimes(PROFILE_WARMUP_KINDS.length)
    expect(jobs).toHaveLength(PROFILE_WARMUP_KINDS.length)

    for (const kind of PROFILE_WARMUP_KINDS) {
      expect(mockedEnqueue).toHaveBeenCalledWith({
        steamid: owner,
        kind,
        payload: {
          force: false,
          missingOnly: true,
          scopeAppids: [100, 200],
        },
      })
    }
  })

  it("enqueues anticheat_catalog without scope when catalogs are stale", async () => {
    mockedAwacyStats.mockResolvedValue({
      awacy: { source: "awacy", rowCount: 0, complete: false },
      levvvel: { source: "levvvel", rowCount: 0, complete: false },
    })
    mockedDenuvoNeeded.mockResolvedValue(true)
    mockedUnion.mockResolvedValue([42])
    mockedEnqueue.mockResolvedValue({ id: "catalog-job", status: "created" })

    const jobs = await enqueueProfileWarmup({
      ownerSteamid: owner,
      targetSteamids: [],
      kinds: ["app_details"],
    })

    expect(mockedEnqueue).toHaveBeenCalledWith({
      steamid: owner,
      kind: "anticheat_catalog",
      payload: { force: false },
    })
    expect(mockedEnqueue).toHaveBeenCalledWith({
      steamid: owner,
      kind: "denuvo_catalog",
      payload: { force: false },
    })
    expect(jobs[0]).toEqual({
      kind: "anticheat_catalog",
      id: "catalog-job",
      status: "created",
    })
  })

  it("skips anticheat_catalog when catalogs are fresh and force is false", async () => {
    freshCatalogStats()
    mockedUnion.mockResolvedValue([])
    mockedEnqueue.mockResolvedValue({ id: "job-x", status: "existing" })

    await enqueueProfileWarmup({
      ownerSteamid: owner,
      targetSteamids: [],
      kinds: ["protondb"],
    })

    expect(mockedEnqueue).toHaveBeenCalledTimes(1)
    expect(mockedEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "protondb" })
    )
  })

  it("respects enqueue dedup by returning existing status", async () => {
    freshCatalogStats()
    mockedUnion.mockResolvedValue([1])
    mockedEnqueue.mockResolvedValue({ id: "existing-job", status: "existing" })

    const jobs = await enqueueProfileWarmup({
      ownerSteamid: owner,
      targetSteamids: [],
      kinds: ["app_details"],
    })

    expect(jobs).toEqual([
      { kind: "app_details", id: "existing-job", status: "existing" },
    ])
  })
})
