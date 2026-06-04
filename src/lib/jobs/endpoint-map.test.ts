import { describe, expect, it } from "vitest"
import { jobKindForEndpoint } from "@/lib/jobs/endpoint-map"

describe("jobKindForEndpoint", () => {
  it("maps enrich endpoints", () => {
    expect(jobKindForEndpoint("/api/enrich/howlongtobeat")).toBe("hltb")
    expect(jobKindForEndpoint("/api/enrich/app-details")).toBe("app_details")
  })

  it("returns null for unknown paths", () => {
    expect(jobKindForEndpoint("/api/steam/import")).toBeNull()
  })
})
