import { describe, expect, it } from "vitest"
import { buildCsvContent, buildJsonContent } from "@/lib/utils/export-table-csv"

describe("buildCsvContent", () => {
  it("escapes commas and quotes", () => {
    const csv = buildCsvContent(
      ["Name", "Note"],
      [["Game, The", 'Say "hi"']]
    )
    expect(csv).toBe('Name,Note\n"Game, The","Say ""hi"""')
  })
})

describe("buildJsonContent", () => {
  it("maps headers to row objects", () => {
    const json = buildJsonContent(
      ["Name", "AppID"],
      [["Half-Life", 70]]
    )
    expect(JSON.parse(json)).toEqual([{ Name: "Half-Life", AppID: 70 }])
  })

  it("uses null for missing cells", () => {
    const json = buildJsonContent(["Name", "Note"], [["Game"]])
    expect(JSON.parse(json)).toEqual([{ Name: "Game", Note: null }])
  })
})
