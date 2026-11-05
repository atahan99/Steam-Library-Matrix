import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let checkRateLimit: typeof import("@/lib/api/rate-limit").checkRateLimit

const requestForIp = (ip: string): Request =>
  new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  })

describe("checkRateLimit", () => {
  beforeEach(async () => {
    // fresh module = empty in-memory windows per test
    vi.resetModules()
    ;({ checkRateLimit } = await import("@/lib/api/rate-limit"))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("frees the window after the rate window expires", () => {
    vi.useFakeTimers()
    vi.stubEnv("SLM_RATE_LIMIT_PER_MIN", "2")

    const request = requestForIp("203.0.113.1")
    expect(checkRateLimit(request)).toBeNull()
    expect(checkRateLimit(request)).toBeNull()
    expect(checkRateLimit(request)?.status).toBe(429)

    vi.advanceTimersByTime(60_001)

    expect(checkRateLimit(request)).toBeNull()
  })

  it("ignores spoofed X-Forwarded-For (one bucket per tier)", () => {
    vi.useFakeTimers()
    vi.stubEnv("SLM_RATE_LIMIT_PER_MIN", "2")

    expect(checkRateLimit(requestForIp("198.51.100.1"))).toBeNull()
    expect(checkRateLimit(requestForIp("198.51.100.2"))).toBeNull()
    expect(checkRateLimit(requestForIp("198.51.100.3"))?.status).toBe(429)
    expect(checkRateLimit(requestForIp("198.51.100.4"), "expensive")).toBeNull()
  })
})
