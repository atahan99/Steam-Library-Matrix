import { afterEach, describe, expect, it, vi } from "vitest"
import { runEnrichmentJobStep } from "@/lib/jobs/run-step"

vi.mock("@/lib/enrichment/resolve-enrichment-appids", () => ({
  resolveAppidsForSource: vi.fn(),
}))

vi.mock("@/lib/jobs/steps/protondb-step", () => ({
  runProtonDbBatch: vi.fn(),
}))

import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import { runProtonDbBatch } from "@/lib/jobs/steps/protondb-step"

const mockedResolveAppidsForSource = vi.mocked(resolveAppidsForSource)
const mockedRunProtonDbBatch = vi.mocked(runProtonDbBatch)

describe("runEnrichmentJobStep protondb cursor", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("resumes with cursor progress until the library is complete", async () => {
    const appids = Array.from({ length: 50 }, (_, i) => i + 1)
    mockedResolveAppidsForSource.mockResolvedValue(appids)
    mockedRunProtonDbBatch
      .mockResolvedValueOnce({
        checked: 40,
        updated: 32,
        failed: 8,
        processed: 40,
      })
      .mockResolvedValueOnce({
        checked: 10,
        updated: 8,
        failed: 2,
        processed: 10,
      })

    const deadlineMs = Date.now() + 50_000

    const first = await runEnrichmentJobStep({
      steamid: "76561198000000000",
      kind: "protondb",
      payload: { force: true },
      deadlineMs,
    })

    expect(first.done).toBe(false)
    expect(first.payload.cursor).toBe(40)
    expect(first.payload.appids).toEqual(appids)
    expect(first.progress.message).toBe("ProtonDB 40/50")
    expect(first.progress.checked).toBe(40)
    expect(first.progress.updated).toBe(32)
    expect(first.progress.failed).toBe(8)
    expect(first.progress.total).toBe(50)

    const second = await runEnrichmentJobStep({
      steamid: "76561198000000000",
      kind: "protondb",
      payload: first.payload,
      deadlineMs,
    })

    expect(second.done).toBe(true)
    expect(second.payload.cursor).toBe(50)
    expect(second.progress.message).toBe("ProtonDB refresh completed")
    expect(second.progress.checked).toBe(50)
    expect(second.progress.updated).toBe(40)
    expect(second.progress.failed).toBe(10)
    expect(mockedResolveAppidsForSource).toHaveBeenCalledTimes(1)
    expect(mockedRunProtonDbBatch).toHaveBeenNthCalledWith(
      1,
      appids,
      0,
      40,
      deadlineMs,
      true,
      8
    )
    expect(mockedRunProtonDbBatch).toHaveBeenNthCalledWith(
      2,
      appids,
      40,
      40,
      deadlineMs,
      true,
      8
    )
  })

  it("skips resolve when appids are already stored on the payload", async () => {
    const appids = [100, 200]
    mockedRunProtonDbBatch.mockResolvedValue({
      checked: 2,
      updated: 2,
      failed: 0,
      processed: 2,
    })

    const result = await runEnrichmentJobStep({
      steamid: "76561198000000000",
      kind: "protondb",
      payload: { appids, force: false },
      deadlineMs: Date.now() + 50_000,
    })

    expect(result.done).toBe(true)
    expect(mockedResolveAppidsForSource).not.toHaveBeenCalled()
  })
})
