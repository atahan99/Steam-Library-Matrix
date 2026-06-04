import { describe, expect, it } from "vitest"
import {
  getSteamStoreHeaderImageUrl,
  resolveGameHeroImageUrl,
} from "@/lib/utils/steam-image-url"

describe("steam-image-url", () => {
  it("builds store header URL from appid", () => {
    expect(getSteamStoreHeaderImageUrl(4770)).toBe(
      "https://cdn.akamai.steamstatic.com/steam/apps/4770/header.jpg"
    )
  })

  it("ignores low-res community logo URLs", () => {
    expect(
      resolveGameHeroImageUrl(4770, {
        logoUrl:
          "https://media.steampowered.com/steamcommunity/public/images/apps/4770/609a824446a556878febbc3aa0be7d1f9b92a4fb.jpg",
      })
    ).toBe("https://cdn.akamai.steamstatic.com/steam/apps/4770/header.jpg")
  })

  it("keeps enriched store header when already present", () => {
    const enriched =
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4770/609a824446a556878febbc3aa0be7d1f9b92a4fb.jpg"
    expect(resolveGameHeroImageUrl(4770, { logoUrl: enriched })).toBe(enriched)
  })
})
