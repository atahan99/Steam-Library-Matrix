import { describe, expect, it } from "vitest"
import {
  buildAnticheatRefreshMessage,
  dedupeCatalogErrorMessage,
  parseAnticheatCatalogErrors,
  parseLevvvelErrorFromRefreshMessage,
} from "@/lib/anticheat/refresh-message"
import {
  computeAwacyLibraryStats,
  hasMeaningfulAntiCheatData,
  isAntiCheatTableRow,
} from "@/lib/anticheat/stats"
import type { DashboardGame } from "@/types/dashboard"

const game = (overrides: Partial<DashboardGame> = {}): DashboardGame => ({
  appid: 1,
  name: "Test Game",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  ...overrides,
})

describe("computeAwacyLibraryStats", () => {
  it("counts kernel-level games across the full library", () => {
    const stats = computeAwacyLibraryStats([
      game({
        antiCheat: {
          status: "Unknown",
          kernelLevel: true,
          lastCheckedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
      game({
        appid: 2,
        antiCheat: {
          status: "Supported",
          kernelLevel: false,
          lastCheckedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    ])

    expect(stats.kernelLevel).toBe(1)
  })
})

describe("hasMeaningfulAntiCheatData", () => {
  it("excludes Unknown-only enriched rows", () => {
    expect(
      hasMeaningfulAntiCheatData(
        game({
          antiCheat: {
            status: "Unknown",
            lastCheckedAt: "2026-01-01T00:00:00.000Z",
          },
        })
      )
    ).toBe(false)
  })

  it("includes rows with anti-cheat software", () => {
    expect(
      hasMeaningfulAntiCheatData(
        game({
          antiCheat: {
            status: "Unknown",
            anticheatNames: ["Easy Anti-Cheat"],
            lastCheckedAt: "2026-01-01T00:00:00.000Z",
          },
        })
      )
    ).toBe(true)
  })

  it("includes rows with only denuvo anti-tamper decision", () => {
    expect(
      hasMeaningfulAntiCheatData(
        game({
          antiCheat: {
            denuvoAntiTamper: true,
            lastCheckedAt: "2026-01-01T00:00:00.000Z",
          },
        })
      )
    ).toBe(true)
  })
})

describe("isAntiCheatTableRow", () => {
  it("excludes kernel-no-only with Unknown status", () => {
    expect(
      isAntiCheatTableRow(
        game({
          antiCheat: {
            status: "Unknown",
            kernelLevel: false,
            lastCheckedAt: "2026-01-01T00:00:00.000Z",
          },
        })
      )
    ).toBe(false)
  })

  it("includes kernel yes", () => {
    expect(
      isAntiCheatTableRow(
        game({
          antiCheat: {
            status: "Unknown",
            kernelLevel: true,
            lastCheckedAt: "2026-01-01T00:00:00.000Z",
          },
        })
      )
    ).toBe(true)
  })

  it("includes AWACY listed status without software", () => {
    expect(
      isAntiCheatTableRow(
        game({
          antiCheat: {
            status: "Running",
            lastCheckedAt: "2026-01-01T00:00:00.000Z",
          },
        })
      )
    ).toBe(true)
  })
})

describe("refresh message helpers", () => {
  it("round-trips levvvel errors in catalog sync logs", () => {
    const message =
      "awacy=120 | levvvel=45 | levvvel_complete=false | levvvel_error=Levvvel kernel list incomplete (12 rows loaded)"

    expect(parseLevvvelErrorFromRefreshMessage(message)).toBe(
      "Levvvel kernel list incomplete (12 rows loaded)"
    )
    expect(parseAnticheatCatalogErrors(message)).toContain(
      "Levvvel kernel list incomplete (12 rows loaded)"
    )
  })

  it("includes skipped count in profile link logs", () => {
    const message = buildAnticheatRefreshMessage({
      checked: 10,
      updated: 3,
      failed: 0,
      skipped: 7,
    })

    expect(message).toContain("skipped=7")
  })

  it("dedupes repeated catalog error segments", () => {
    const duplicate =
      "Levvvel kernel list incomplete (25 rows loaded; expected 50+)"
    expect(
      dedupeCatalogErrorMessage(
        duplicate,
        `${duplicate} · ${duplicate}`
      )
    ).toBe(duplicate)
  })
})
