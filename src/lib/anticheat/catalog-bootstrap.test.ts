import { describe, expect, it } from "vitest"
import {
  GLOBAL_CATALOG_STEAMID,
  needsAnticheatCatalogBootstrap,
} from "@/lib/anticheat/catalog-bootstrap"

describe("needsAnticheatCatalogBootstrap", () => {
  it("returns true when AWACY is empty", () => {
    expect(
      needsAnticheatCatalogBootstrap({
        awacy: { rowCount: 0 },
        levvvel: { rowCount: 100 },
      })
    ).toBe(true)
  })

  it("returns true when Levvvel is empty", () => {
    expect(
      needsAnticheatCatalogBootstrap({
        awacy: { rowCount: 50 },
        levvvel: { rowCount: 0 },
      })
    ).toBe(true)
  })

  it("returns false when both catalogs have rows", () => {
    expect(
      needsAnticheatCatalogBootstrap({
        awacy: { rowCount: 50 },
        levvvel: { rowCount: 30 },
      })
    ).toBe(false)
  })
})

describe("GLOBAL_CATALOG_STEAMID", () => {
  it("is a fixed system id for refresh logs", () => {
    expect(GLOBAL_CATALOG_STEAMID).toBe("00000000000000000")
  })
})
