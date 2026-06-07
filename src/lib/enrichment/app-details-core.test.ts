import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/steam/steam-store", () => ({
  fetchSteamAppDetailsOutcome: vi.fn(),
}))

vi.mock("@/lib/steam/fetch-steam-deck-compatibility", () => ({
  fetchSteamDeckCompatibility: vi.fn(),
}))

vi.mock("@/lib/steam/steam-app-list", () => ({
  getSteamAppName: vi.fn(),
}))

vi.mock("@/lib/db/steam-app-details", () => ({
  upsertSteamAppDetailsRow: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}))

import { getDb } from "@/lib/db/client"
import { upsertSteamAppDetailsRow } from "@/lib/db/steam-app-details"
import { enrichSingleAppDetails } from "@/lib/enrichment/app-details-core"
import { fetchSteamDeckCompatibility } from "@/lib/steam/fetch-steam-deck-compatibility"
import { getSteamAppName } from "@/lib/steam/steam-app-list"
import { fetchSteamAppDetailsOutcome } from "@/lib/steam/steam-store"

const mockedGetDb = vi.mocked(getDb)
const mockedFetchSteamAppDetailsOutcome = vi.mocked(fetchSteamAppDetailsOutcome)
const mockedFetchSteamDeckCompatibility = vi.mocked(fetchSteamDeckCompatibility)
const mockedGetSteamAppName = vi.mocked(getSteamAppName)
const mockedUpsertSteamAppDetailsRow = vi.mocked(upsertSteamAppDetailsRow)

const APPID = 2999990

const makeSelectChain = (rows: unknown[]) => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue(rows),
})

describe("enrichSingleAppDetails", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("backfills name without writing a row when the store is transiently unavailable", async () => {
    const updateSet = vi.fn().mockReturnThis()
    const updateWhere = vi.fn().mockResolvedValue(undefined)

    mockedGetDb.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue(
          makeSelectChain([{ name: `App ${APPID}` }])
        ),
      update: vi.fn().mockReturnValue({
        set: updateSet.mockReturnValue({
          where: updateWhere,
        }),
      }),
    } as never)

    mockedFetchSteamAppDetailsOutcome.mockResolvedValue({ kind: "unavailable" })
    mockedGetSteamAppName.mockResolvedValue("Half-Life 3")

    const result = await enrichSingleAppDetails(APPID, true, { skipDeck: true })

    expect(result).toEqual({ checked: 1, updated: 1, failed: 0, skipped: 0 })
    expect(mockedGetSteamAppName).toHaveBeenCalledWith(APPID)
    // Transient failures must not persist a row — leave it to retry later.
    expect(mockedUpsertSteamAppDetailsRow).not.toHaveBeenCalled()
    expect(mockedFetchSteamDeckCompatibility).not.toHaveBeenCalled()
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Half-Life 3" })
    )
  })

  it("writes a checked sentinel and backfills name when the store reports not-found", async () => {
    const updateSet = vi.fn().mockReturnThis()
    const updateWhere = vi.fn().mockResolvedValue(undefined)

    mockedGetDb.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue(makeSelectChain([{ name: `App ${APPID}` }])),
      update: vi.fn().mockReturnValue({
        set: updateSet.mockReturnValue({
          where: updateWhere,
        }),
      }),
    } as never)

    mockedFetchSteamAppDetailsOutcome.mockResolvedValue({ kind: "not-found" })
    mockedGetSteamAppName.mockResolvedValue("Delisted Game")

    const result = await enrichSingleAppDetails(APPID, true, { skipDeck: true })

    // not-found is terminal: record a sentinel so it stops being re-fetched and
    // stops counting as a perpetual failure.
    expect(result).toEqual({ checked: 1, updated: 1, failed: 0, skipped: 0 })
    expect(mockedUpsertSteamAppDetailsRow).toHaveBeenCalledWith({ appid: APPID })
    expect(mockedFetchSteamDeckCompatibility).not.toHaveBeenCalled()
  })

  it("uses GetAppList when storefront details have no name", async () => {
    const updateSet = vi.fn().mockReturnThis()
    const updateWhere = vi.fn().mockResolvedValue(undefined)

    mockedGetDb.mockReturnValue({
      select: vi.fn().mockReturnValue(
        makeSelectChain([
          { name: `App ${APPID}`, iconUrl: null, logoUrl: null },
        ])
      ),
      update: vi.fn().mockReturnValue({
        set: updateSet.mockReturnValue({
          where: updateWhere,
        }),
      }),
    } as never)

    mockedFetchSteamAppDetailsOutcome.mockResolvedValue({
      kind: "ok",
      details: { appid: APPID, type: "game" },
    })
    mockedFetchSteamDeckCompatibility.mockResolvedValue("unknown")
    mockedGetSteamAppName.mockResolvedValue("Half-Life 3")

    const result = await enrichSingleAppDetails(APPID, true)

    expect(result).toEqual({ checked: 1, updated: 1, failed: 0, skipped: 0 })
    expect(mockedGetSteamAppName).toHaveBeenCalledWith(APPID)
    expect(mockedUpsertSteamAppDetailsRow).toHaveBeenCalled()
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Half-Life 3" })
    )
  })
})
