import { describe, expect, it } from "vitest"
import {
  buildAntiCheatLookupResult,
  isMeaningfulAntiCheatLookup,
  matchAntiCheatFromIndexes,
} from "@/lib/anticheat/match-from-indexes"
import {
  indexAwacyEntries,
  indexLevvvelRows,
} from "@/lib/anticheat/anticheat-indexes"
import type { AwacyNormalizedEntry } from "@/lib/anticheat/anticheatTypes"

const awacyEntry = (
  overrides: Partial<AwacyNormalizedEntry> = {}
): AwacyNormalizedEntry => ({
  source: "areweanticheatyet",
  name: "Halo: The Master Chief Collection",
  normalizedName: "halo the master chief collection",
  steamAppId: "976730",
  status: "Supported",
  antiCheats: ["Easy Anti-Cheat"],
  notes: [],
  updates: [],
  slug: "halo-the-master-chief-collection",
  ...overrides,
})

describe("matchAntiCheatFromIndexes", () => {
  it("matches AWACY by steam app id", () => {
    const awacy = indexAwacyEntries([awacyEntry()])
    const levvvel = indexLevvvelRows([], true)

    const result = matchAntiCheatFromIndexes(
      awacy,
      levvvel,
      "Wrong Name",
      976730
    )

    expect(result.confidence).toBe("appid")
    expect(result.linuxAntiCheatStatus?.status).toBe("Supported")
  })

  it("sets kernel_level false only when levvvel catalog is complete", () => {
    const awacy = indexAwacyEntries([])
    const incomplete = indexLevvvelRows([], false)
    const complete = indexLevvvelRows([], true)

    const incompleteResult = buildAntiCheatLookupResult(
      "Unknown Game",
      "1",
      undefined,
      "none",
      undefined,
      incomplete.complete
    )
    const completeResult = buildAntiCheatLookupResult(
      "Unknown Game",
      "1",
      undefined,
      "none",
      undefined,
      complete.complete
    )

    expect(incompleteResult.kernelAntiCheat).toBeUndefined()
    expect(completeResult.kernelAntiCheat?.hasKernelLevelAntiCheat).toBe(false)
  })
})

describe("isMeaningfulAntiCheatLookup", () => {
  it("returns false for empty lookups when levvvel is incomplete", () => {
    const awacy = indexAwacyEntries([])
    const levvvel = indexLevvvelRows([], false)
    const result = matchAntiCheatFromIndexes(
      awacy,
      levvvel,
      "Some Game",
      123
    )
    expect(isMeaningfulAntiCheatLookup(result)).toBe(false)
  })

  it("returns true when levvvel catalog is complete and game is not kernel", () => {
    const awacy = indexAwacyEntries([])
    const levvvel = indexLevvvelRows([], true)
    const result = matchAntiCheatFromIndexes(
      awacy,
      levvvel,
      "Some Game",
      123
    )
    expect(isMeaningfulAntiCheatLookup(result)).toBe(true)
  })
})
