import { afterEach, describe, expect, it, vi } from "vitest"
import { checkRateLimit } from "@/lib/api/rate-limit"

const requestForIp = (ip: string): Request =>
  new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  })

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("drops window keys after the rate window expires", () => {
    vi.useFakeTimers()
    vi.stubEnv("SLM_RATE_LIMIT_PER_MIN", "2")

    const request = requestForIp("203.0.113.1")
    expect(checkRateLimit(request)).toBeNull()
    expect(checkRateLimit(request)).toBeNull()
    expect(checkRateLimit(request)?.status).toBe(429)

    vi.advanceTimersByTime(60_001)

    expect(checkRateLimit(request)).toBeNull()
    vi.useRealTimers()
  })
})
