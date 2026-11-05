import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.hoisted(() => vi.fn())
vi.mock("@/lib/utils/fetch-with-timeout", () => ({ fetchWithTimeout: fetchMock }))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

// Homepage with no scripts -> default api path, then init returns auth, search returns data.
const route = (searchStatuses: number[]) => {
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "https://howlongtobeat.com/") return new Response("<html></html>")
    if (url.includes("/init")) return json({ token: "t", hpKey: "k", hpVal: "v" })
    return json({ data: [] }, searchStatuses.shift() ?? 200)
  })
}

const homepageFetches = () =>
  fetchMock.mock.calls.filter(([url]) => url === "https://howlongtobeat.com/").length

describe("hltb-client session", () => {
  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
  })

  it("shares one session refresh across concurrent searches", async () => {
    route([])
    const { searchHltbGames } = await import("@/lib/enrichment/hltb-client")
    await Promise.all([searchHltbGames("a"), searchHltbGames("b"), searchHltbGames("c")])
    expect(homepageFetches()).toBe(1)
  })

  it("drops the cached session on 403 and refetches it", async () => {
    route([403])
    const { searchHltbGames } = await import("@/lib/enrichment/hltb-client")
    await expect(searchHltbGames("a")).resolves.toEqual([])
    expect(homepageFetches()).toBe(2)
  })
})
