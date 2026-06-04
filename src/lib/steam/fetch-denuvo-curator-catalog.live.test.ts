import { describe, expect, it } from "vitest"
import { fetchDenuvoCuratorCatalog } from "@/lib/steam/fetch-denuvo-curator-catalog"

describe("fetchDenuvoCuratorCatalog live", () => {
  it("loads Denuvo Watch curator appids from Steam AJAX", async () => {
    const result = await fetchDenuvoCuratorCatalog()
    expect(result.appids.length).toBeGreaterThan(50)
    expect(result.reportedTotal).toBeGreaterThan(100)
    expect(result.complete).toBe(true)
  }, 120000)
})
