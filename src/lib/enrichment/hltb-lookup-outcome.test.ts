import { describe, expect, it } from "vitest"
import {
  classifyHltbLookupOutcome,
  isHltbLookupResolved,
  parseHltbNegativeReason,
} from "@/lib/enrichment/hltb-lookup-outcome"
import type { DashboardGame } from "@/types/dashboard"

const game = (hltb: DashboardGame["hltb"]): DashboardGame => ({
  appid: 1,
  name: "Test",
  playtimeForeverMinutes: 0,
  playtime2WeeksMinutes: 0,
  hltb,
})

describe("hltb-lookup-outcome", () => {
  it("parses negative cache reasons", () => {
    expect(parseHltbNegativeReason("[failed: no results]")).toBe("no results")
    expect(parseHltbNegativeReason("[skipped: low confidence (52%)]")).toBe(
      "low confidence (52%)"
    )
  })

  it("treats confirmed absent lookups as resolved", () => {
    const resolved = game({
      matchedName: "[failed: no results]",
      lastCheckedAt: new Date().toISOString(),
    })

    expect(classifyHltbLookupOutcome(resolved.hltb)).toBe("confirmed_absent")
    expect(isHltbLookupResolved(resolved)).toBe(true)
  })

  it("keeps low-confidence skips retryable", () => {
    const retryable = game({
      matchedName: "[skipped: low confidence (52%)]",
      lastCheckedAt: new Date().toISOString(),
    })

    expect(classifyHltbLookupOutcome(retryable.hltb)).toBe("retryable")
    expect(isHltbLookupResolved(retryable)).toBe(false)
  })
})
