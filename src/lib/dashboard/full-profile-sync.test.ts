import { describe, expect, it } from "vitest"
import {
  FAST_SYNC_JOB_ORDER,
  FULL_SYNC_JOB_ORDER,
  SLOW_SYNC_JOB_ORDER,
} from "@/lib/dashboard/full-profile-sync"

describe("profile sync job tiers", () => {
  it("FAST tier excludes hltb", () => {
    expect(FAST_SYNC_JOB_ORDER).not.toContain("hltb")
    expect(FAST_SYNC_JOB_ORDER).toEqual([
      "anticheat_catalog",
      "wishlist",
      "achievements",
      "anticheat",
      "protondb",
      "app_details",
    ])
  })

  it("SLOW tier is hltb only", () => {
    expect(SLOW_SYNC_JOB_ORDER).toEqual(["hltb"])
  })

  it("FULL sync is FAST + SLOW", () => {
    expect(FULL_SYNC_JOB_ORDER).toEqual([
      ...FAST_SYNC_JOB_ORDER,
      ...SLOW_SYNC_JOB_ORDER,
    ])
  })

  it("queues catalog before profile anti-cheat", () => {
    const catalogIdx = FULL_SYNC_JOB_ORDER.indexOf("anticheat_catalog")
    const profileIdx = FULL_SYNC_JOB_ORDER.indexOf("anticheat")
    expect(catalogIdx).toBeGreaterThanOrEqual(0)
    expect(profileIdx).toBeGreaterThan(catalogIdx)
  })
})
