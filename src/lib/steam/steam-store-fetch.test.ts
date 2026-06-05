import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSteamStoreThrottleTestDb } from "@/lib/steam/steam-store-throttle-test-db"
import type Database from "better-sqlite3"

vi.mock("@/lib/db/client", () => ({
  getRawSqlite: vi.fn(),
}))

vi.mock("@/lib/env/runtime-env", () => ({
  getRuntimeEnv: (name: string) => process.env[name],
  nextFetchInit: () => ({}),
}))

import { getRawSqlite } from "@/lib/db/client"
import {
  getSteamStoreRequestGapMs,
  resetSteamStoreRequestThrottleForTests,
  waitForSteamStoreRequestSlot,
} from "@/lib/steam/steam-store-fetch"
import { tripSteamStoreCooldown } from "@/lib/steam/steam-store-throttle-db"
import { SteamStoreCooldownError } from "@/lib/steam/steam-store-throttle-db"

const mockedGetRawSqlite = vi.mocked(getRawSqlite)

describe("waitForSteamStoreRequestSlot", () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = createSteamStoreThrottleTestDb()
    mockedGetRawSqlite.mockReturnValue(sqlite)
    vi.stubEnv("SLM_STEAM_STORE_GAP_MS", "50")
    resetSteamStoreRequestThrottleForTests()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    resetSteamStoreRequestThrottleForTests()
    sqlite.close()
  })

  it("spaces consecutive store requests by the configured gap", async () => {
    expect(getSteamStoreRequestGapMs()).toBe(50)

    const first = waitForSteamStoreRequestSlot()
    await vi.runAllTimersAsync()
    await first

    const second = waitForSteamStoreRequestSlot()
    await vi.advanceTimersByTimeAsync(49)
    let secondDone = false
    void second.then(() => {
      secondDone = true
    })
    await Promise.resolve()
    expect(secondDone).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await second
    expect(secondDone).toBe(true)
  })

  it("rejects while cooldown is active", async () => {
    tripSteamStoreCooldown("403", 403, sqlite)

    await expect(waitForSteamStoreRequestSlot()).rejects.toBeInstanceOf(
      SteamStoreCooldownError
    )
  })
})
