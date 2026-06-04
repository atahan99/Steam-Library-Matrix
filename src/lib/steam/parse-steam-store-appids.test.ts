import { describe, expect, it } from "vitest"
import {
  parseSteamStoreAppidsFromHtml,
  parseSteamStoreTotalCountFromHtml,
} from "@/lib/steam/parse-steam-store-appids"

describe("parseSteamStoreAppidsFromHtml", () => {
  it("extracts app ids from curator-style html", () => {
    const html = `
      <a href="/app/4084710/test/">Game</a>
      <div data-ds-appid="3768760"></div>
    `
    expect(parseSteamStoreAppidsFromHtml(html).sort((a, b) => a - b)).toEqual([
      3768760, 4084710,
    ])
  })
})

describe("parseSteamStoreTotalCountFromHtml", () => {
  it("reads total_count from embedded json", () => {
    const html = `{"total_count":374,"results_html":""}`
    expect(parseSteamStoreTotalCountFromHtml(html)).toBe(374)
  })
})
