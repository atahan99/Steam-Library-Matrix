import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const mockRunEnrichmentJobStep = vi.fn()

vi.mock("@/lib/jobs/run-step", () => ({
  runEnrichmentJobStep: (...args: unknown[]) => mockRunEnrichmentJobStep(...args),
}))

vi.mock("@/lib/jobs/enqueue-coverage-followup", () => ({
  enqueueCoverageFollowUpIfNeeded: vi.fn().mockResolvedValue(undefined),
}))

const STEAMID = "76561198000000001"
const tempDir = mkdtempSync(path.join(tmpdir(), "slm-worker-db-"))
process.env.DATABASE_URL = `file:${path.join(tempDir, "test.db")}`

const loadJob = async (id: string) => {
  const { getEnrichmentJob } = await import("@/lib/jobs/enqueue")
  const job = await getEnrichmentJob(id)
  if (!job) throw new Error("job missing")
  return job
}

describe("worker against real SQLite", () => {
  beforeAll(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    const { runMigrations } = await import("@/lib/db/migrate")
    await runMigrations()
    const { getRawSqlite } = await import("@/lib/db/client")
    getRawSqlite().prepare("insert into steam_profiles (steamid) values (?)").run(STEAMID)
  })

  afterAll(async () => {
    const { closeDb } = await import("@/lib/db/client")
    await closeDb()
    rmSync(tempDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it("claims a job once and resets attempts on a continued step", async () => {
    const { enqueueEnrichmentJob } = await import("@/lib/jobs/enqueue")
    const { processEnrichmentJobsTick } = await import("@/lib/jobs/worker")
    const { id } = await enqueueEnrichmentJob({ steamid: STEAMID, kind: "hltb" })

    let finishStep: (value: unknown) => void = () => {}
    mockRunEnrichmentJobStep.mockImplementationOnce(
      () => new Promise((resolve) => { finishStep = resolve })
    )

    const firstTick = processEnrichmentJobsTick()
    expect((await loadJob(id)).status).toBe("running")
    expect((await loadJob(id)).attempts).toBe(1)

    // A second tick while the job is running must not claim it again.
    expect((await processEnrichmentJobsTick()).processed).toBe(0)
    expect(mockRunEnrichmentJobStep).toHaveBeenCalledTimes(1)

    finishStep({ done: false, payload: { cursor: 5 }, progress: { message: "5/10" } })
    expect((await firstTick).continued).toBe(1)

    const job = await loadJob(id)
    expect(job.status).toBe("pending")
    expect(job.attempts).toBe(0)
    expect(job.error).toBeNull()
  })

  it("does not spend an attempt on a Steam store cooldown", async () => {
    const { processEnrichmentJobsTick } = await import("@/lib/jobs/worker")
    const { SteamStoreCooldownError } = await import("@/lib/steam/steam-store-throttle-db")
    const { getRawSqlite } = await import("@/lib/db/client")
    const row = getRawSqlite()
      .prepare("select id from enrichment_jobs where kind = 'hltb'")
      .get() as { id: string }
    const cooldownUntil = Date.now() + 30 * 60_000

    mockRunEnrichmentJobStep.mockRejectedValueOnce(new SteamStoreCooldownError(cooldownUntil))
    await processEnrichmentJobsTick()

    const job = await loadJob(row.id)
    expect(job.status).toBe("pending")
    expect(job.attempts).toBe(0)
    expect(job.runAfter.getTime()).toBe(cooldownUntil)
  })
})
