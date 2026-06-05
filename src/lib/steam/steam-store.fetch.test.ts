import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"
import {
  resetSteamStoreRequestThrottleForTests,
  STEAM_STORE_USER_AGENT,
} from "@/lib/steam/steam-store-fetch"

describe("fetchSteamAppDetails", () => {
  beforeEach(() => {
    vi.stubEnv("SLM_CLI", "1")
    vi.stubEnv("SLM_STEAM_STORE_GAP_MS", "0")
    resetSteamStoreRequestThrottleForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("sends browser User-Agent and cc=us on store API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          "570": {
            success: true,
            data: { name: "Dota 2", type: "game" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchSteamAppDetails(570)

    expect(result?.name).toBe("Dota 2")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("appids=570")
    expect(url).toContain("cc=us")
    expect(init.headers).toMatchObject({
      "User-Agent": STEAM_STORE_USER_AGENT,
    })
  })

  it("retries on HTTP 429 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            "730": { success: true, data: { name: "Counter-Strike 2", type: "game" } },
          }),
          { status: 200 }
        )
      )
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchSteamAppDetails(730)

    expect(result?.name).toBe("Counter-Strike 2")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("returns null when Steam reports success:false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ "999999": { success: false } }), {
          status: 200,
        })
      )
    )

    expect(await fetchSteamAppDetails(999999)).toBeNull()
  })
})
