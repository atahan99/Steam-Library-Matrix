import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import {
  classifyEnrichResult,
  enrichLog,
  formatWorkerTickLog,
  isEnrichVerbose,
} from "@/lib/jobs/enrich-logger"

describe("enrich-logger", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.SLM_ENRICH_VERBOSE
    delete process.env.SLM_CLI
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("isEnrichVerbose respects SLM_ENRICH_VERBOSE and SLM_CLI", () => {
    expect(isEnrichVerbose()).toBe(false)
    process.env.SLM_ENRICH_VERBOSE = "true"
    expect(isEnrichVerbose()).toBe(true)
    process.env.SLM_ENRICH_VERBOSE = "false"
    expect(isEnrichVerbose()).toBe(false)
    delete process.env.SLM_ENRICH_VERBOSE
    process.env.SLM_CLI = "1"
    expect(isEnrichVerbose()).toBe(true)
  })

  it("classifyEnrichResult prefers skipped over updated", () => {
    expect(classifyEnrichResult({ updated: 1, skipped: 1 })).toBe("skipped")
    expect(classifyEnrichResult({ updated: 1 })).toBe("updated")
    expect(classifyEnrichResult({ failed: 1 })).toBe("failed")
    expect(classifyEnrichResult({})).toBe("noop")
  })

  it("formatWorkerTickLog summarizes idle and active ticks", () => {
    expect(formatWorkerTickLog({ processed: 0, completed: 0, continued: 0, failed: 0 })).toBe(
      "[dev:jobs] idle (no pending jobs)"
    )
    expect(
      formatWorkerTickLog({ processed: 2, completed: 1, continued: 1, failed: 0 })
    ).toContain("processed=2")
  })

  it("enrichLog is silent when verbose is off", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    enrichLog("hidden")
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
