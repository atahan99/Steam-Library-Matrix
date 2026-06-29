import { describe, expect, it } from "vitest"
import { parseSteamInput, validateSteamProfileInput } from "@/lib/steam/parse-steam-input"

const STEAM64 = "76561198056043071"

describe("validateSteamProfileInput", () => {
  it("accepts a bare Steam64 ID", () => {
    expect(validateSteamProfileInput(STEAM64)).toEqual({
      ok: true,
      parsed: { type: "steamid", value: STEAM64 },
    })
  })

  it("accepts a vanity name", () => {
    expect(validateSteamProfileInput("atahan99")).toEqual({
      ok: true,
      parsed: { type: "vanity", value: "atahan99" },
    })
  })

  it("accepts a profiles URL", () => {
    expect(
      validateSteamProfileInput(`https://steamcommunity.com/profiles/${STEAM64}`)
    ).toEqual({
      ok: true,
      parsed: { type: "steamid", value: STEAM64 },
    })
  })

  it("accepts an id URL with optional trailing slash", () => {
    expect(
      validateSteamProfileInput("https://steamcommunity.com/id/example/")
    ).toEqual({
      ok: true,
      parsed: { type: "vanity", value: "example" },
    })
  })

  it("rejects trailing double slashes in the path", () => {
    expect(
      validateSteamProfileInput("https://steamcommunity.com/id/example//")
    ).toMatchObject({ ok: false })
  })

  it("rejects non-Steam hosts", () => {
    expect(
      validateSteamProfileInput(`https://evil.com/profiles/${STEAM64}`)
    ).toMatchObject({ ok: false })
  })

  it("rejects extra path segments", () => {
    expect(
      validateSteamProfileInput(
        `https://steamcommunity.com/profiles/${STEAM64}/games`
      )
    ).toMatchObject({ ok: false })
  })

  it("rejects query strings and hashes", () => {
    expect(
      validateSteamProfileInput(
        `https://steamcommunity.com/profiles/${STEAM64}?tab=all`
      )
    ).toMatchObject({ ok: false })
  })

  it("rejects javascript: URLs", () => {
    expect(
      validateSteamProfileInput("javascript:alert(1)")
    ).toMatchObject({ ok: false })
  })

  it("rejects markup in input", () => {
    expect(
      validateSteamProfileInput('<script>alert("x")</script>')
    ).toMatchObject({ ok: false })
  })

  it("rejects malformed http URLs that mention steamcommunity", () => {
    expect(
      validateSteamProfileInput("https://steamcommunity.com/not-a-profile")
    ).toMatchObject({ ok: false })
  })

  it("rejects vanity names that are too short", () => {
    expect(validateSteamProfileInput("ab")).toMatchObject({ ok: false })
  })

  it("accepts steamcommunity URLs without a scheme", () => {
    expect(
      validateSteamProfileInput(`steamcommunity.com/profiles/${STEAM64}`)
    ).toEqual({
      ok: true,
      parsed: { type: "steamid", value: STEAM64 },
    })
  })

  it("rejects partial numeric IDs", () => {
    expect(validateSteamProfileInput("7656119805604307")).toMatchObject({
      ok: false,
    })
  })
})

describe("parseSteamInput", () => {
  it("throws with a readable message for invalid URLs", () => {
    expect(() =>
      parseSteamInput("https://steamcommunity.com/id/example//")
    ).toThrow(/valid Steam profile URL/i)
  })
})
