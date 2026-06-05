import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/steam/steam-api", () => ({
  getAllSteamAppNames: vi.fn(),
}))

import { getAllSteamAppNames } from "@/lib/steam/steam-api"
import {
  dedupeWishlistItems,
  resolveWishlistItemsFromStore,
} from "@/lib/steam/resolve-wishlist-metadata"

const mockedGetAllSteamAppNames = vi.mocked(getAllSteamAppNames)

describe("resolveWishlistItemsFromStore", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("resolves placeholder names from GetAppList without storefront calls", async () => {
    const appid = 2999990
    mockedGetAllSteamAppNames.mockResolvedValue(
      new Map([[appid, "Half-Life 3"]])
    )

    const result = await resolveWishlistItemsFromStore([
      { appid, name: `App ${appid}`, addedAt: null },
    ])

    expect(mockedGetAllSteamAppNames).toHaveBeenCalledTimes(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe("Half-Life 3")
    expect(result.upsertMeta[0]?.name).toBe("Half-Life 3")
  })

  it("dedupes duplicate appids and keeps the first entry", async () => {
    mockedGetAllSteamAppNames.mockResolvedValue(new Map())

    const result = await resolveWishlistItemsFromStore([
      { appid: 570, name: "Dota 2", addedAt: 100 },
      { appid: 570, name: "Duplicate", addedAt: 200 },
      { appid: 730, name: "Counter-Strike 2", addedAt: null },
    ])

    expect(result.items.map((item) => item.appid)).toEqual([570, 730])
    expect(result.items[0]?.addedAt).toBe(100)
    expect(mockedGetAllSteamAppNames).not.toHaveBeenCalled()
  })

  it("keeps API-provided names without calling GetAppList", async () => {
    const result = await resolveWishlistItemsFromStore([
      { appid: 570, name: "Dota 2", addedAt: null },
    ])

    expect(mockedGetAllSteamAppNames).not.toHaveBeenCalled()
    expect(result.items[0]?.name).toBe("Dota 2")
  })
})

describe("dedupeWishlistItems", () => {
  it("returns the first occurrence for duplicate appids", () => {
    expect(
      dedupeWishlistItems([
        { appid: 1, name: "First", addedAt: 1 },
        { appid: 1, name: "Second", addedAt: 2 },
      ])
    ).toEqual([{ appid: 1, name: "First", addedAt: 1 }])
  })
})
