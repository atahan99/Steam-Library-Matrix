import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({ getDb: vi.fn() }))

import { parseSteamSpyAppDetails } from "@/lib/enrichment/steamspy"

describe("parseSteamSpyAppDetails", () => {
  it("reads reviews, owners, players and the top tags by votes", () => {
    const summary = parseSteamSpyAppDetails({
      appid: 1091500,
      name: "Cyberpunk 2077",
      positive: 713071,
      negative: 131850,
      owners: "20,000,000 .. 50,000,000",
      ccu: 22265,
      tags: { RPG: 5037, Cyberpunk: 6625, "Open World": 6081 },
    })
    expect(summary).toEqual({
      positive: 713071,
      negative: 131850,
      owners: "20,000,000 .. 50,000,000",
      ccu: 22265,
      tags: ["Cyberpunk", "Open World", "RPG"],
    })
  })

  it("treats SteamSpy's unknown-app answer (name: null) as not found", () => {
    expect(
      parseSteamSpyAppDetails({ appid: 99999999, name: null, positive: 0, tags: [] })
    ).toBeNull()
  })

  it("handles an empty tags array and junk counts", () => {
    expect(
      parseSteamSpyAppDetails({ name: "Tiny", positive: "12", negative: null, ccu: -1, tags: [] })
    ).toMatchObject({ positive: 12, negative: 0, ccu: 0, tags: [], owners: null })
  })
})
