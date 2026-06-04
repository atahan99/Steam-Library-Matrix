import { describe, expect, it } from "vitest"
import {
  hasStoredSteamPlatforms,
  parseSteamPlatforms,
} from "@/lib/steam/parse-steam-platforms"

describe("parseSteamPlatforms", () => {
  it("normalizes Steam API booleans", () => {
    expect(
      parseSteamPlatforms({ windows: true, mac: false, linux: false })
    ).toEqual({
      windows: true,
      mac: false,
      linux: false,
    })
  })

  it("coerces string and numeric booleans from stored JSON", () => {
    expect(
      parseSteamPlatforms({ windows: "true", mac: "False", linux: 0 })
    ).toEqual({
      windows: true,
      mac: false,
      linux: false,
    })
  })

  it("returns undefined for empty or invalid payloads", () => {
    expect(parseSteamPlatforms(null)).toBeUndefined()
    expect(parseSteamPlatforms({})).toBeUndefined()
    expect(parseSteamPlatforms([])).toBeUndefined()
  })
})

describe("hasStoredSteamPlatforms", () => {
  it("is false for deck-only stub rows without platform flags", () => {
    expect(hasStoredSteamPlatforms(null)).toBe(false)
    expect(hasStoredSteamPlatforms(undefined)).toBe(false)
    expect(hasStoredSteamPlatforms({})).toBe(false)
  })

  it("is true when at least one platform flag is stored", () => {
    expect(hasStoredSteamPlatforms({ windows: true })).toBe(true)
    expect(hasStoredSteamPlatforms({ mac: false })).toBe(true)
  })
})
