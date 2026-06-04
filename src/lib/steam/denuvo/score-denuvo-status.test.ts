import { describe, expect, it } from "vitest"
import { scoreDenuvoStatus } from "@/lib/steam/denuvo/score-denuvo-status"
import { parseStoreDrmNoticesFromHtml } from "@/lib/steam/denuvo/parse-store-drm-notices"
import { FIXTURES } from "@/lib/steam/denuvo/fixtures"

const checkedAt = "2026-06-03T00:00:00.000Z"

describe("scoreDenuvoStatus", () => {
  it("returns high confidence when store page explicitly mentions Denuvo", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.hogwartsLegacyDrmHtml)
    const status = scoreDenuvoStatus({
      appid: 990080,
      storePage: { fetched: true, parsed },
      curatorListed: false,
      curatorComplete: false,
      checkedAt,
    })

    expect(status.hasDenuvoAntiTamper).toBe(true)
    expect(status.confidence).toBe("high")
  })

  it("returns high confidence when store page and curator both positive", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.hogwartsLegacyDrmHtml)
    const status = scoreDenuvoStatus({
      appid: 990080,
      storePage: { fetched: true, parsed },
      curatorListed: true,
      curatorComplete: true,
      checkedAt,
    })

    expect(status.hasDenuvoAntiTamper).toBe(true)
    expect(status.confidence).toBe("high")
  })

  it("returns medium confidence when curator listed but store page unavailable", () => {
    const status = scoreDenuvoStatus({
      appid: 990080,
      storePage: { fetched: true, error: "Store page fetch failed" },
      curatorListed: true,
      curatorComplete: true,
      checkedAt,
    })

    expect(status.hasDenuvoAntiTamper).toBe(true)
    expect(status.confidence).toBe("medium")
  })

  it("returns high confidence negative when store page has no Denuvo and curator absent", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.noDrmHtml)
    const status = scoreDenuvoStatus({
      appid: 570,
      storePage: { fetched: true, parsed },
      curatorListed: false,
      curatorComplete: true,
      checkedAt,
    })

    expect(status.hasDenuvoAntiTamper).toBe(false)
    expect(status.confidence).toBe("high")
  })

  it("returns medium confidence negative when catalog complete and store not fetched", () => {
    const status = scoreDenuvoStatus({
      appid: 570,
      storePage: { fetched: true, error: "Store page fetch failed" },
      curatorListed: false,
      curatorComplete: true,
      checkedAt,
    })

    expect(status.hasDenuvoAntiTamper).toBe(false)
    expect(status.confidence).toBe("medium")
  })

  it("prefers positive DRM signal when store and curator conflict", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.noDrmHtml)
    const status = scoreDenuvoStatus({
      appid: 990080,
      storePage: { fetched: true, parsed },
      curatorListed: true,
      curatorComplete: true,
      checkedAt,
    })

    expect(status.hasDenuvoAntiTamper).toBe(true)
    expect(status.confidence).toBe("medium")
  })

  it("returns unknown when store fetch failed and curator incomplete", () => {
    const status = scoreDenuvoStatus({
      appid: 123,
      storePage: { fetched: true, error: "Store page fetch failed" },
      curatorListed: false,
      curatorComplete: false,
      checkedAt,
    })

    expect(status.hasDenuvoAntiTamper).toBeNull()
    expect(status.confidence).toBe("none")
  })
})
