import { describe, expect, it } from "vitest"
import type { DashboardGame } from "@/types/dashboard"
import {
  countSteamDeckCoverage,
  hasAuthoritativeSteamDeckStatus,
  isHighSteamDeckUnknownRate,
} from "@/lib/dashboard/steam-deck-coverage"

const game = (overrides: Partial<DashboardGame>): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

describe("steam-deck-coverage", () => {
  it("counts authoritative deck statuses", () => {
    const games = [
      game({ steamDetails: { steamDeckCompatibility: "verified" } }),
      game({ appid: 2, steamDetails: { steamDeckCompatibility: "unknown" } }),
    ]
    expect(countSteamDeckCoverage(games)).toEqual({
      total: 2,
      authoritative: 1,
      unknown: 1,
    })
  })

  it("detects high unknown rate for library hint", () => {
    const games = Array.from({ length: 10 }, (_, i) =>
      game({
        appid: i,
        steamDetails: { steamDeckCompatibility: "unknown" },
      })
    )
    expect(isHighSteamDeckUnknownRate(games)).toBe(true)
    expect(
      hasAuthoritativeSteamDeckStatus(
        game({ steamDetails: { steamDeckCompatibility: "playable" } })
      )
    ).toBe(true)
  })
})
