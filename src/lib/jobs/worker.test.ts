import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockRunEnrichmentJobStep = vi.fn()

vi.mock("@/lib/jobs/run-step", () => ({
  runEnrichmentJobStep: (...args: unknown[]) => mockRunEnrichmentJobStep(...args),
}))

vi.mock("@/lib/jobs/batch-config", () => ({
  getWorkerMaxJobsPerTick: () => 5,
}))

const pendingJob = {
  id: "job-continued",
  steamid: "76561198000000000",
  kind: "achievements",
  payload: { cursor: 0 },
  attempts: 0,
  startedAt: null as Date | null,
}

let claimCount = 0

const chainAll = (rows: unknown[]) => ({
  all: () => rows,
})

const mockTx = {
  select: () => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () =>
            chainAll(
              claimCount < 5
                ? (() => {
                    claimCount += 1
                    return [{ ...pendingJob }]
                  })()
                : []
            ),
        }),
      }),
    }),
  }),
  update: () => ({
    set: () => ({
      where: () => ({
        returning: () => chainAll([{ id: pendingJob.id }]),
      }),
    }),
  }),
}

const mockDb = {
  transaction: (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
  update: () => ({
    set: () => ({
      where: () => Promise.resolve(),
    }),
  }),
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => mockDb,
}))

describe("processEnrichmentJobsTick", () => {
  beforeEach(async () => {
    claimCount = 0
    mockRunEnrichmentJobStep.mockReset()
    mockRunEnrichmentJobStep.mockResolvedValue({
      done: false,
      payload: { cursor: 10 },
      progress: { message: "Achievements 10/100" },
    })
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("runs multiple continued steps in one tick without early break", async () => {
    const { processEnrichmentJobsTick } = await import("@/lib/jobs/worker")

    const result = await processEnrichmentJobsTick()

    expect(result.processed).toBe(5)
    expect(result.continued).toBe(5)
    expect(result.completed).toBe(0)
    expect(mockRunEnrichmentJobStep).toHaveBeenCalledTimes(5)
  })
})
