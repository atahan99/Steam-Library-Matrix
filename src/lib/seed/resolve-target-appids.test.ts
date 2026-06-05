import { afterEach, describe, expect, it, vi } from "vitest"
import {
  loadProfileAppidsFromSeedDir,
  resolveTargetAppids,
} from "@/lib/seed/resolve-target-appids"

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

import { readFile } from "node:fs/promises"

const mockedReadFile = vi.mocked(readFile)

describe("resolveTargetAppids", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("merges top-appids and profile-appids from seed dir", async () => {
    mockedReadFile.mockImplementation(async (filePath) => {
      const file = String(filePath)
      if (file.endsWith("top-appids.json")) {
        return JSON.stringify({
          version: 3,
          generatedAt: "2026-01-01T00:00:00.000Z",
          appids: [10, 20, 30],
          names: { "10": "Ten" },
        })
      }
      if (file.endsWith("profile-appids.json")) {
        return JSON.stringify({
          version: 3,
          generatedAt: "2026-01-01T00:00:00.000Z",
          appids: [20, 40],
          names: { "40": "Forty" },
        })
      }
      throw new Error(`ENOENT ${file}`)
    })

    const resolved = await resolveTargetAppids({
      limit: 5000,
      seedDir: "/tmp/seed",
    })

    expect(resolved.source).toBe("top-appids+profiles")
    expect(resolved.appids).toEqual([10, 20, 30, 40])
    expect(resolved.names).toEqual({ "10": "Ten", "40": "Forty" })
  })
})

describe("loadProfileAppidsFromSeedDir", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when profile file is missing", async () => {
    mockedReadFile.mockRejectedValue(new Error("ENOENT"))
    const result = await loadProfileAppidsFromSeedDir("/tmp/seed")
    expect(result).toBeNull()
  })
})
