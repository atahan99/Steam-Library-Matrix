import { afterEach, describe, expect, it, vi } from "vitest"
import {
  APP_DETAILS_BATCH,
  ACHIEVEMENTS_BATCH,
  ANTICHEAT_BATCH,
  getWorkerMaxJobsPerTick,
  HLTB_BATCH,
  PROTONDB_BATCH,
} from "@/lib/jobs/batch-config"

describe("batch-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("getWorkerMaxJobsPerTick defaults to 5", () => {
    expect(getWorkerMaxJobsPerTick()).toBe(5)
  })

  it("getWorkerMaxJobsPerTick reads SLM_WORKER_MAX_JOBS_PER_TICK", () => {
    vi.stubEnv("SLM_WORKER_MAX_JOBS_PER_TICK", "8")
    expect(getWorkerMaxJobsPerTick()).toBe(8)
  })

  it("uses default batch sizes when env is unset", () => {
    expect(APP_DETAILS_BATCH).toBe(20)
    expect(PROTONDB_BATCH).toBe(40)
    expect(HLTB_BATCH).toBe(12)
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
