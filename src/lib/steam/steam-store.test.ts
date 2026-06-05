import { describe, expect, it } from "vitest"
import { parseSteamAppDetailsResponse } from "@/lib/steam/parse-steam-appdetails-response"

describe("parseSteamAppDetailsResponse", () => {
  it("maps a valid Steam appdetails payload", () => {
    const result = parseSteamAppDetailsResponse(570, {
      "570": {
        success: true,
        data: {
          name: "Dota 2",
          type: "game",
          short_description: "Every day, millions play Dota 2.",
          header_image: "https://cdn.example/header.jpg",
          platforms: { windows: true, mac: true, linux: true },
          categories: [{ id: 1, description: "Multi-player" }],
          genres: [{ id: "1", description: "Action" }],
          release_date: { coming_soon: false, date: "9 Jul, 2013" },
        },
      },
    })

    expect(result).toMatchObject({
      appid: 570,
      name: "Dota 2",
      type: "game",
      platforms: { windows: true, mac: true, linux: true },
    })
  })

  it("accepts explicit null string fields from Steam", () => {
    const result = parseSteamAppDetailsResponse(1496790, {
      "1496790": {
        success: true,
        data: {
          name: "Test Game",
          type: null,
          short_description: null,
          header_image: null,
          website: null,
          developers: null,
          publishers: ["Publisher"],
          genres: [{ id: null, description: "Action" }],
          categories: [{ id: 1, description: null }],
        },
      },
    })

    expect(result).toMatchObject({
      appid: 1496790,
      name: "Test Game",
      publishers: ["Publisher"],
    })
    expect(result?.type).toBeUndefined()
    expect(result?.headerImage).toBeUndefined()
  })

  it("returns null for malformed payloads", () => {
    expect(parseSteamAppDetailsResponse(570, { not_appdetails: true })).toBeNull()
    expect(
      parseSteamAppDetailsResponse(570, {
        "570": { success: true, data: { platforms: "windows-only" } },
      })
    ).toBeNull()
  })
})
