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
})
