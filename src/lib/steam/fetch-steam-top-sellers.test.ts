import { describe, expect, it } from "vitest"
import { parseSteamStoreAppNamesFromHtml } from "@/lib/steam/fetch-steam-top-sellers"

describe("parseSteamStoreAppNamesFromHtml", () => {
  it("extracts appid and title from search_result_row markup", () => {
    const html = `
      <a class="search_result_row" data-ds-appid="570" href="/app/570/">
        <span class="title">Dota 2</span>
      </a>
      <a class="search_result_row" data-ds-appid="730" href="/app/730/">
        <span class="title">Counter-Strike 2</span>
      </a>
    `

    expect(parseSteamStoreAppNamesFromHtml(html)).toEqual({
      "570": "Dota 2",
      "730": "Counter-Strike 2",
    })
  })
})
