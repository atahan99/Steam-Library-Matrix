import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  getAllSteamAppNames,
  resetSteamAppNamesCacheForTests,
} from "@/lib/steam/steam-api"

vi.mock("@/lib/env/runtime-env", () => ({
  getRuntimeEnv: (name: string) => process.env[name],
  nextFetchInit: () => ({}),
  prepareServerEnv: async () => {},
}))

vi.mock("@/lib/utils/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
}))

import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const mockedFetch = vi.mocked(fetchWithTimeout)

describe("getAllSteamAppNames", () => {
  beforeEach(() => {
    resetSteamAppNamesCacheForTests()
    vi.stubEnv("STEAM_API_KEY", "test-key")
    mockedFetch.mockReset()
  })

  it("builds an appid to name map from GetAppList", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          response: {
            apps: [
              { appid: 570, name: "Dota 2" },
              { appid: 730, name: "Counter-Strike 2" },
            ],
          },
        }),
        { status: 200 }
      )
    )

    const names = await getAllSteamAppNames()
    expect(names.get(570)).toBe("Dota 2")
    expect(names.get(730)).toBe("Counter-Strike 2")
    expect(mockedFetch).toHaveBeenCalledTimes(1)

    await getAllSteamAppNames()
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  it("pages through GetAppList until have_more_results is false", async () => {
    const page = (
      apps: Array<{ appid: number; name: string }>,
      haveMore: boolean,
      lastAppid: number
    ) =>
      new Response(
        JSON.stringify({
          response: {
            apps,
            have_more_results: haveMore,
            last_appid: lastAppid,
          },
        }),
        { status: 200 }
      )

    mockedFetch
      .mockResolvedValueOnce(page([{ appid: 10, name: "Low App" }], true, 10))
      .mockResolvedValueOnce(
        page([{ appid: 1157390, name: "King Arthur: Knight's Tale" }], false, 0)
      )

    const names = await getAllSteamAppNames()

    // A modern appid only present on the second page must still resolve.
    expect(names.get(10)).toBe("Low App")
    expect(names.get(1157390)).toBe("King Arthur: Knight's Tale")
    expect(mockedFetch).toHaveBeenCalledTimes(2)

    // Second page request carries the last_appid cursor from the first page.
    const secondUrl = String(mockedFetch.mock.calls[1]?.[0] ?? "")
    expect(secondUrl).toContain("last_appid=10")
  })
})
