import { describe, expect, it } from "vitest"
import { checkSteamDenuvo } from "@/lib/steam/denuvo/check-steam-denuvo"

describe("checkSteamDenuvo live (real Steam store pages)", () => {
  it(
    "detects Denuvo on Hogwarts Legacy from store page HTML",
    async () => {
      const status = await checkSteamDenuvo(990080, {
        curatorAppids: new Set(),
        curatorComplete: false,
      })

      expect(status.hasDenuvoAntiTamper).toBe(true)
      expect(status.confidence).toBe("high")
      expect(status.thirdPartyDrm.some((d) => /denuvo/i.test(d))).toBe(true)
      expect(status.drmNotices.length).toBeGreaterThan(0)
      expect(status.sources.find((s) => s.source === "store_page")?.matched).toBe(
        true
      )
    },
    30_000
  )

  it(
    "returns no Denuvo for Dota 2 when store page is checked",
    async () => {
      const status = await checkSteamDenuvo(570, {
        curatorAppids: new Set(),
        curatorComplete: true,
      })

      expect(status.hasDenuvoAntiTamper).toBe(false)
      expect(status.confidence).toBe("high")
    },
    30_000
  )

  it(
    "falls back to curator when store fetch is unavailable",
    async () => {
      const status = await checkSteamDenuvo(990080, {
        curatorAppids: new Set([990080]),
        curatorComplete: true,
        fetchStorePage: async () => null,
      })

      expect(status.hasDenuvoAntiTamper).toBe(true)
      expect(status.confidence).toBe("medium")
      expect(status.sources.find((s) => s.source === "curator")?.matched).toBe(
        true
      )
    },
    10_000
  )
})
