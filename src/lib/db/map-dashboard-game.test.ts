import { describe, expect, it } from "vitest"
import { mapSteamGameToDashboard } from "@/lib/db/map-dashboard-game"

describe("mapSteamGameToDashboard denuvo display", () => {
  it("maps seeded high-confidence Denuvo to detected display", () => {
    const game = mapSteamGameToDashboard(
      {
        appid: 990080,
        name: "Hogwarts Legacy",
        anticheat_entries: {
          denuvo_anti_tamper: true,
          denuvo_confidence: "high",
          denuvo_source: "seed",
          denuvo_checked_at: "2026-06-05T00:00:00.000Z",
        },
      },
      {
        playtimeForeverMinutes: 0,
        playtime2weeksMinutes: 0,
      }
    )

    expect(game.antiCheat?.denuvoDisplay?.kind).toBe("detected")
    expect(game.antiCheat?.denuvoDisplay?.label).toBe("Denuvo detected")
  })

  it("maps null denuvo to unknown display", () => {
    const game = mapSteamGameToDashboard(
      {
        appid: 570,
        name: "Dota 2",
        anticheat_entries: {
          denuvo_anti_tamper: null,
          denuvo_confidence: "none",
        },
      },
      {
        playtimeForeverMinutes: 0,
        playtime2weeksMinutes: 0,
      }
    )

    expect(game.antiCheat?.denuvoDisplay?.kind).toBe("unknown")
  })
})
