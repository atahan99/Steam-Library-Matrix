import { describe, expect, it } from "vitest"
import {
  buildDashboardNavHref,
  dashboardSectionNavItems,
  dashboardTableNavItems,
} from "@/lib/dashboard/dashboard-nav"

describe("dashboard-nav", () => {
  it("table nav items are searchable section pages only", () => {
    expect(dashboardTableNavItems).toHaveLength(7)
    expect(dashboardTableNavItems.every((item) => item.supportsGameSearch)).toBe(
      true
    )
    expect(
      dashboardTableNavItems.map((item) => item.segment).sort()
    ).toEqual(
      [
        "achievements",
        "anticheat",
        "howlongtobeat",
        "library",
        "mac",
        "protondb",
        "vr",
      ].sort()
    )
  })

  it("builds overview href without query", () => {
    const overview = dashboardSectionNavItems[0]
    expect(
      buildDashboardNavHref("123", overview, {
        name: "Baldur's Gate 3",
        appid: 1086940,
      })
    ).toBe("/dashboard/123")
  })

  it("builds searchable page href with encoded game name and appid", () => {
    const library = dashboardSectionNavItems.find((item) => item.segment === "library")
    expect(library).toBeDefined()
    expect(
      buildDashboardNavHref("123", library!, {
        name: "Baldur's Gate 3",
        appid: 1086940,
      })
    ).toBe("/dashboard/123/library?q=Baldur%27s+Gate+3&game=1086940")
  })
})
