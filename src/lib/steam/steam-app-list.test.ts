import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/env/runtime-env", () => ({
  getRuntimeEnv: (name: string) => process.env[name],
  nextFetchInit: () => ({}),
  prepareServerEnv: async () => {},
}))

vi.mock("@/lib/utils/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn(),
}))

import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"
import {
  getSteamAppName,
  resetSteamAppListCacheForTests,
} from "@/lib/steam/steam-app-list"

const mockedFetch = vi.mocked(fetchWithTimeout)

const mockAppListResponse = () =>
  new Response(
    JSON.stringify({
      applist: {
        apps: [
          { appid: 570, name: "Dota 2" },
          { appid: 2999990, name: "Half-Life 3" },
        ],
      },
    }),
    { status: 200 }
  )

describe("getSteamAppName", () => {
  beforeEach(() => {
    resetSteamAppListCacheForTests()
    vi.stubEnv("STEAM_API_KEY", "test-key")
    mockedFetch.mockReset()
    mockedFetch.mockResolvedValue(mockAppListResponse())
  })

  it("returns a name from GetAppList v2", async () => {
    await expect(getSteamAppName(2999990)).resolves.toBe("Half-Life 3")
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  it("fetches GetAppList at most once per TTL for concurrent callers", async () => {
    const [first, second, third] = await Promise.all([
      getSteamAppName(570),
      getSteamAppName(2999990),
      getSteamAppName(570),
    ])

    expect(first).toBe("Dota 2")
    expect(second).toBe("Half-Life 3")
    expect(third).toBe("Dota 2")
    expect(mockedFetch).toHaveBeenCalledTimes(1)

    await getSteamAppName(570)
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  it("returns null when GetAppList fetch fails", async () => {
    mockedFetch.mockRejectedValue(new Error("network down"))

    await expect(getSteamAppName(570)).resolves.toBeNull()
    await expect(getSteamAppName(570)).resolves.toBeNull()
    expect(mockedFetch).toHaveBeenCalledTimes(2)
  })

  it("returns null for unknown appids", async () => {
    await expect(getSteamAppName(999999999)).resolves.toBeNull()
  })
})
