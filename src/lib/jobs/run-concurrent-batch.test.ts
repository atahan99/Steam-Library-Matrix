import { describe, expect, it, vi } from "vitest"
import { runConcurrentBatch } from "@/lib/jobs/run-concurrent-batch"

describe("runConcurrentBatch", () => {
  it("respects concurrency and deadline", async () => {
    let inFlight = 0
    let maxInFlight = 0

    const runOne = vi.fn(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 20))
      inFlight -= 1
      return { checked: 1, updated: 1, failed: 0 }
    })

    const result = await runConcurrentBatch({
      items: [1, 2, 3, 4, 5, 6],
      cursor: 0,
      batchSize: 6,
      deadlineMs: Date.now() + 5_000,
      concurrency: 3,
      staggerMs: 0,
      runOne,
    })

    expect(result.processed).toBe(6)
    expect(maxInFlight).toBeLessThanOrEqual(3)
    expect(runOne).toHaveBeenCalledTimes(6)
  })

  it("stops when deadline is exceeded", async () => {
    const runOne = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return { checked: 1, updated: 0, failed: 0 }
    })

    const result = await runConcurrentBatch({
      items: Array.from({ length: 20 }, (_, i) => i),
      cursor: 0,
      batchSize: 20,
      deadlineMs: Date.now() + 30,
      concurrency: 1,
      runOne,
    })

    expect(result.processed).toBeLessThan(20)
  })
})
