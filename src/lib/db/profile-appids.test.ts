import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(),
}))

import { getDb } from "@/lib/db/client"
import { getUnionProfileAppids } from "@/lib/db/profile-appids"

const mockedGetDb = vi.mocked(getDb)

const makeSelectChain = (rows: { appid: number }[]) => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  }
  return chain
}

describe("getUnionProfileAppids", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty list for no steamids", async () => {
    await expect(getUnionProfileAppids([])).resolves.toEqual([])
    expect(mockedGetDb).not.toHaveBeenCalled()
  })

  it("dedupes appids across profiles and wishlists", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(
        makeSelectChain([{ appid: 10 }, { appid: 20 }, { appid: 10 }])
      )
      .mockReturnValueOnce(makeSelectChain([{ appid: 20 }, { appid: 30 }]))

    mockedGetDb.mockReturnValue({ select } as never)

    const appids = await getUnionProfileAppids([
      "76561198000000001",
      "76561198000000002",
    ])

    expect(appids).toEqual([10, 20, 30])
    expect(select).toHaveBeenCalledTimes(2)
  })
})
