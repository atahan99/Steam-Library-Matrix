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
        levvvel: { rowCount: 100, complete: true },
      })
    ).toBe(true)
  })

  it("returns true when Levvvel is empty", () => {
    expect(
      needsAnticheatCatalogBootstrap({
        awacy: { rowCount: 50 },
        levvvel: { rowCount: 0, complete: false },
      })
    ).toBe(true)
  })

  it("returns true when Denuvo is incomplete", () => {
    expect(
      needsAnticheatCatalogBootstrap({
        awacy: { rowCount: 50 },
        levvvel: { rowCount: 30, complete: true },
        denuvo: { count: 50, complete: false },
      })
    ).toBe(true)
  })

  it("returns false when AWACY, Levvvel, and Denuvo are ready", () => {
    expect(
      needsAnticheatCatalogBootstrap({
        awacy: { rowCount: 50 },
        levvvel: { rowCount: 30, complete: true },
        denuvo: { count: 376, complete: true },
      })
    ).toBe(false)
  })
})

describe("GLOBAL_CATALOG_STEAMID", () => {
  it("is a fixed system id for refresh logs", () => {
    expect(GLOBAL_CATALOG_STEAMID).toBe("00000000000000000")
  })
})
