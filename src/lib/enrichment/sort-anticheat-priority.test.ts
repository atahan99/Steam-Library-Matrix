import { describe, expect, it } from "vitest"
import { sortAnticheatByPriority } from "@/lib/enrichment/sort-anticheat-priority"

describe("sortAnticheatByPriority", () => {
  it("prioritizes scope appids first", () => {
    const sorted = sortAnticheatByPriority(
      [
        { appid: 3, denuvoAntiTamper: null },
        { appid: 1, denuvoAntiTamper: null },
        { appid: 2, denuvoAntiTamper: true, denuvoConfidence: "high" },
      ],
      { scopeAppids: [2] }
    )

    expect(sorted.map((row) => row.appid)).toEqual([2, 1, 3])
  })

  it("prioritizes missing denuvo data before stale high confidence", () => {
    const sorted = sortAnticheatByPriority([
      {
        appid: 10,
        denuvoAntiTamper: true,
        denuvoConfidence: "high",
        denuvoCheckedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
      { appid: 20, denuvoAntiTamper: null, denuvoConfidence: null },
    ])

    expect(sorted[0]?.appid).toBe(20)
  })
})
