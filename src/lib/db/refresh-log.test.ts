import { describe, expect, it, vi, beforeEach } from "vitest"
import { getLatestRefreshLogBySource } from "@/lib/db/refresh-log"

const mockOrderBy = vi.fn()
const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
const mockSelect = vi.fn(() => ({ from: mockFrom }))

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    select: mockSelect,
  }),
}))

describe("getLatestRefreshLogBySource", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the latest row per source", async () => {
    mockOrderBy.mockResolvedValue([
      {
        source: "anticheat_catalog",
        status: "failed",
        message: "Levvvel fetch failed",
        startedAt: new Date("2026-06-05T12:00:00Z"),
        finishedAt: new Date("2026-06-05T12:01:00Z"),
        steamid: "76561198000000001",
      },
      {
        source: "anticheat_catalog",
        status: "success",
        message: null,
        startedAt: new Date("2026-06-04T12:00:00Z"),
        finishedAt: new Date("2026-06-04T12:01:00Z"),
        steamid: "76561198000000001",
      },
      {
        source: "denuvo_catalog",
        status: "success",
        message: null,
        startedAt: new Date("2026-06-05T11:00:00Z"),
        finishedAt: new Date("2026-06-05T11:02:00Z"),
        steamid: "76561198000000001",
      },
    ])

    const rows = await getLatestRefreshLogBySource("76561198000000001")

    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.source === "anticheat_catalog")).toMatchObject({
      status: "failed",
      message: "Levvvel fetch failed",
    })
    expect(rows.find((r) => r.source === "denuvo_catalog")?.status).toBe(
      "success"
    )
  })

  it("scopes profile-only sources to the given steamid", async () => {
    mockOrderBy.mockResolvedValue([
      {
        source: "anticheat",
        status: "failed",
        message: "profile B error",
        startedAt: new Date("2026-06-05T13:00:00Z"),
        finishedAt: new Date("2026-06-05T13:01:00Z"),
        steamid: "76561198000000002",
      },
      {
        source: "anticheat",
        status: "success",
        message: null,
        startedAt: new Date("2026-06-05T12:00:00Z"),
        finishedAt: new Date("2026-06-05T12:01:00Z"),
        steamid: "76561198000000001",
      },
    ])

    const rows = await getLatestRefreshLogBySource("76561198000000001")

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      source: "anticheat",
      status: "success",
    })
  })
})
