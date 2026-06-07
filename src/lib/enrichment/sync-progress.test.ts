import { describe, expect, it } from "vitest"
import type { EnrichmentCoverage } from "@/lib/enrichment/coverage-for-appids"
import {
  computeSyncProgress,
  estimateSecondsRemaining,
  formatEtaSeconds,
  processedCountForSource,
} from "@/lib/enrichment/sync-progress"

const emptyCoverage = (total: number): EnrichmentCoverage => ({
  app_details: { total, withData: 0, missing: total, stale: 0 },
  protondb: { total, withData: 0, missing: total, stale: 0 },
  anticheat: { total, withData: 0, missing: total, stale: 0 },
  hltb: { total, withData: 0, missing: total, stale: 0 },
})

describe("processedCountForSource", () => {
  it("counts withData and stale as processed", () => {
    expect(
      processedCountForSource({ total: 10, withData: 4, missing: 3, stale: 3 })
    ).toBe(7)
  })

  it("counts confirmed-absent and stale HLTB rows as processed (only missing is outstanding)", () => {
    expect(
      processedCountForSource({
        total: 10,
        withData: 4,
        missing: 0,
        stale: 3,
        confirmedAbsent: 3,
      })
    ).toBe(10)
  })
})

describe("computeSyncProgress", () => {
  it("computes overall percent from four sources", () => {
    const coverage: EnrichmentCoverage = {
      app_details: { total: 10, withData: 10, missing: 0, stale: 0 },
      protondb: { total: 10, withData: 5, missing: 5, stale: 0 },
      anticheat: { total: 10, withData: 0, missing: 0, stale: 0 },
      hltb: { total: 10, withData: 0, missing: 0, stale: 0 },
    }

    const result = computeSyncProgress({
      coverage,
      activeJobs: [],
      enrichTotal: 10,
    })

    expect(result.processedUnits).toBe(15)
    expect(result.totalUnits).toBe(40)
    expect(result.percent).toBe(38)
    expect(result.isActive).toBe(true)
    expect(result.isComplete).toBe(false)
  })

  it("marks complete when nothing missing and no active jobs", () => {
    const coverage = emptyCoverage(5)
    for (const key of Object.keys(coverage) as (keyof EnrichmentCoverage)[]) {
      coverage[key] = { total: 5, withData: 4, missing: 0, stale: 1 }
    }

    const result = computeSyncProgress({
      coverage,
      activeJobs: [],
      enrichTotal: 5,
    })

    expect(result.isComplete).toBe(true)
    expect(result.percent).toBe(100)
    expect(result.isActive).toBe(false)
  })

  it("stays active while enrichment jobs are running", () => {
    const coverage = emptyCoverage(10)
    for (const key of Object.keys(coverage) as (keyof EnrichmentCoverage)[]) {
      coverage[key] = { total: 10, withData: 10, missing: 0, stale: 0 }
    }

    const result = computeSyncProgress({
      coverage,
      activeJobs: [{ kind: "protondb", status: "running" }],
      enrichTotal: 10,
    })

    expect(result.isComplete).toBe(false)
    expect(result.activeJobCount).toBe(1)
    expect(result.isActive).toBe(true)
  })
})

describe("formatEtaSeconds", () => {
  it("formats short and long durations", () => {
    expect(formatEtaSeconds(30)).toBe("< 1 min")
    expect(formatEtaSeconds(120)).toBe("~2 min")
    expect(formatEtaSeconds(3700)).toBe("~1h 2m")
  })
})

describe("estimateSecondsRemaining", () => {
  it("estimates from processing rate", () => {
    const eta = estimateSecondsRemaining(
      { processedUnits: 10, atMs: 0 },
      { processedUnits: 20, totalUnits: 100, atMs: 10_000 }
    )

    expect(eta).toBe(80)
  })

  it("returns null when rate is zero", () => {
    expect(
      estimateSecondsRemaining(
        { processedUnits: 10, atMs: 0 },
        { processedUnits: 10, totalUnits: 100, atMs: 5000 }
      )
    ).toBeNull()
  })
})
