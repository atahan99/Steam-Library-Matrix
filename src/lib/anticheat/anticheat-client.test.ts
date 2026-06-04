import { describe, expect, it } from "vitest"
import {
  indexAwacyEntries,
  indexLevvvelRows,
  normalizeAwacyStatus,
} from "@/lib/anticheat/anticheatClient"
import type { AwacyNormalizedEntry } from "@/lib/anticheat/anticheatTypes"

describe("normalizeAwacyStatus", () => {
  it("returns Unknown for invalid status", () => {
    expect(normalizeAwacyStatus("")).toBe("Unknown")
    expect(normalizeAwacyStatus("Maybe")).toBe("Unknown")
  })

  it("preserves known statuses", () => {
    expect(normalizeAwacyStatus("Supported")).toBe("Supported")
  })
})

describe("anti-cheat indexes", () => {
  it("indexes AWACY by steam app id", () => {
    const entries: AwacyNormalizedEntry[] = [
      {
        source: "areweanticheatyet",
        name: "Halo: The Master Chief Collection",
        normalizedName: "halo the master chief collection",
        steamAppId: "976730",
        status: "Supported",
        antiCheats: ["Easy Anti-Cheat"],
        notes: [],
        updates: [],
        slug: "halo-the-master-chief-collection",
      },
    ]
    const { bySteamAppId } = indexAwacyEntries(entries)
    expect(bySteamAppId.get("976730")?.name).toContain("Halo")
  })

  it("indexes Levvvel by normalized title", () => {
    const { byName } = indexLevvvelRows(
      [
        {
          source: "levvvel",
          name: "Apex Legends",
          normalizedName: "apex legends",
          kernelLevel: true,
          antiCheats: ["Easy Anti-Cheat"],
        },
      ],
      false
    )
    expect(byName.get("apex legends")?.antiCheats).toEqual(["Easy Anti-Cheat"])
  })
})
