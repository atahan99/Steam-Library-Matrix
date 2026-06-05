#!/usr/bin/env tsx
/**
 * Validate bundled seed JSON files (no DB required).
 */
import { loadSeedFiles } from "@/lib/seed/load-seed-files"
import {
  appDetailsLiteSeedSchema,
  denuvoSeedSchema,
  hltbSeedSchema,
  metadataManifestSchema,
  protondbSeedSchema,
  steamGamesSeedSchema,
} from "@/lib/seed/types"

const MAX_EVIDENCE_LENGTH = 500

const assertManifestCount = (
  label: string,
  expected: number | undefined,
  actual: number
): boolean => {
  if (expected == null) return false
  if (expected !== actual) {
    console.error(`manifest ${label} count ${expected} != actual ${actual}`)
    return true
  }
  return false
}

const main = async () => {
  const loaded = await loadSeedFiles()
  let failed = false

  for (const warning of loaded.warnings) {
    console.warn(`warning: ${warning}`)
  }

  if (loaded.manifest) {
    const parsed = metadataManifestSchema.safeParse(loaded.manifest)
    if (!parsed.success) {
      console.error("manifest invalid:", parsed.error.message)
      failed = true
    } else {
      const denuvoCount = loaded.denuvo
        ? Object.keys(loaded.denuvo.items).length
        : 0
      const gamesCount = loaded.steamGames
        ? Object.keys(loaded.steamGames.items).length
        : 0
      const protonCount = loaded.protondb
        ? Object.keys(loaded.protondb.items).length
        : 0
      const hltbCount = loaded.hltb ? Object.keys(loaded.hltb.items).length : 0

      failed =
        assertManifestCount("denuvo", parsed.data.sources.denuvo?.count, denuvoCount) ||
        failed
      failed =
        assertManifestCount(
          "steamGames",
          parsed.data.sources.steamGames?.count,
          gamesCount
        ) || failed
      failed =
        assertManifestCount("protondb", parsed.data.sources.protondb?.count, protonCount) ||
        failed
      failed =
        assertManifestCount("hltb", parsed.data.sources.hltb?.count, hltbCount) || failed
    }
  } else {
    console.error("missing or invalid metadata-manifest.json")
    failed = true
  }

  if (loaded.denuvo) {
    for (const item of Object.values(loaded.denuvo.items)) {
      if (item.evidence && item.evidence.length > MAX_EVIDENCE_LENGTH) {
        console.error(`evidence too long for appid ${item.appid}`)
        failed = true
      }
    }
  }

  if (!loaded.steamGames) {
    console.warn("steam-games.seed.json missing or invalid")
  } else {
    steamGamesSeedSchema.parse(loaded.steamGames)
  }

  if (!loaded.denuvo) {
    console.warn("denuvo.seed.json missing or invalid")
  } else {
    denuvoSeedSchema.parse(loaded.denuvo)
  }

  if (loaded.appDetailsLite) {
    appDetailsLiteSeedSchema.parse(loaded.appDetailsLite)
    if (
      loaded.manifest?.sources.appDetailsLite?.count != null &&
      loaded.manifest.sources.appDetailsLite.count !==
        Object.keys(loaded.appDetailsLite.items).length
    ) {
      console.error("manifest appDetailsLite count mismatch")
      failed = true
    }
  } else {
    console.warn("app-details-lite.seed.json missing or optional skip")
  }

  if (loaded.protondb) {
    protondbSeedSchema.parse(loaded.protondb)
  } else {
    console.warn("protondb.seed.json missing or optional skip")
  }

  if (loaded.hltb) {
    hltbSeedSchema.parse(loaded.hltb)
  } else {
    console.warn("hltb.seed.json missing or optional skip")
  }

  if (failed) {
    process.exit(1)
  }

  console.log("Seed data verification passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
