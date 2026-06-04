import { afterEach, describe, expect, it, vi } from "vitest"
import {
  APP_DETAILS_BATCH,
  APP_DETAILS_CONCURRENCY,
  ACHIEVEMENTS_BATCH,
  ANTICHEAT_BATCH,
  getEmbedWorkerIntervalMs,
  getHltbStaggerMs,
  getWorkerMaxJobsPerTick,
  getWorkerMaxParallelTicks,
  getWorkerStepBudgetMs,
  HLTB_BATCH,
  HLTB_FULL_SYNC_DELAY_MS,
  PROTONDB_BATCH,
} from "@/lib/jobs/batch-config"

describe("batch-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("getWorkerMaxJobsPerTick defaults to 8", () => {
    expect(getWorkerMaxJobsPerTick()).toBe(8)
  })

  it("getWorkerMaxJobsPerTick reads SLM_WORKER_MAX_JOBS_PER_TICK", () => {
    vi.stubEnv("SLM_WORKER_MAX_JOBS_PER_TICK", "10")
    expect(getWorkerMaxJobsPerTick()).toBe(10)
  })

  it("getEmbedWorkerIntervalMs defaults to 60000", () => {
    expect(getEmbedWorkerIntervalMs()).toBe(60_000)
  })

  it("getWorkerMaxParallelTicks defaults to 2", () => {
    expect(getWorkerMaxParallelTicks()).toBe(2)
  })

  it("getWorkerStepBudgetMs defaults to 50000", () => {
    expect(getWorkerStepBudgetMs()).toBe(50_000)
  })

  it("HLTB_FULL_SYNC_DELAY_MS defaults to 0", () => {
    expect(HLTB_FULL_SYNC_DELAY_MS).toBe(0)
  })

  it("getHltbStaggerMs defaults to 300", () => {
    expect(getHltbStaggerMs()).toBe(300)
  })

  it("uses default batch sizes when env is unset", () => {
    expect(APP_DETAILS_BATCH).toBe(30)
    expect(APP_DETAILS_CONCURRENCY).toBe(4)
    expect(PROTONDB_BATCH).toBe(50)
    expect(HLTB_BATCH).toBe(16)
    expect(ACHIEVEMENTS_BATCH).toBe(60)
    expect(ANTICHEAT_BATCH).toBe(50)
  })

  it("reads SLM_* batch env vars at module load", async () => {
    vi.stubEnv("SLM_APP_DETAILS_BATCH", "12")
    vi.stubEnv("SLM_PROTONDB_BATCH", "40")
    vi.stubEnv("SLM_HLTB_BATCH", "9")
    vi.resetModules()

    const config = await import("@/lib/jobs/batch-config")
    expect(config.APP_DETAILS_BATCH).toBe(12)
    expect(config.PROTONDB_BATCH).toBe(40)
    expect(config.HLTB_BATCH).toBe(9)
  })
})
