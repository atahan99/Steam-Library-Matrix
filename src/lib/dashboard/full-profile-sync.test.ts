import { describe, expect, it } from "vitest"
import {
  FAST_SYNC_JOB_ORDER,
  FULL_SYNC_JOB_ORDER,
  SLOW_SYNC_JOB_ORDER,
} from "@/lib/dashboard/full-profile-sync"

describe("profile sync job tiers", () => {
  it("import tier includes hltb before app_details", () => {
    expect(FAST_SYNC_JOB_ORDER).toContain("hltb")
    const hltbIdx = FAST_SYNC_JOB_ORDER.indexOf("hltb")
    const protonIdx = FAST_SYNC_JOB_ORDER.indexOf("protondb")
    const appDetailsIdx = FAST_SYNC_JOB_ORDER.indexOf("app_details")
    expect(protonIdx).toBeLessThan(hltbIdx)
    expect(hltbIdx).toBeLessThan(appDetailsIdx)
    expect(FAST_SYNC_JOB_ORDER).toEqual([
      "anticheat_catalog",
      "denuvo_catalog",
      "wishlist",
      "achievements",
      "anticheat",
      "protondb",
      "hltb",
      "app_details",
    ])
  })

  it("SLOW tier is empty (HLTB moved to import tier)", () => {
    expect(SLOW_SYNC_JOB_ORDER).toEqual([])
  })

  it("FULL sync matches import tier", () => {
    expect(FULL_SYNC_JOB_ORDER).toEqual([...FAST_SYNC_JOB_ORDER])
  })

  it("queues catalog before profile anti-cheat", () => {
    const catalogIdx = FULL_SYNC_JOB_ORDER.indexOf("anticheat_catalog")
    const profileIdx = FULL_SYNC_JOB_ORDER.indexOf("anticheat")
    expect(catalogIdx).toBeGreaterThanOrEqual(0)
    expect(profileIdx).toBeGreaterThan(catalogIdx)
  })
})
