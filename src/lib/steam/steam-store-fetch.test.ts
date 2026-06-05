import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getSteamStoreRequestGapMs,
  resetSteamStoreRequestThrottleForTests,
  waitForSteamStoreRequestSlot,
} from "@/lib/steam/steam-store-fetch"

vi.mock("@/lib/env/runtime-env", () => ({
  getRuntimeEnv: (name: string) => process.env[name],
  nextFetchInit: () => ({}),
}))

describe("waitForSteamStoreRequestSlot", () => {
  beforeEach(() => {
    vi.stubEnv("SLM_STEAM_STORE_GAP_MS", "50")
    resetSteamStoreRequestThrottleForTests()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    resetSteamStoreRequestThrottleForTests()
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
})
