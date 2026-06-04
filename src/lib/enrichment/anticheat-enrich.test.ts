import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/steam/denuvo", () => ({
  checkSteamDenuvo: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}))

vi.mock("@/lib/anticheat/match-from-indexes", () => ({
  matchAntiCheatFromIndexes: vi.fn(() => ({
    confidence: "none",
    linuxAntiCheatStatus: undefined,
    kernelAntiCheat: undefined,
  })),
  findAwacyMatch: vi.fn(() => ({ confidence: "none" })),
  findLevvvelMatch: vi.fn(() => undefined),
  isMeaningfulAntiCheatLookup: vi.fn(() => false),
}))

import { checkSteamDenuvo } from "@/lib/steam/denuvo"
import { getDb } from "@/lib/db/client"
import { enrichSingleAnticheat } from "@/lib/enrichment/anticheat"

const mockedCheckSteamDenuvo = vi.mocked(checkSteamDenuvo)
const mockedGetDb = vi.mocked(getDb)

const context = {
  indexes: {
    awacy: { bySteamAppId: new Map(), byName: new Map(), entries: [] },
    levvvel: { byName: new Map(), rows: [] },
  },
  denuvoCatalogAppids: new Set<number>(),
  denuvoCatalogComplete: true,
} as Awaited<
  ReturnType<typeof import("@/lib/enrichment/anticheat").loadAnticheatEnrichContext>
>

describe("enrichSingleAnticheat phases", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("catalog phase does not call checkSteamDenuvo", async () => {
    mockedGetDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => ({
              all: () => [],
            }),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => Promise.resolve(),
        }),
      }),
    } as never)

    await enrichSingleAnticheat(
      { appid: 570, name: "Dota 2" },
      {
        force: true,
        context,
        delayBeforeStoreFetch: false,
        phase: "catalog",
      }
    )

    expect(mockedCheckSteamDenuvo).not.toHaveBeenCalled()
  })

  it("denuvo phase calls checkSteamDenuvo", async () => {
    mockedCheckSteamDenuvo.mockResolvedValue({
      appid: 570,
      antiTamper: null,
      sources: {},
      checkedAt: new Date().toISOString(),
    } as never)

    mockedGetDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => ({
              all: () => [],
            }),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => Promise.resolve(),
        }),
      }),
    } as never)

    await enrichSingleAnticheat(
      { appid: 570, name: "Dota 2" },
      {
        force: true,
        context,
        delayBeforeStoreFetch: false,
        phase: "denuvo",
      }
    )

    expect(mockedCheckSteamDenuvo).toHaveBeenCalledTimes(1)
  })
})
