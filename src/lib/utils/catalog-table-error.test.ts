import { describe, expect, it } from "vitest"
import {
  formatDbError,
  isMissingCatalogTableError,
} from "@/lib/db/catalog-table-error"

describe("formatDbError", () => {
  it("reads sqlite error messages", () => {
    expect(
      formatDbError({
        message: 'no such table: anticheat_catalog_meta',
        code: "SQLITE_ERROR",
      })
    ).toContain("no such table")
  })
})

describe("isMissingCatalogTableError", () => {
  it("detects sqlite missing table errors", () => {
    expect(
      isMissingCatalogTableError({
        message: 'no such table: denuvo_anti_tamper_catalog',
        code: "SQLITE_ERROR",
      })
    ).toBe(true)
  })

  it("detects sqlite missing column errors", () => {
    expect(
      isMissingCatalogTableError({
        message: "no such column: steam_app_details.releaseDate",
        code: "SQLITE_ERROR",
      })
    ).toBe(true)
  })

  it("returns false for unrelated errors", () => {
    expect(isMissingCatalogTableError(new Error("timeout"))).toBe(false)
  })
})
