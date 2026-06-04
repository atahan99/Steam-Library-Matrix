import { describe, expect, it } from "vitest"
import {
  detectSteamDeckCompatibility,
  resolveSteamDeckCompatibility,
} from "@/lib/utils/detect-steam-deck"

describe("detectSteamDeckCompatibility", () => {
  it("returns unknown for empty categories", () => {
    expect(detectSteamDeckCompatibility([])).toBe("unknown")
    expect(detectSteamDeckCompatibility(null)).toBe("unknown")
  })

  it("detects verified before playable", () => {
    const categories = [
      { id: 1, description: "Steam Deck Playable" },
      { id: 2, description: "Steam Deck Verified" },
    ]
    expect(detectSteamDeckCompatibility(categories)).toBe("verified")
  })

  it("detects playable", () => {
    const categories = [{ description: "Steam Deck Playable" }]
    expect(detectSteamDeckCompatibility(categories)).toBe("playable")
  })
})

describe("resolveSteamDeckCompatibility", () => {
  const verifiedCategories = [
    { description: "Steam Deck Verified" },
  ]

  it("uses authoritative stored values", () => {
    expect(
      resolveSteamDeckCompatibility("verified", verifiedCategories)
    ).toBe("verified")
    expect(resolveSteamDeckCompatibility("playable", null)).toBe("playable")
    expect(resolveSteamDeckCompatibility("unsupported", null)).toBe(
      "unsupported"
    )
  })

  it("falls back to categories when stored is unknown", () => {
    expect(
      resolveSteamDeckCompatibility("unknown", verifiedCategories)
    ).toBe("verified")
    expect(resolveSteamDeckCompatibility(null, verifiedCategories)).toBe(
      "verified"
    )
  })

  it("returns unknown when stored and categories lack deck data", () => {
    expect(resolveSteamDeckCompatibility("unknown", [])).toBe("unknown")
    expect(resolveSteamDeckCompatibility(null, null)).toBe("unknown")
  })
})
