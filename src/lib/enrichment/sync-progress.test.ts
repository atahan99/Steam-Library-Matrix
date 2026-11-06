import { describe, expect, it } from "vitest"
import type { EnrichmentCoverage } from "@/lib/enrichment/coverage-for-appids"
import {
  computeSyncProgress,
  computeSyncProgressFromSources,
  estimateEtaFromActiveJobs,
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

describe("estimateEtaFromActiveJobs", () => {
  it("uses the slowest parallel job, with storefront kinds slower per item", () => {
    const eta = estimateEtaFromActiveJobs([
      { kind: "protondb", progress: { checked: 0, total: 100 } },
      { kind: "app_details", progress: { checked: 900, total: 1000 } },
    ] as never)
    expect(eta).toBe(400) // 100 app_details items at 4s beat 100 protondb items at 0.35s
  })

  it("returns null when no job has remaining work", () => {
    expect(estimateEtaFromActiveJobs([{ kind: "hltb", progress: { checked: 5, total: 5 } }] as never)).toBeNull()
  })
})

describe("computeSyncProgressFromSources with running jobs", () => {
  const row = (key: string, total: number, processed: number) => ({
    key,
    label: key,
    total,
    withData: processed,
    processed,
    missing: total - processed,
    percent: total > 0 ? Math.round((processed / total) * 100) : 100,
  })

  it("shows a refresh pass instead of 100% and never reports 100% overall while a job works", () => {
    const result = computeSyncProgressFromSources({
      sources: [row("app_details", 100, 100), row("anticheat", 100, 100)],
      enrichTotal: 100,
      activeJobs: [
        { kind: "anticheat", status: "running", position: { done: 70, total: 100 } },
      ],
    })
    const anticheat = result.sources.find((s) => s.key === "anticheat")!
    expect(anticheat.percent).toBe(70)
    expect(anticheat.refreshing).toEqual({ done: 70, total: 100 })
    expect(result.percent).toBe(85)
    expect(result.isComplete).toBe(false)
    expect(result.activeJobCount).toBe(1)
  })

  it("treats a failed job waiting to retry as idle, so the sync can complete", () => {
    const result = computeSyncProgressFromSources({
      sources: [row("app_details", 10, 10)],
      enrichTotal: 10,
      activeJobs: [{ kind: "anticheat_catalog", status: "pending", error: "Levvvel list incomplete" }],
    })
    expect(result.activeJobCount).toBe(0)
    expect(result.isComplete).toBe(true)
    expect(result.percent).toBe(100)
  })

  it("caps at 99% when coverage is full but a job is still running", () => {
    const result = computeSyncProgressFromSources({
      sources: [row("protondb", 10, 10)],
      enrichTotal: 10,
      activeJobs: [{ kind: "protondb", status: "running" }],
    })
    expect(result.percent).toBe(99)
    expect(result.isComplete).toBe(false)
  })
})
