import { describe, expect, it } from "vitest"
import { parseRetryAfterMs } from "@/lib/steam/steam-store-fetch"

describe("parseRetryAfterMs", () => {
  it("parses Retry-After seconds", () => {
    const res = new Response(null, { headers: { "Retry-After": "30" } })
    expect(parseRetryAfterMs(res)).toBe(30_000)
  })

  it("parses Retry-After HTTP-date", () => {
    const future = new Date(Date.now() + 60_000).toUTCString()
    const res = new Response(null, { headers: { "Retry-After": future } })
    const parsed = parseRetryAfterMs(res)
    expect(parsed).not.toBeNull()
    expect(parsed).toBeGreaterThan(50_000)
    expect(parsed).toBeLessThanOrEqual(60_000)
  })

  it("returns null when header is missing", () => {
    const res = new Response(null)
    expect(parseRetryAfterMs(res)).toBeNull()
  })
})
