import { describe, expect, it } from "vitest"
import { resolveGameIconUrl } from "@/lib/utils/game-icon-url"

describe("resolveGameIconUrl", () => {
  it("prefers library icon over store header", () => {
    expect(
      resolveGameIconUrl({
        iconUrl: "https://media.steampowered.com/icon.jpg",
        logoUrl: "https://shared.akamai.steamstatic.com/header.jpg",
      })
    ).toBe("https://media.steampowered.com/icon.jpg")
  })

  it("falls back to logo_url then header_image", () => {
    expect(
      resolveGameIconUrl({
        logoUrl: "https://shared.akamai.steamstatic.com/header.jpg",
        headerImage: "https://cdn.akamai.steamstatic.com/other.jpg",
      })
    ).toBe("https://shared.akamai.steamstatic.com/header.jpg")

    expect(
      resolveGameIconUrl({
        headerImage: "https://cdn.akamai.steamstatic.com/header.jpg",
      })
    ).toBe("https://cdn.akamai.steamstatic.com/header.jpg")
  })
})
