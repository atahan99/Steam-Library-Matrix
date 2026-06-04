import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/dashboard/full-profile-sync", () => ({
  enqueueFastProfileSyncJobs: vi.fn(),
}))

import { enqueueFastProfileSyncJobs } from "@/lib/dashboard/full-profile-sync"
import { enqueueAppDetailsAfterImport } from "@/lib/steam/post-import-background"

const mockedFastSync = vi.mocked(enqueueFastProfileSyncJobs)

describe("enqueueAppDetailsAfterImport", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mockedFastSync.mockReset()
  })

  it("skips when SLM_SKIP_AUTO_APP_DETAILS is true", async () => {
    vi.stubEnv("SLM_SKIP_AUTO_APP_DETAILS", "true")
    const result = await enqueueAppDetailsAfterImport("76561198000000000")
    expect(result).toBeNull()
    expect(mockedFastSync).not.toHaveBeenCalled()
  })

  it("enqueues import-tier sync with force false and returns app_details job", async () => {
    mockedFastSync.mockResolvedValue([
      { kind: "anticheat_catalog", id: "job-0", status: "created" },
      { kind: "app_details", id: "job-1", status: "created" },
      { kind: "protondb", id: "job-2", status: "created" },
    ])
    const result = await enqueueAppDetailsAfterImport("76561198000000000")
    expect(result).toEqual({ id: "job-1", status: "created" })
    expect(mockedFastSync).toHaveBeenCalledWith("76561198000000000", {
      force: false,
    })
  })
})
