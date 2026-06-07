import { describe, expect, it } from "vitest"
import {
  computeEnrichmentCoverageFromGames,
  hasProtonCoverage,
} from "@/lib/enrichment/coverage-for-appids"
import type { DashboardGame } from "@/types/dashboard"

const freshCheckedAt = new Date().toISOString()
const staleCheckedAt = new Date(Date.now() - 200 * 60 * 60 * 1000).toISOString()
const staleHltbCheckedAt = new Date(
  Date.now() - 800 * 60 * 60 * 1000
).toISOString()

const baseGame = (appid: number, overrides: Partial<DashboardGame> = {}): DashboardGame => ({
  appid,
  name: `Game ${appid}`,
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

describe("hasProtonCoverage", () => {
  it("treats unreleased games as covered", () => {
    expect(
      hasProtonCoverage(
        baseGame(1, {
          steamDetails: {
            releaseDate: { comingSoon: true },
          },
        })
      )
    ).toBe(true)
  })

  it("requires a known tier for released games", () => {
    expect(
      hasProtonCoverage(
        baseGame(1, {
          protondb: { tier: "gold", lastCheckedAt: freshCheckedAt },
        })
      )
    ).toBe(true)
    expect(
      hasProtonCoverage(
        baseGame(1, {
          protondb: { tier: "unknown", lastCheckedAt: freshCheckedAt },
        })
      )
    ).toBe(false)
  })
})

describe("computeEnrichmentCoverageFromGames", () => {
  it("returns zero totals for an empty list", () => {
    const coverage = computeEnrichmentCoverageFromGames([])
    expect(coverage.app_details).toEqual({
      total: 0,
      withData: 0,
      missing: 0,
      stale: 0,
    })
  })

  it("counts fresh meaningful rows as withData", () => {
    const coverage = computeEnrichmentCoverageFromGames([
      baseGame(1, {
        steamDetails: {
          platforms: { windows: true },
          steamDeckCompatibility: "verified",
          lastCheckedAt: freshCheckedAt,
        },
        protondb: { tier: "platinum", lastCheckedAt: freshCheckedAt },
        antiCheat: {
          status: "Supported",
          lastCheckedAt: freshCheckedAt,
        },
        hltb: { mainStoryMinutes: 600, lastCheckedAt: freshCheckedAt },
      }),
    ])

    expect(coverage.app_details.withData).toBe(1)
    expect(coverage.protondb.withData).toBe(1)
    expect(coverage.anticheat.withData).toBe(1)
    expect(coverage.hltb.withData).toBe(1)
  })

  it("counts never-checked sources as missing", () => {
    const coverage = computeEnrichmentCoverageFromGames([baseGame(1)])

    expect(coverage.app_details.missing).toBe(1)
    expect(coverage.protondb.missing).toBe(1)
    expect(coverage.anticheat.missing).toBe(1)
    expect(coverage.hltb.missing).toBe(1)
  })

  it("counts stale or incomplete cache rows separately from missing", () => {
    const coverage = computeEnrichmentCoverageFromGames([
      baseGame(1, {
        steamDetails: {
          platforms: { windows: true },
          steamDeckCompatibility: "verified",
          lastCheckedAt: staleCheckedAt,
        },
        protondb: { tier: "unknown", lastCheckedAt: staleCheckedAt },
        antiCheat: {
          status: "Unknown",
          lastCheckedAt: staleCheckedAt,
        },
        hltb: { lastCheckedAt: staleHltbCheckedAt },
      }),
    ])

    expect(coverage.app_details.stale).toBe(1)
    expect(coverage.protondb.stale).toBe(1)
    expect(coverage.anticheat.stale).toBe(1)
    expect(coverage.hltb.stale).toBe(1)
  })

  it("keeps confirmedAbsent when a normal game is processed after a confirmed-absent one", () => {
    const coverage = computeEnrichmentCoverageFromGames([
      baseGame(1, {
        hltb: { matchedName: "[failed: no results]", lastCheckedAt: freshCheckedAt },
      }),
      baseGame(2, {
        hltb: { mainStoryMinutes: 300, lastCheckedAt: freshCheckedAt },
      }),
    ])

    expect(coverage.hltb.confirmedAbsent).toBe(1)
    expect(coverage.hltb.withData).toBe(1)
    expect(
      coverage.hltb.withData +
        coverage.hltb.missing +
        coverage.hltb.stale +
        (coverage.hltb.confirmedAbsent ?? 0)
    ).toBe(coverage.hltb.total)
  })

  it("partitions buckets so withData + missing + stale + confirmedAbsent equals total", () => {
    const coverage = computeEnrichmentCoverageFromGames([
      baseGame(1, {
        steamDetails: {
          platforms: { linux: true },
          steamDeckCompatibility: "playable",
          lastCheckedAt: freshCheckedAt,
        },
        protondb: { tier: "gold", lastCheckedAt: freshCheckedAt },
      }),
      baseGame(2),
      baseGame(3, {
        steamDetails: {
          lastCheckedAt: staleCheckedAt,
        },
        hltb: {
          mainStoryMinutes: 120,
          lastCheckedAt: staleHltbCheckedAt,
        },
      }),
      baseGame(4, {
        hltb: {
          matchedName: "[failed: no results]",
          lastCheckedAt: freshCheckedAt,
        },
      }),
    ])

    for (const [key, source] of Object.entries(coverage)) {
      const confirmedAbsent = source.confirmedAbsent ?? 0
      expect(source.withData + source.missing + source.stale + confirmedAbsent).toBe(
        source.total
      )
      expect(source.total).toBe(4)
      if (key === "hltb") {
        expect(source.confirmedAbsent).toBe(1)
      }
    }
  })
})
