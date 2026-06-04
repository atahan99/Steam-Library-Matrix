import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockRunEnrichmentJobStep = vi.fn()

vi.mock("@/lib/jobs/run-step", () => ({
  runEnrichmentJobStep: (...args: unknown[]) => mockRunEnrichmentJobStep(...args),
}))

vi.mock("@/lib/jobs/enqueue-coverage-followup", () => ({
  enqueueCoverageFollowUpIfNeeded: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/jobs/batch-config", () => ({
  getWorkerMaxJobsPerTick: () => 8,
  getWorkerStepBudgetMs: () => 50_000,
}))

type MockJob = {
  id: string
  steamid: string
  kind: string
  payload: Record<string, unknown>
  attempts: number
  startedAt: null
}

const pendingByKind: MockJob[] = [
  {
    id: "job-proton",
    steamid: "76561198000000000",
    kind: "protondb",
    payload: { cursor: 0 },
    attempts: 0,
    startedAt: null,
  },
  {
    id: "job-app",
    steamid: "76561198000000000",
    kind: "app_details",
    payload: { cursor: 0 },
    attempts: 0,
    startedAt: null,
  },
  {
    id: "job-hltb",
    steamid: "76561198000000000",
    kind: "hltb",
    payload: { cursor: 0 },
    attempts: 0,
    startedAt: null,
  },
]

let claimIndex = 0

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
              claimIndex < pendingByKind.length
                ? (() => {
                    const job = pendingByKind[claimIndex]
                    claimIndex += 1
                    return job ? [{ ...job }] : []
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
        returning: () => chainAll([{ id: "ok" }]),
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
    claimIndex = 0
    mockRunEnrichmentJobStep.mockReset()
    mockRunEnrichmentJobStep.mockResolvedValue({
      done: false,
      payload: { cursor: 10 },
      progress: { message: "continued" },
    })
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("runs one step per job kind in parallel", async () => {
    const { processEnrichmentJobsTick } = await import("@/lib/jobs/worker")

    const result = await processEnrichmentJobsTick()

    expect(result.processed).toBe(3)
    expect(result.continued).toBe(3)
    expect(mockRunEnrichmentJobStep).toHaveBeenCalledTimes(3)

    const kinds = mockRunEnrichmentJobStep.mock.calls.map(
      (call) => (call[0] as { kind: string }).kind
    )
    expect(kinds).toContain("protondb")
    expect(kinds).toContain("app_details")
    expect(kinds).toContain("hltb")
  })
})
