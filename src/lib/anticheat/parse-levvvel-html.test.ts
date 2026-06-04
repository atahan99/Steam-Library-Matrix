import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { LEVVVEL_PARTIAL_ROW_THRESHOLD } from "@/lib/anticheat/anticheatTypes"
import {
  extractLevvvelNonce,
  parseLevvvelHtml,
  parseLevvvelTableRows,
  splitAntiCheatNames,
} from "@/lib/anticheat/parse-levvvel-html"

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const fixtureHtml = readFileSync(
  join(fixtureDir, "__fixtures__/levvvel-table-snippet.html"),
  "utf8"
)

describe("splitAntiCheatNames", () => {
  it("splits comma-separated values", () => {
    expect(splitAntiCheatNames("Easy Anti-Cheat, BattlEye")).toEqual([
      "Easy Anti-Cheat",
      "BattlEye",
    ])
  })

  it("splits slash-separated values", () => {
    expect(splitAntiCheatNames("Easy Anti-Cheat / BattlEye")).toEqual([
      "Easy Anti-Cheat",
      "BattlEye",
    ])
  })
})

describe("extractLevvvelNonce", () => {
  it("reads nonce when name attribute appears before value", () => {
    const html = `<input type="hidden" id="wdtNonceFrontendServerSide_20" name="wdtNonceFrontendServerSide_20" value="7e303fed52" />`
    expect(extractLevvvelNonce(html)).toBe("7e303fed52")
  })
})

describe("parseLevvvelTableRows", () => {
  it("parses enough rows to exceed the partial-load threshold", () => {
    const headers = ["wdt_ID", "Game", "Software", "Developer", "Publisher"]
    const matrix = Array.from({ length: LEVVVEL_PARTIAL_ROW_THRESHOLD + 5 }, (_, i) => [
      String(i + 1),
      `Kernel Game ${i + 1}`,
      "Easy Anti-Cheat",
      "Dev Co",
      "Pub Co",
    ])
    const rows = parseLevvvelTableRows(matrix, headers)
    expect(rows.length).toBeGreaterThanOrEqual(LEVVVEL_PARTIAL_ROW_THRESHOLD)
  })
})

describe("parseLevvvelHtml", () => {
  it("parses known kernel anti-cheat rows", () => {
    const rows = parseLevvvelHtml(fixtureHtml)
    expect(rows).toHaveLength(4)

    const sevenDays = rows.find((r) => r.name === "7 Days to Die")
    expect(sevenDays?.antiCheats).toEqual(["Easy Anti-Cheat"])
    expect(sevenDays?.developer).toBe("The Fun Pimps")
    expect(sevenDays?.publisher).toBe("The Fun Pimps")

    const apex = rows.find((r) => r.name === "Apex Legends")
    expect(apex?.antiCheats).toEqual(["Easy Anti-Cheat"])
    expect(apex?.developer).toBe("Respawn Entertainment")
    expect(apex?.publisher).toBe("Electronic Arts")

    const ark = rows.find((r) => r.name === "ARK: Survival Evolved")
    expect(ark?.antiCheats).toEqual(["BattlEye"])

    const arma = rows.find((r) => r.name === "Arma 3")
    expect(arma?.antiCheats).toEqual(["BattlEye"])
    expect(arma?.developer).toBe("Bohemia Interactive")
  })
})
