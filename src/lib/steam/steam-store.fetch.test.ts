import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { createSteamStoreThrottleTestDb } from "@/lib/steam/steam-store-throttle-test-db"
import type Database from "better-sqlite3"

vi.mock("@/lib/db/client", () => ({
  getRawSqlite: vi.fn(),
}))

vi.mock("@/lib/env/runtime-env", () => ({
  getRuntimeEnv: (name: string) => process.env[name],
  nextFetchInit: () => ({}),
  prepareServerEnv: async () => {},
}))

import { getRawSqlite } from "@/lib/db/client"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"
import {
  resetSteamStoreRequestThrottleForTests,
  STEAM_STORE_USER_AGENT,
} from "@/lib/steam/steam-store-fetch"

const mockedGetRawSqlite = vi.mocked(getRawSqlite)

describe("fetchSteamAppDetails", () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = createSteamStoreThrottleTestDb()
    mockedGetRawSqlite.mockReturnValue(sqlite)
    vi.stubEnv("SLM_CLI", "1")
    vi.stubEnv("SLM_STEAM_STORE_GAP_MS", "0")
    resetSteamStoreRequestThrottleForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    sqlite.close()
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
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 429,
          headers: { "Retry-After": "0" },
        })
      )
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

  it("returns null immediately on HTTP 403 without retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }))
    vi.stubGlobal("fetch", fetchMock)

    expect(await fetchSteamAppDetails(730)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
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
