import { describe, expect, it } from "vitest"
import { parseStoreDrmNoticesFromHtml } from "@/lib/steam/denuvo/parse-store-drm-notices"
import { FIXTURES } from "@/lib/steam/denuvo/fixtures"

describe("parseStoreDrmNoticesFromHtml", () => {
  it("detects Denuvo Anti-Tamper from store page DRM notice", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.hogwartsLegacyDrmHtml)

    expect(parsed.hasDenuvoAntiTamper).toBe(true)
    expect(parsed.thirdPartyDrm).toContain("Denuvo Anti-Tampering")
    expect(parsed.notices.length).toBe(2)
    expect(parsed.activationLimit).toBeNull()
  })

  it("returns empty result when no DRM notices exist", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.noDrmHtml)

    expect(parsed.hasDenuvoAntiTamper).toBe(false)
    expect(parsed.notices).toEqual([])
    expect(parsed.thirdPartyDrm).toEqual([])
    expect(parsed.activationLimit).toBeNull()
  })

  it("extracts activation limit notices", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.activationLimitHtml)

    expect(parsed.hasDenuvoAntiTamper).toBe(false)
    expect(parsed.activationLimit).toBe("5 a day machine activation limit")
  })

  it("parses non-Denuvo third-party DRM without flagging Denuvo", () => {
    const parsed = parseStoreDrmNoticesFromHtml(FIXTURES.securomHtml)

    expect(parsed.hasDenuvoAntiTamper).toBe(false)
    expect(parsed.thirdPartyDrm).toContain("SecuROM")
  })
})
