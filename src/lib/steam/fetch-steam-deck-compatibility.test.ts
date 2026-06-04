import { describe, expect, it } from "vitest"
import { mapDeckResolvedCategory } from "@/lib/steam/fetch-steam-deck-compatibility"

describe("mapDeckResolvedCategory", () => {
  it("maps Steam API resolved_category values", () => {
    expect(mapDeckResolvedCategory(3)).toBe("verified")
    expect(mapDeckResolvedCategory(2)).toBe("playable")
    expect(mapDeckResolvedCategory(1)).toBe("unsupported")
    expect(mapDeckResolvedCategory(0)).toBe("unknown")
    expect(mapDeckResolvedCategory(undefined)).toBe("unknown")
  })
})
