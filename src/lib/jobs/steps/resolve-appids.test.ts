import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/enrichment/resolve-enrichment-appids", () => ({
  resolveAppidsForSource: vi.fn(),
}))

import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import {
  resolveAppDetailsAppids,
  resolveHltbAppids,
} from "@/lib/jobs/steps/resolve-appids"

const mockedResolve = vi.mocked(resolveAppidsForSource)

describe("resolve-appids delegates", () => {
  it("delegates app_details resolution", async () => {
    mockedResolve.mockResolvedValue([1, 2])
    const appids = await resolveAppDetailsAppids("76561198000000001", false)
    expect(appids).toEqual([1, 2])
    expect(mockedResolve).toHaveBeenCalledWith("app_details", {
      steamid: "76561198000000001",
      force: false,
      scopeAppids: undefined,
    })
  })

  it("passes scopeAppids for app_details resolution", async () => {
    mockedResolve.mockResolvedValue([3])
    await resolveAppDetailsAppids("76561198000000001", true, [3, 4])
    expect(mockedResolve).toHaveBeenCalledWith("app_details", {
      steamid: "76561198000000001",
      force: true,
      scopeAppids: [3, 4],
    })
  })

  it("delegates hltb resolution", async () => {
    mockedResolve.mockResolvedValue([{ appid: 7, name: "Seven" }])
    const rows = await resolveHltbAppids("76561198000000001", {
      force: true,
      missingOnly: false,
    })
    expect(rows).toEqual([{ appid: 7, name: "Seven" }])
    expect(mockedResolve).toHaveBeenCalledWith("hltb", {
      steamid: "76561198000000001",
      force: true,
      missingOnly: false,
      scopeAppids: undefined,
    })
  })
})
