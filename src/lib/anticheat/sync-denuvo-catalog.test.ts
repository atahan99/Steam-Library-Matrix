import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/denuvo-catalog", () => ({
  getDenuvoCatalogStats: vi.fn(),
  isDenuvoCatalogStale: vi.fn(),
  replaceDenuvoAntiTamperCatalog: vi.fn(),
}))

vi.mock("@/lib/db/refresh-log", () => ({
  startRefreshLog: vi.fn().mockResolvedValue("log-1"),
  finishRefreshLog: vi.fn(),
}))

vi.mock("@/lib/steam/scrape-denuvo-curator", () => ({
  scrapeDenuvoCuratorCatalog: vi.fn(),
}))

import {
  getDenuvoCatalogStats,
  isDenuvoCatalogStale,
  replaceDenuvoAntiTamperCatalog,
} from "@/lib/db/denuvo-catalog"
import { scrapeDenuvoCuratorCatalog } from "@/lib/steam/scrape-denuvo-curator"
import {
  isDenuvoCatalogSyncNeeded,
  syncDenuvoCatalogOnly,
} from "@/lib/anticheat/sync-denuvo-catalog"

const mockedStats = vi.mocked(getDenuvoCatalogStats)
const mockedStale = vi.mocked(isDenuvoCatalogStale)
const mockedScrape = vi.mocked(scrapeDenuvoCuratorCatalog)
const mockedReplace = vi.mocked(replaceDenuvoAntiTamperCatalog)

describe("isDenuvoCatalogSyncNeeded", () => {
  afterEach(() => vi.clearAllMocks())

  it("returns true when catalog is incomplete", async () => {
    mockedStats.mockResolvedValue({
      count: 50,
      complete: false,
      lastSyncedAt: "2026-01-01",
    })
    mockedStale.mockReturnValue(false)
    expect(await isDenuvoCatalogSyncNeeded(false)).toBe(true)
  })

  it("returns false when catalog is complete and fresh", async () => {
    mockedStats.mockResolvedValue({
      count: 376,
      complete: true,
      lastSyncedAt: "2026-01-01",
    })
    mockedStale.mockReturnValue(false)
    expect(await isDenuvoCatalogSyncNeeded(false)).toBe(false)
  })
})

describe("syncDenuvoCatalogOnly", () => {
  afterEach(() => vi.clearAllMocks())

  it("skips when complete and not stale", async () => {
    mockedStats.mockResolvedValue({
      count: 376,
      complete: true,
      lastSyncedAt: "2026-01-01",
    })
    mockedStale.mockReturnValue(false)

    const result = await syncDenuvoCatalogOnly("00000000000000000")
    expect(result.skipped).toBe(true)
    expect(mockedScrape).not.toHaveBeenCalled()
  })
})
