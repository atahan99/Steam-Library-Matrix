import { describe, expect, it } from "vitest"
import {
  hltbSeedSchema,
  protondbSeedSchema,
  topAppidsSchema,
} from "@/lib/seed/types"

describe("protondbSeedSchema", () => {
  it("accepts tier and sentinel null fields", () => {
    const parsed = protondbSeedSchema.parse({
      version: 3,
      generatedAt: new Date().toISOString(),
      items: {
        "570": {
          appid: 570,
          tier: "platinum",
          confidence: "strong",
          totalReports: 100,
          latestReportedAt: "2026-01-01T00:00:00.000Z",
          sourceUrl: "https://www.protondb.com/app/570",
          checkedAt: "2026-01-01T00:00:00.000Z",
        },
        "999999": {
          appid: 999999,
          tier: null,
          confidence: null,
          totalReports: null,
          latestReportedAt: null,
          sourceUrl: null,
          checkedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    })

    expect(parsed.items["570"].tier).toBe("platinum")
    expect(parsed.items["999999"].tier).toBeNull()
  })
})

describe("hltbSeedSchema", () => {
  it("accepts enriched and negative-cache rows", () => {
    const parsed = hltbSeedSchema.parse({
      version: 3,
      generatedAt: new Date().toISOString(),
      items: {
        "570": {
          appid: 570,
          hltbId: "1234",
          matchedName: "Dota 2",
          matchConfidence: 0.95,
          mainStoryMinutes: 6000,
          checkedAt: "2026-01-01T00:00:00.000Z",
        },
        "999999": {
          appid: 999999,
          matchedName: "[failed: no results]",
          checkedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    })

    expect(parsed.items["570"].mainStoryMinutes).toBe(6000)
    expect(parsed.items["999999"].matchedName).toContain("no results")
  })
})

describe("topAppidsSchema", () => {
  it("accepts appids with optional names map", () => {
    const parsed = topAppidsSchema.parse({
      version: 3,
      generatedAt: new Date().toISOString(),
      appids: [570, 730],
      names: { "570": "Dota 2" },
      complete: true,
    })

    expect(parsed.appids).toHaveLength(2)
    expect(parsed.names?.["570"]).toBe("Dota 2")
  })
})
