import { describe, expect, it } from "vitest"
import {
  DENUVO_ANTI_CHEAT_NAME,
  DENUVO_ANTI_TAMPER_SOFTWARE_LABEL,
} from "@/lib/anticheat/denuvo"
import type { DashboardGame } from "@/types/dashboard"
import {
  buildAntiCheatSoftwareFilterOptions,
  filterAntiCheatTableGames,
  getDisplayAntiCheatSoftwareNames,
} from "@/lib/utils/anticheat-table-filter"

const game = (overrides: Partial<DashboardGame>): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

const unenriched = game({ appid: 1, name: "Plain" })

const unknownOnly = game({
  appid: 2,
  name: "Unknown AC",
  antiCheat: {
    status: "Unknown",
    lastCheckedAt: "2026-01-01T00:00:00.000Z",
  },
})

const withSoftware = game({
  appid: 3,
  name: "EAC Game",
  antiCheat: {
    status: "Supported",
    anticheatNames: ["Easy Anti-Cheat"],
    lastCheckedAt: "2026-01-01T00:00:00.000Z",
  },
})

const awacyOnly = game({
  appid: 4,
  name: "AWACY Running",
  antiCheat: {
    status: "Running",
    lastCheckedAt: "2026-01-01T00:00:00.000Z",
  },
})

const defaultFilters = {
  search: "",
  linuxStatus: "all",
  hasAntiCheat: "all" as const,
  software: [] as string[],
  kernelFilter: "all" as const,
  playedOnly: false,
}

describe("filterAntiCheatTableGames", () => {
  it("excludes unenriched and Unknown-only games from the table pool", () => {
    const result = filterAntiCheatTableGames(
      [unenriched, unknownOnly, withSoftware, awacyOnly],
      defaultFilters,
      { pool: "table" }
    )
    expect(result.map((g) => g.appid)).toEqual([3, 4])
  })

  it("excludes kernel-no-only rows from the table pool", () => {
    const noKernel = game({
      appid: 5,
      name: "No Kernel",
      antiCheat: {
        status: "Unknown",
        kernelLevel: false,
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    const result = filterAntiCheatTableGames(
      [withSoftware, noKernel],
      defaultFilters,
      { pool: "table" }
    )
    expect(result.map((g) => g.appid)).toEqual([3])
  })

  it("filters by Linux status within the anti-cheat subset", () => {
    const result = filterAntiCheatTableGames([withSoftware, awacyOnly], {
      ...defaultFilters,
      linuxStatus: "Supported",
    })
    expect(result.map((g) => g.appid)).toEqual([3])
  })

  it("filters by single anti-cheat software name", () => {
    const result = filterAntiCheatTableGames([withSoftware, awacyOnly], {
      ...defaultFilters,
      hasAntiCheat: "yes",
      software: ["Easy Anti-Cheat"],
    })
    expect(result.map((g) => g.appid)).toEqual([3])
  })

  it("filters by multiple software names (OR)", () => {
    const withBattlEye = game({
      appid: 9,
      name: "BE Game",
      antiCheat: {
        status: "Broken",
        anticheatNames: ["BattlEye"],
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    const result = filterAntiCheatTableGames(
      [withSoftware, withBattlEye, awacyOnly],
      {
        ...defaultFilters,
        software: ["Easy Anti-Cheat", "BattlEye"],
      }
    )
    expect(result.map((g) => g.appid)).toEqual([3, 9])
  })

  it("filters kernel=no when pool is meaningful", () => {
    const noKernel = game({
      appid: 5,
      name: "No Kernel",
      antiCheat: {
        status: "Unknown",
        kernelLevel: false,
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    const result = filterAntiCheatTableGames([withSoftware, noKernel], {
      ...defaultFilters,
      kernelFilter: "no",
    }, { pool: "meaningful" })
    expect(result.map((g) => g.appid)).toEqual([5])
  })

  it("includes inconclusive checked games when pool is checked", () => {
    const inconclusive = game({
      appid: 8,
      name: "Inconclusive",
      antiCheat: {
        status: "Unknown",
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    const result = filterAntiCheatTableGames([inconclusive], defaultFilters, {
      pool: "checked",
    })
    expect(result.map((g) => g.appid)).toEqual([8])
  })

  it("filters denuvo anti-tamper via software multiselect", () => {
    const withTamper = game({
      appid: 6,
      name: "Denuvo Game",
      antiCheat: {
        denuvoAntiTamper: true,
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    const result = filterAntiCheatTableGames([withSoftware, withTamper], {
      ...defaultFilters,
      software: [DENUVO_ANTI_TAMPER_SOFTWARE_LABEL],
    })
    expect(result.map((g) => g.appid)).toEqual([6])
  })

  it("filters denuvo anti-cheat via software multiselect", () => {
    const withDac = game({
      appid: 7,
      name: "DAC Game",
      antiCheat: {
        denuvoAntiCheat: true,
        lastCheckedAt: "2026-01-01T00:00:00.000Z",
      },
    })
    const result = filterAntiCheatTableGames([withSoftware, withDac], {
      ...defaultFilters,
      software: [DENUVO_ANTI_CHEAT_NAME],
    })
    expect(result.map((g) => g.appid)).toEqual([7])
  })
})

describe("getDisplayAntiCheatSoftwareNames", () => {
  it("includes denuvo anti-tamper in software display", () => {
    const names = getDisplayAntiCheatSoftwareNames(
      game({
        antiCheat: {
          denuvoAntiTamper: true,
          lastCheckedAt: "2026-01-01T00:00:00.000Z",
        },
      })
    )
    expect(names).toContain(DENUVO_ANTI_TAMPER_SOFTWARE_LABEL)
  })
})

describe("buildAntiCheatSoftwareFilterOptions", () => {
  it("always includes denuvo options in the software dropdown", () => {
    const options = buildAntiCheatSoftwareFilterOptions([])
    expect(options.map((o) => o.value)).toEqual(
      expect.arrayContaining([
        DENUVO_ANTI_TAMPER_SOFTWARE_LABEL,
        DENUVO_ANTI_CHEAT_NAME,
      ])
    )
  })
})
