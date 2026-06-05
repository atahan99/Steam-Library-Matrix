import { describe, expect, it } from "vitest"
import { isDenuvoDataFresh } from "@/lib/steam/denuvo/is-denuvo-data-fresh"

describe("isDenuvoDataFresh", () => {
  it("returns false when denuvoCheckedAt is missing", () => {
    expect(
      isDenuvoDataFresh({
        denuvoAntiTamper: true,
        denuvoConfidence: "high",
        denuvoCheckedAt: null,
      })
    ).toBe(false)
  })

  it("returns true for recent high-confidence data within 30 days", () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    expect(
      isDenuvoDataFresh({
        denuvoAntiTamper: true,
        denuvoConfidence: "high",
        denuvoCheckedAt: recent,
      })
    ).toBe(true)
  })

  it("returns false for stale unknown data older than 7 days", () => {
    const stale = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    expect(
      isDenuvoDataFresh({
        denuvoAntiTamper: null,
        denuvoConfidence: "none",
        denuvoCheckedAt: stale,
      })
    ).toBe(false)
  })
})
