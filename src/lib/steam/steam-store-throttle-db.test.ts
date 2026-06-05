import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearSteamStoreCooldown,
  getSteamStoreCooldownUntil,
  reserveSteamStoreRequestSlot,
  resetSteamStoreThrottleForTests,
  SteamStoreCooldownError,
  tripSteamStoreCooldown,
} from "@/lib/steam/steam-store-throttle-db"
import { createSteamStoreThrottleTestDb } from "@/lib/steam/steam-store-throttle-test-db"
import type Database from "better-sqlite3"

vi.mock("@/lib/db/client", () => ({
  getRawSqlite: vi.fn(),
}))

import { getRawSqlite } from "@/lib/db/client"

const mockedGetRawSqlite = vi.mocked(getRawSqlite)

describe("steam store throttle db", () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = createSteamStoreThrottleTestDb()
    mockedGetRawSqlite.mockReturnValue(sqlite)
  })

  afterEach(() => {
    sqlite.close()
  })

  it("spaces reservations by the configured gap", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T00:00:00.000Z"))

    const gapMs = 100
    const firstWait = reserveSteamStoreRequestSlot(gapMs, sqlite)
    expect(firstWait).toBe(0)

    const secondWait = reserveSteamStoreRequestSlot(gapMs, sqlite)
    expect(secondWait).toBe(gapMs)

    vi.useRealTimers()
  })

  it("blocks requests while cooldown is active", () => {
    const cooldownUntil = tripSteamStoreCooldown("403", 403, sqlite)
    expect(() => reserveSteamStoreRequestSlot(50, sqlite)).toThrow(
      SteamStoreCooldownError
    )

    try {
      reserveSteamStoreRequestSlot(50, sqlite)
    } catch (error) {
      expect(error).toBeInstanceOf(SteamStoreCooldownError)
      expect((error as SteamStoreCooldownError).cooldownUntil).toBe(cooldownUntil)
    }
  })

  it("clears cooldown and block counter on success", () => {
    tripSteamStoreCooldown("429", 429, sqlite)
    clearSteamStoreCooldown(sqlite)
    resetSteamStoreThrottleForTests(sqlite)

    expect(getSteamStoreCooldownUntil(sqlite)).toBeNull()
    expect(() => reserveSteamStoreRequestSlot(50, sqlite)).not.toThrow()
  })

  it("escalates cooldown backoff on repeated trips", () => {
    const firstUntil = tripSteamStoreCooldown("403", 403, sqlite)
    const firstDuration = firstUntil - Date.now()

    sqlite
      .prepare(
        "update steam_store_throttle set consecutive_blocks = 1, cooldown_until = null where id = 'default'"
      )
      .run()

    const secondUntil = tripSteamStoreCooldown("403", 403, sqlite)
    const secondDuration = secondUntil - Date.now()

    expect(secondDuration).toBeGreaterThan(firstDuration)
  })
})
