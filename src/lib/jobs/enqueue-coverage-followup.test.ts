import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/jobs/enqueue", () => ({
  enqueueEnrichmentJob: vi.fn(async () => ({ status: "created" })),
}))
vi.mock("@/lib/anticheat/sync-denuvo-catalog", () => ({
  isDenuvoCatalogSyncNeeded: vi.fn(async () => false),
}))
vi.mock("@/lib/enrichment/resolve-enrichment-appids", () => ({
  resolveAppidsForSource: vi.fn(async () => [570]),
}))

import { enqueueEnrichmentJob } from "@/lib/jobs/enqueue"
import { enqueueCoverageFollowUpIfNeeded } from "@/lib/jobs/enqueue-coverage-followup"

const mockedEnqueue = vi.mocked(enqueueEnrichmentJob)
const STEAMID = "76561198000000001"

const run = (followUpRound: number | undefined, failed: number) =>
  enqueueCoverageFollowUpIfNeeded({
    steamid: STEAMID,
    kind: "protondb",
    progress: { failed } as never,
    payload: { followUpRound },
  })

beforeEach(() => {
  mockedEnqueue.mockClear()
})

describe("enqueueCoverageFollowUpIfNeeded round cap", () => {
  it("starts at round 1 and increments the parent's round", async () => {
    await run(undefined, 2)
    expect(mockedEnqueue.mock.calls[0]?.[0].payload?.followUpRound).toBe(1)

    await run(2, 2)
    expect(mockedEnqueue.mock.calls[1]?.[0].payload?.followUpRound).toBe(3)
  })

  it("stops enqueueing after round 3 for failed retries", async () => {
    await run(3, 5)
    expect(mockedEnqueue).not.toHaveBeenCalled()
  })

  it("stops enqueueing after round 3 for gap fills", async () => {
    await run(3, 0)
    expect(mockedEnqueue).not.toHaveBeenCalled()
  })
})
