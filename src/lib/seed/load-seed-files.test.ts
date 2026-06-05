import { describe, expect, it } from "vitest"
import { loadSeedFiles } from "@/lib/seed/load-seed-files"
import path from "node:path"

describe("loadSeedFiles", () => {
  it("loads valid seed files from data/seed", async () => {
    const seedDir = path.join(process.cwd(), "data", "seed")
    const loaded = await loadSeedFiles(seedDir)

    expect(loaded.manifest?.version).toBeGreaterThanOrEqual(2)
    expect(loaded.steamGames?.items["990080"]?.name).toBe("Hogwarts Legacy")
    expect(loaded.denuvo?.items["990080"]?.hasDenuvoAntiTamper).toBe(true)
  })

  it("tolerates missing seed directory with warnings", async () => {
    const loaded = await loadSeedFiles(path.join(process.cwd(), "data", "missing-seed-dir"))

    expect(loaded.manifest).toBeNull()
    expect(loaded.warnings.length).toBeGreaterThan(0)
  })
})
