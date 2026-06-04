import { describe, expect, it } from "vitest"
import { buildLevvvelWpDataTablesPostBody } from "@/lib/anticheat/anticheatClient"

describe("buildLevvvelWpDataTablesPostBody", () => {
  it("uses wpDataTables wdtNonce and column names", () => {
    const body = buildLevvvelWpDataTablesPostBody(0, 250, "abc123")
    const params = new URLSearchParams(body)

    expect(params.get("wdtNonce")).toBe("abc123")
    expect(params.get("wdtNonceFrontendServerSide_20")).toBeNull()
    expect(params.get("sRangeSeparator")).toBe("|")
    expect(params.get("columns[1][name]")).toBe("game")
    expect(params.get("columns[2][name]")).toBe("software")
    expect(params.get("start")).toBe("0")
    expect(params.get("length")).toBe("250")
  })
})
