import { describe, expect, it } from "vitest"
import { mapSteamGameToDashboard } from "@/lib/db/map-dashboard-game"

describe("mapSteamGameToDashboard denuvo display", () => {
  it("maps seeded high-confidence Denuvo to detected display", () => {
    const game = mapSteamGameToDashboard(
      {
        appid: 990080,
        name: "Hogwarts Legacy",
        anticheatEntry: {
          denuvoAntiTamper: true,
          denuvoConfidence: "high",
          denuvoSource: "seed",
          denuvoCheckedAt: "2026-06-05T00:00:00.000Z",
        },
        steamAppDetails: null,
        howlongtobeatEntry: null,
        protondbEntry: null,
      },
      {
        playtimeForeverMinutes: 0,
        playtime2WeeksMinutes: 0,
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
        anticheatEntry: {
          denuvoAntiTamper: null,
          denuvoConfidence: "none",
        },
        steamAppDetails: null,
        howlongtobeatEntry: null,
        protondbEntry: null,
      },
      {
        playtimeForeverMinutes: 0,
        playtime2WeeksMinutes: 0,
      }
    )

    expect(game.antiCheat?.denuvoDisplay?.kind).toBe("unknown")
  })
})

describe("mapSteamGameToDashboard full join row", () => {
  it("maps typed enrichment joins to DashboardGame fields", () => {
    const game = mapSteamGameToDashboard(
      {
        appid: 123,
        name: "Test Game",
        iconUrl: "https://cdn.example/icon.jpg",
        logoUrl: "https://cdn.example/logo.jpg",
        storeUrl: "https://store.steampowered.com/app/123",
        steamAppDetails: {
          type: "game",
          platforms: { windows: true, mac: false, linux: true },
          categories: [{ description: "VR Support" }],
          steamDeckCompatibility: "verified",
          genres: [{ description: "Action" }],
          headerImage: "https://cdn.example/header.jpg",
          releaseDate: { date: "2020" },
          lastCheckedAt: "2026-01-01T00:00:00.000Z",
        },
        howlongtobeatEntry: {
          hltbId: "hltb-1",
          matchedName: "Test Game",
          matchConfidence: 0.95,
          mainStoryMinutes: 600,
          mainExtraMinutes: 900,
          completionistMinutes: 1200,
          allStylesMinutes: 800,
          imageUrl: "https://hltb.example/cover.jpg",
          platforms: ["PC"],
          reviewScore: 88,
          sourceUrl: "https://howlongtobeat.com/game/1",
          lastCheckedAt: "2026-01-02T00:00:00.000Z",
        },
        anticheatEntry: {
          matchedName: "Test Game",
          anticheatNames: ["Easy Anti-Cheat"],
          status: "Denied",
          kernelLevel: true,
          awacySlug: "test-game",
          lastCheckedAt: "2026-01-03T00:00:00.000Z",
        },
        protondbEntry: {
          tier: "gold",
          confidence: "strong",
          totalReports: 42,
          latestReportedAt: "2026-01-04T00:00:00.000Z",
          sourceUrl: "https://www.protondb.com/app/123",
          lastCheckedAt: "2026-01-05T00:00:00.000Z",
        },
      },
      {
        playtimeForeverMinutes: 120,
        playtime2WeeksMinutes: 30,
        lastSyncedAt: "2026-01-06T00:00:00.000Z",
      },
      {
        achievements: {
          unlockedCount: 10,
          totalCount: 20,
          hasAchievements: true,
          lastCheckedAt: "2026-01-07T00:00:00.000Z",
        },
      }
    )

    expect(game.appid).toBe(123)
    expect(game.name).toBe("Test Game")
    expect(game.playtimeForeverMinutes).toBe(120)
    expect(game.hltb?.mainStoryMinutes).toBe(600)
    expect(game.antiCheat?.status).toBe("Denied")
    expect(game.protondb?.tier).toBe("gold")
    expect(game.steamDetails?.steamDeckCompatibility).toBe("verified")
    expect(game.steamDetails?.vrSupported).toBe(true)
    expect(game.achievements?.completionPercent).toBe(50)
  })
})
