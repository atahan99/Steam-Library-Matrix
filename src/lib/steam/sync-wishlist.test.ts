import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/steam/fetch-wishlist", () => ({
  fetchSteamWishlist: vi.fn(),
  PRIVATE_WISHLIST_MESSAGE: "Wishlist is private or unavailable.",
}))

vi.mock("@/lib/steam/steam-api", () => ({
  getAllSteamAppNames: vi.fn(),
}))

vi.mock("@/lib/db/profile-wishlist", () => ({
  syncProfileWishlist: vi.fn(),
  setWishlistSyncError: vi.fn(),
  getWishlistSchemaHint: vi.fn(),
}))

import { syncProfileWishlist } from "@/lib/db/profile-wishlist"
import { fetchSteamWishlist } from "@/lib/steam/fetch-wishlist"
import { getAllSteamAppNames } from "@/lib/steam/steam-api"
import {
  sanitizeWishlistSyncError,
  syncSteamWishlist,
} from "@/lib/steam/sync-wishlist"

const mockedFetchSteamWishlist = vi.mocked(fetchSteamWishlist)
const mockedGetAllSteamAppNames = vi.mocked(getAllSteamAppNames)
const mockedSyncProfileWishlist = vi.mocked(syncProfileWishlist)

describe("sanitizeWishlistSyncError", () => {
  it("drops stale Next.js request-scope errors", () => {
    expect(
      sanitizeWishlistSyncError(
        "`connection` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context"
      )
    ).toBeUndefined()
  })

  it("keeps real wishlist errors", () => {
    expect(
      sanitizeWishlistSyncError("Wishlist is private or unavailable.")
    ).toBe("Wishlist is private or unavailable.")
  })
})

describe("syncSteamWishlist", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("persists deduped wishlist items using GetAppList names only", async () => {
    const steamid = "76561198000000001"
    const placeholderAppid = 2999990

    mockedFetchSteamWishlist.mockResolvedValue([
      { appid: placeholderAppid, name: `App ${placeholderAppid}`, addedAt: null },
      { appid: placeholderAppid, name: "Duplicate", addedAt: null },
      { appid: 570, name: "Dota 2", addedAt: null },
    ])
    mockedGetAllSteamAppNames.mockResolvedValue(
      new Map([[placeholderAppid, "Half-Life 3"]])
    )
    mockedSyncProfileWishlist.mockResolvedValue(undefined)

    const result = await syncSteamWishlist(steamid)

    expect(result).toEqual({ count: 2 })
    expect(mockedGetAllSteamAppNames).toHaveBeenCalledTimes(1)
    expect(mockedSyncProfileWishlist).toHaveBeenCalledWith(
      steamid,
      [
        { appid: placeholderAppid, name: "Half-Life 3", addedAt: null },
        { appid: 570, name: "Dota 2", addedAt: null },
      ],
      [
        { appid: placeholderAppid, name: "Half-Life 3" },
        { appid: 570, name: "Dota 2" },
      ]
    )
  })
})
