import { describe, expect, it } from "vitest"
import { getSource } from "@/lib/enrichment/sources"

describe("enrichment source registry", () => {
  it.each([
    ["app_details", "App details"],
    ["protondb", "ProtonDB"],
    ["achievements", "Achievements"],
    ["hltb", "HowLongToBeat"],
  ] as const)("resolves registered kind %s", (kind, label) => {
    const source = getSource(kind)
    expect(source?.kind).toBe(kind)
    expect(source?.label).toBe(label)
    expect(typeof source?.resolveTargets).toBe("function")
    expect(typeof source?.runBatch).toBe("function")
  })

  it("returns undefined for kinds with bespoke step logic", () => {
    expect(getSource("wishlist")).toBeUndefined()
    expect(getSource("anticheat")).toBeUndefined()
    expect(getSource("anticheat_catalog")).toBeUndefined()
    expect(getSource("denuvo_catalog")).toBeUndefined()
  })
})
