import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/env/runtime-env", () => ({
  getRuntimeEnv: (name: string) => process.env[name],
}))

import {
  getAchievementsBatch,
  getAnticheatBatch,
  getAppDetailsBatch,
  getAppDetailsConcurrency,
  getEmbedWorkerIntervalMs,
  getHltbBatch,
  getHltbFullSyncDelayMs,
  getHltbStaggerMs,
  getProtonDbBatch,
  getWorkerMaxJobsPerTick,
  getWorkerMaxParallelTicks,
  getWorkerStepBudgetMs,
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

  it("getWorkerMaxParallelTicks defaults to 4", () => {
    expect(getWorkerMaxParallelTicks()).toBe(4)
  })

  it("getWorkerStepBudgetMs defaults to 50000", () => {
    expect(getWorkerStepBudgetMs()).toBe(50_000)
  })

  it("getHltbFullSyncDelayMs defaults to 0", () => {
    expect(getHltbFullSyncDelayMs()).toBe(0)
  })

  it("getHltbStaggerMs defaults to 300", () => {
    expect(getHltbStaggerMs()).toBe(300)
  })

  it("uses default batch sizes when env is unset", () => {
    expect(getAppDetailsBatch()).toBe(30)
    expect(getAppDetailsConcurrency()).toBe(6)
    expect(getProtonDbBatch()).toBe(50)
    expect(getHltbBatch()).toBe(16)
    expect(getAchievementsBatch()).toBe(60)
    expect(getAnticheatBatch()).toBe(50)
  })

  it("reads SLM_* batch env vars at call time", () => {
    vi.stubEnv("SLM_APP_DETAILS_BATCH", "12")
    vi.stubEnv("SLM_PROTONDB_BATCH", "40")
    vi.stubEnv("SLM_HLTB_BATCH", "9")
    expect(getAppDetailsBatch()).toBe(12)
    expect(getProtonDbBatch()).toBe(40)
    expect(getHltbBatch()).toBe(9)
  })
})
