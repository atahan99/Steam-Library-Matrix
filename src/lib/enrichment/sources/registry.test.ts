import { describe, expect, it } from "vitest"
import {
  getSource,
  isRegisteredKind,
  listSources,
} from "@/lib/enrichment/sources"

describe("enrichment source registry", () => {
  it("resolves registered kinds (protondb, hltb)", () => {
    expect(isRegisteredKind("protondb")).toBe(true)
    expect(isRegisteredKind("hltb")).toBe(true)

    const proton = getSource("protondb")
    expect(proton?.kind).toBe("protondb")
    expect(proton?.label).toBe("ProtonDB")
    expect(typeof proton?.resolveTargets).toBe("function")
    expect(typeof proton?.runBatch).toBe("function")

    const hltb = getSource("hltb")
    expect(hltb?.kind).toBe("hltb")
    expect(hltb?.label).toBe("HowLongToBeat")
    expect(typeof hltb?.resolveTargets).toBe("function")
    expect(typeof hltb?.runBatch).toBe("function")
  })

  it("lists registered sources by priority", () => {
    const kinds = listSources().map((source) => source.kind)
    expect(kinds).toEqual(["protondb", "hltb"])
  })

  it("returns undefined for legacy / unregistered kinds", () => {
    expect(getSource("wishlist")).toBeUndefined()
    expect(getSource("anticheat")).toBeUndefined()
    expect(isRegisteredKind("app_details")).toBe(false)
  })
})
