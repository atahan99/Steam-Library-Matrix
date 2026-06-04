import { describe, expect, it } from "vitest"
import type { DashboardGame } from "@/types/dashboard"
import {
  gameMatchesOsFilter,
  hasPlatformData,
  isLinuxSupported,
  isMacSupported,
  isWindowsSupported,
} from "@/lib/utils/platform-support"

const baseGame = (overrides?: Partial<DashboardGame>): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

describe("platform-support", () => {
  it("detects when platform data is missing", () => {
    expect(hasPlatformData(baseGame())).toBe(false)
    expect(hasPlatformData(baseGame({ steamDetails: { platforms: {} } }))).toBe(
      false
    )
    expect(
      hasPlatformData(
        baseGame({
          steamDetails: { platforms: { windows: true, linux: false, mac: false } },
        })
      )
    ).toBe(true)
  })

  it("uses windows and linux flags from app details", () => {
    const game = baseGame({
      steamDetails: {
        platforms: { windows: true, linux: false, mac: false },
      },
    })
    expect(isWindowsSupported(game)).toBe(true)
    expect(isLinuxSupported(game)).toBe(false)
  })

  it("uses platforms.mac from Steam app details for Mac support", () => {
    const macGame = baseGame({
      steamDetails: { platforms: { mac: true } },
    })
    expect(isMacSupported(macGame)).toBe(true)

    const noMac = baseGame({
      steamDetails: { platforms: { mac: false } },
    })
    expect(isMacSupported(noMac)).toBe(false)
  })
})

describe("gameMatchesOsFilter", () => {
  const windowsLinux = baseGame({
    steamDetails: {
      platforms: { windows: true, linux: true, mac: false },
    },
  })

  it("matches when no OS selected", () => {
    expect(gameMatchesOsFilter(windowsLinux, [])).toBe(true)
    expect(gameMatchesOsFilter(baseGame(), [])).toBe(true)
  })

  it("excludes games without platform data when filtering", () => {
    expect(gameMatchesOsFilter(baseGame(), ["windows"])).toBe(false)
  })

  it("matches a single selected platform", () => {
    expect(gameMatchesOsFilter(windowsLinux, ["windows"])).toBe(true)
    expect(gameMatchesOsFilter(windowsLinux, ["mac"])).toBe(false)
  })

  it("matches any selected platform (OR)", () => {
    const macOnly = baseGame({
      steamDetails: { platforms: { windows: false, linux: false, mac: true } },
    })
    expect(gameMatchesOsFilter(macOnly, ["windows", "mac"])).toBe(true)
    expect(gameMatchesOsFilter(windowsLinux, ["mac", "linux"])).toBe(true)
    expect(
      gameMatchesOsFilter(
        baseGame({
          steamDetails: { platforms: { windows: false, linux: false, mac: false } },
        }),
        ["windows", "linux"]
      )
    ).toBe(false)
  })
})
