import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/steam/refresh-steam-deck-compatibility", () => ({
  getAppidsNeedingDeckRefresh: vi.fn(),
}))

vi.mock("@/lib/steam/steam-store", () => ({
  fetchSteamAppDetails: vi.fn(),
}))

vi.mock("@/lib/steam/fetch-steam-deck-compatibility", () => ({
  fetchSteamDeckCompatibility: vi.fn(),
}))

vi.mock("@/lib/db/steam-app-details", () => ({
  upsertSteamAppDetailsRow: vi.fn(),
}))

import { upsertSteamAppDetailsRow } from "@/lib/db/steam-app-details"
import { fetchSteamDeckCompatibility } from "@/lib/steam/fetch-steam-deck-compatibility"
import { getAppidsNeedingDeckRefresh } from "@/lib/steam/refresh-steam-deck-compatibility"
import { resolveWishlistItemsFromStore } from "@/lib/steam/resolve-wishlist-metadata"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"

const mockedGetAppidsNeedingDeckRefresh = vi.mocked(getAppidsNeedingDeckRefresh)
const mockedFetchSteamAppDetails = vi.mocked(fetchSteamAppDetails)
const mockedFetchSteamDeckCompatibility = vi.mocked(fetchSteamDeckCompatibility)
const mockedUpsertSteamAppDetailsRow = vi.mocked(upsertSteamAppDetailsRow)

describe("resolveWishlistItemsFromStore", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("fetches store metadata without writing to the database", async () => {
    const appid = 2999990
    mockedGetAppidsNeedingDeckRefresh.mockResolvedValue(new Set())
    mockedFetchSteamAppDetails.mockResolvedValue({
      appid,
      name: "Half-Life 3",
      headerImage: "https://cdn.example/hl3.jpg",
      type: "game",
    })
    mockedFetchSteamDeckCompatibility.mockResolvedValue("verified")

    const result = await resolveWishlistItemsFromStore([
      { appid, name: `App ${appid}`, addedAt: null },
    ])

    expect(mockedUpsertSteamAppDetailsRow).not.toHaveBeenCalled()
    expect(result.items[0]?.name).toBe("Half-Life 3")
    expect(result.appDetailsToPersist).toHaveLength(1)
    expect(result.appDetailsToPersist[0]?.name).toBe("Half-Life 3")
    expect(result.appDetailsToPersist[0]?.steamDeckCompatibility).toBe(
      "verified"
    )
    expect(result.deckOnlyToPersist).toEqual([])
  })

  it("returns deck-only payloads without database writes", async () => {
    const appid = 570
    mockedGetAppidsNeedingDeckRefresh.mockResolvedValue(new Set([appid]))
    mockedFetchSteamDeckCompatibility.mockResolvedValue("playable")

    const result = await resolveWishlistItemsFromStore([
      { appid, name: "Dota 2", addedAt: null },
    ])

    expect(mockedUpsertSteamAppDetailsRow).not.toHaveBeenCalled()
    expect(mockedFetchSteamAppDetails).not.toHaveBeenCalled()
    expect(result.appDetailsToPersist).toEqual([])
    expect(result.deckOnlyToPersist).toEqual([
      { appid, compatibility: "playable" },
    ])
  })
})
