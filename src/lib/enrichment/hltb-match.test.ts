import { describe, expect, it } from "vitest"
import type { HltbSearchHit } from "@/lib/enrichment/hltb-client"
import {
  evaluateHltbDetailAcceptance,
  getBaseTitle,
  pickBestHltbHit,
  resolveHltbSearchQueries,
  stripSubtitle,
} from "@/lib/enrichment/hltb-match"

const hit = (partial: Partial<HltbSearchHit> & Pick<HltbSearchHit, "gameId" | "gameName">): HltbSearchHit => ({
  profileSteam: null,
  compMainSeconds: null,
  compPlusSeconds: null,
  comp100Seconds: null,
  compAllSeconds: null,
  compAllCount: 10,
  similarity: 0.5,
  ...partial,
})

describe("hltb-match", () => {
  it("builds multiple search queries for edition and subtitle names", () => {
    expect(resolveHltbSearchQueries("Bad North: Jotunn Edition")).toEqual(
      expect.arrayContaining(["bad north jotunn edition", "bad north"])
    )
    expect(stripSubtitle("Game Name: The Subtitle")).toBe("Game Name")
    expect(getBaseTitle("Sid Meier's Civilization IV: Colonization")).toBe(
      "sid meiers civilization iv colonization"
    )
  })

  it("prefers the steam-linked hit when present", () => {
    const result = pickBestHltbHit(
      [
        hit({ gameId: "1", gameName: "Portal", profileSteam: 400, similarity: 0.4 }),
        hit({ gameId: "2", gameName: "Portal 2", similarity: 0.99 }),
      ],
      400,
      "Portal"
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.hit.gameId).toBe("1")
      expect(result.matchedBySteamId).toBe(true)
    }
  })

  it("rejects weak token overlap matches", () => {
    const result = pickBestHltbHit(
      [
        hit({ gameId: "9", gameName: "Completely Different Game", similarity: 0.56 }),
      ],
      730,
      "Counter-Strike 2"
    )

    expect(result.ok).toBe(false)
  })

  it("accepts aligned base titles during detail validation", () => {
    const match = pickBestHltbHit(
      [hit({ gameId: "10", gameName: "BioShock", similarity: 0.8 })],
      7670,
      "BioShock"
    )
    expect(match.ok).toBe(true)
    if (!match.ok) return

    const acceptance = evaluateHltbDetailAcceptance(7670, "BioShock", match, {
      gameId: "10",
      gameName: "BioShock",
      profileSteam: null,
      platforms: [],
      mainStoryHours: 12,
      mainExtraHours: 15,
      completionistHours: 20,
      allStylesHours: 14,
    })

    expect(acceptance.ok).toBe(true)
  })
})
