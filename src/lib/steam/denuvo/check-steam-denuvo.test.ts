import { describe, expect, it } from "vitest"
import { checkSteamDenuvo } from "@/lib/steam/denuvo/check-steam-denuvo"
import { FIXTURES } from "@/lib/steam/denuvo/fixtures"

describe("checkSteamDenuvo", () => {
  it("uses store page as primary signal when fetch succeeds", async () => {
    const status = await checkSteamDenuvo(990080, {
      curatorAppids: new Set(),
      curatorComplete: false,
      fetchStorePage: async () => FIXTURES.hogwartsLegacyDrmHtml,
    })

    expect(status.hasDenuvoAntiTamper).toBe(true)
    expect(status.confidence).toBe("high")
    expect(status.drmNotices.length).toBeGreaterThan(0)
    expect(status.sources.some((s) => s.source === "store_page" && s.matched)).toBe(
      true
    )
  })

  it("falls back to curator when store page fetch fails", async () => {
    const status = await checkSteamDenuvo(990080, {
      curatorAppids: new Set([990080]),
      curatorComplete: true,
      fetchStorePage: async () => null,
    })

    expect(status.hasDenuvoAntiTamper).toBe(true)
    expect(status.confidence).toBe("medium")
    expect(status.sources.find((s) => s.source === "store_page")?.error).toBe(
      "Store page fetch failed"
    )
  })

  it("returns negative high confidence when store page has no Denuvo", async () => {
    const status = await checkSteamDenuvo(570, {
      curatorAppids: new Set(),
      curatorComplete: true,
      fetchStorePage: async () => FIXTURES.noDrmHtml,
    })

    expect(status.hasDenuvoAntiTamper).toBe(false)
    expect(status.confidence).toBe("high")
  })

  it("returns null when no signals are available", async () => {
    const status = await checkSteamDenuvo(123, {
      curatorAppids: new Set(),
      curatorComplete: false,
      fetchStorePage: async () => null,
    })

    expect(status.hasDenuvoAntiTamper).toBeNull()
    expect(status.confidence).toBe("none")
  })
})
