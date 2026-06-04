import { describe, expect, it } from "vitest"
import {
  extractWishlistRawItems,
  type SteamWishlistApiPayload,
} from "@/lib/steam/steam-api"
import {
  mapWishlistRawToItems,
  normalizeWishlistFromApi,
  parseWishlistPayload,
} from "@/lib/steam/fetch-wishlist"

describe("extractWishlistRawItems", () => {
  it("reads response.items with appid and date_added", () => {
    const data: SteamWishlistApiPayload = {
      response: {
        items: [
          { appid: 570, date_added: 1_700_000_000, priority: 0 },
          { appid: 730, name: "Counter-Strike 2" },
        ],
      },
    }
    const raw = extractWishlistRawItems(data)
    expect(raw).toHaveLength(2)
    expect(raw[0]).toEqual({
      appid: 570,
      addedAt: 1_700_000_000,
      priority: 0,
    })
    expect(raw[1]).toEqual({ appid: 730, name: "Counter-Strike 2" })
  })

  it("falls back to response.apps and response.wishlist", () => {
    expect(
      extractWishlistRawItems({
        response: { apps: [{ app_id: 440 }] },
      })
    ).toEqual([{ appid: 440 }])

    expect(
      extractWishlistRawItems({
        response: { wishlist: [{ appid: 220 }] },
      })
    ).toEqual([{ appid: 220 }])
  })

  it("skips invalid app ids", () => {
    const raw = extractWishlistRawItems({
      response: {
        items: [{ appid: 0 }, { appid: NaN }, { appid: 10 }],
      },
    })
    expect(raw).toEqual([{ appid: 10 }])
  })
})

describe("normalizeWishlistFromApi", () => {
  it("uses App {appid} when name is missing", () => {
    const items = normalizeWishlistFromApi({
      response: { items: [{ appid: 12345 }] },
    })
    expect(items).toEqual([{ appid: 12345, name: "App 12345" }])
  })

  it("preserves name and addedAt", () => {
    const items = normalizeWishlistFromApi({
      response: {
        items: [{ appid: 10, name: "  Portal  ", date_added: 100 }],
      },
    })
    expect(items).toEqual([
      { appid: 10, name: "Portal", addedAt: 100 },
    ])
  })
})

describe("mapWishlistRawToItems", () => {
  it("maps raw items with name fallback", () => {
    expect(
      mapWishlistRawToItems([
        { appid: 1 },
        { appid: 2, name: "Half-Life", addedAt: 50 },
      ])
    ).toEqual([
      { appid: 1, name: "App 1" },
      { appid: 2, name: "Half-Life", addedAt: 50 },
    ])
  })
})

describe("parseWishlistPayload", () => {
  it("parses legacy object-map wishlistdata", () => {
    const items = parseWishlistPayload({
      "0": { appid: "570", name: "Dota 2", date_added: 99 },
      "1": { appid: 999, name: "" },
    })
    expect(items).toEqual([
      { appid: 570, name: "Dota 2", addedAt: 99 },
    ])
  })

  it("returns empty for null or arrays", () => {
    expect(parseWishlistPayload(null)).toEqual([])
    expect(parseWishlistPayload([])).toEqual([])
  })
})
