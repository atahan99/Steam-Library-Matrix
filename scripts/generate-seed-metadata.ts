#!/usr/bin/env tsx
/**
 * Generate bundled seed metadata from local SQLite (same sources as background enrichment).
 * Usage: pnpm seed:generate [--limit 5000] [--appids-file path] [--verbose]
 *        [--skip-prefetch] [--skip-protondb] [--skip-hltb] [--skip-app-details] [--force-prefetch]
 *
 * App-details prefetch respects Steam's ~200 req/5 min store API limit (see SLM_STEAM_STORE_GAP_MS).
 * A full ~2200-appid run takes on the order of 1–2 hours.
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { inArray } from "drizzle-orm"
import { closeDb, getDb } from "@/lib/db/client"
import { loadAllDenuvoCatalogAppids } from "@/lib/db/denuvo-catalog"
import {
  anticheatEntries,
  howlongtobeatEntries,
  macosCompatCatalog,
  protondbEntries,
  steamAppDetails,
  steamGames,
} from "@/lib/db/schema"
import { prefetchSeedEnrichment } from "@/lib/seed/prefetch-seed-enrichment"
import { resolveTargetAppids } from "@/lib/seed/resolve-target-appids"
import type {
  AppDetailsLiteSeed,
  DenuvoSeed,
  HltbSeed,
  MacosCompatSeed,
  MetadataManifest,
  ProtonDbSeed,
  SteamGamesSeed,
} from "@/lib/seed/types"
import { DEFAULT_SEED_DIR } from "@/lib/seed/load-seed-files"
import { SEED_MANIFEST_VERSION } from "@/lib/seed/types"
import { parseSteamPlatforms } from "@/lib/steam/parse-steam-platforms"

const CHUNK_SIZE = 500
const PROGRESS_EVERY = 50

const parseArgs = () => {
  const args = process.argv.slice(2)
  let limit = 5000
  let appidsFile: string | undefined
  let verbose = process.env.SLM_CLI === "1" || process.env.SLM_ENRICH_VERBOSE === "true"
  let skipPrefetch = false
  let skipProtondb = false
  let skipHltb = false
  let skipAppDetails = false
  let forcePrefetch = false

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10)
      i += 1
    } else if (args[i] === "--appids-file" && args[i + 1]) {
      appidsFile = args[i + 1]
      i += 1
    } else if (args[i] === "--verbose") {
      verbose = true
    } else if (args[i] === "--skip-prefetch") {
      skipPrefetch = true
    } else if (args[i] === "--skip-protondb") {
      skipProtondb = true
    } else if (args[i] === "--skip-hltb") {
      skipHltb = true
    } else if (args[i] === "--skip-app-details") {
      skipAppDetails = true
    } else if (args[i] === "--force-prefetch") {
      forcePrefetch = true
    }
  }

  return {
    limit,
    appidsFile,
    verbose,
    skipPrefetch,
    skipProtondb,
    skipHltb,
    skipAppDetails,
    forcePrefetch,
  }
}

const log = (verbose: boolean, message: string) => {
  if (verbose) {
    console.log(`[seed:generate] ${message}`)
  }
}

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const main = async () => {
  const {
    limit,
    appidsFile,
    verbose,
    skipPrefetch,
    skipProtondb,
    skipHltb,
    skipAppDetails,
    forcePrefetch,
  } = parseArgs()
  const generatedAt = new Date().toISOString()
  const db = getDb()

  console.log("[seed:generate] starting — exporting from local SQLite enrichment cache")
  log(verbose, `DATABASE_URL=${process.env.DATABASE_URL ?? "(default)"}`)

  const resolved = await resolveTargetAppids({ limit, appidsFile })
  log(verbose, `target appids source: ${resolved.source} (${resolved.appids.length} appids)`)

  const targetAppids = resolved.appids
  if (targetAppids.length === 0) {
    console.error(
      "[seed:generate] no appids found — run pnpm seed:fetch-top-appids or enrichment first"
    )
    await closeDb()
    process.exit(1)
  }

  if (!skipPrefetch) {
    console.log(
      "[seed:generate] prefetching app-details / ProtonDB / HLTB (live scrape into local SQLite)…"
    )
    const prefetchStats = await prefetchSeedEnrichment({
      appids: targetAppids,
      nameHints: resolved.names,
      force: forcePrefetch,
      skipAppDetails,
      skipProtondb,
      skipHltb,
      verbose,
    })
    if (prefetchStats.stoppedEarly) {
      const until = prefetchStats.cooldownUntil
        ? new Date(prefetchStats.cooldownUntil).toISOString()
        : "unknown"
      console.warn(
        `[seed:generate] prefetch stopped early (Steam store cooldown until ${until}, ~${prefetchStats.remainingAppids ?? "?"} appids remaining). Partial results saved in SQLite — re-run the same command later to resume.`
      )
    } else {
      console.log(
        `[seed:generate] prefetch done — appDetails updated=${prefetchStats.appDetailsUpdated} proton updated=${prefetchStats.protonUpdated} hltb updated=${prefetchStats.hltbUpdated} names=${prefetchStats.namesFetched}`
      )
    }
  } else {
    log(verbose, "skipping live prefetch (--skip-prefetch)")
  }

  const catalogSet = await loadAllDenuvoCatalogAppids()

  const steamGamesSeed: SteamGamesSeed = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    items: {},
  }

  const denuvoSeed: DenuvoSeed = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    items: {},
  }

  const appDetailsLiteSeed: AppDetailsLiteSeed = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    items: {},
  }

  const protondbSeed: ProtonDbSeed = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    items: {},
  }

  const hltbSeed: HltbSeed = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    items: {},
  }

  let processed = 0
  let gamesWritten = 0
  let denuvoFromAnticheat = 0
  let denuvoFromCatalog = 0
  let appDetailsWritten = 0
  let protonWritten = 0
  let hltbWritten = 0

  log(verbose, `exporting ${targetAppids.length} appids in chunks of ${CHUNK_SIZE}…`)

  for (const chunk of chunkArray(targetAppids, CHUNK_SIZE)) {
    const games = await db
      .select({
        appid: steamGames.appid,
        name: steamGames.name,
        iconUrl: steamGames.iconUrl,
        logoUrl: steamGames.logoUrl,
        storeUrl: steamGames.storeUrl,
      })
      .from(steamGames)
      .where(inArray(steamGames.appid, chunk))

    const gamesByAppid = new Map(games.map((row) => [row.appid, row]))

    const acRows = await db
      .select({
        appid: anticheatEntries.appid,
        denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
        denuvoConfidence: anticheatEntries.denuvoConfidence,
        denuvoSource: anticheatEntries.denuvoSource,
        denuvoEvidence: anticheatEntries.denuvoEvidence,
        denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
      })
      .from(anticheatEntries)
      .where(inArray(anticheatEntries.appid, chunk))

    const acByAppid = new Map(acRows.map((row) => [row.appid, row]))

    const detailRows = await db
      .select({
        appid: steamAppDetails.appid,
        headerImage: steamAppDetails.headerImage,
        developers: steamAppDetails.developers,
        publishers: steamAppDetails.publishers,
        genres: steamAppDetails.genres,
        categories: steamAppDetails.categories,
        type: steamAppDetails.type,
        platforms: steamAppDetails.platforms,
        releaseDate: steamAppDetails.releaseDate,
        steamDeckCompatibility: steamAppDetails.steamDeckCompatibility,
        lastCheckedAt: steamAppDetails.lastCheckedAt,
      })
      .from(steamAppDetails)
      .where(inArray(steamAppDetails.appid, chunk))

    const detailsByAppid = new Map(detailRows.map((row) => [row.appid, row]))

    const protonRows = await db
      .select()
      .from(protondbEntries)
      .where(inArray(protondbEntries.appid, chunk))

    const protonByAppid = new Map(protonRows.map((row) => [row.appid, row]))

    const hltbRows = await db
      .select()
      .from(howlongtobeatEntries)
      .where(inArray(howlongtobeatEntries.appid, chunk))

    const hltbByAppid = new Map(hltbRows.map((row) => [row.appid, row]))

    for (const appid of chunk) {
      processed += 1

      const game = gamesByAppid.get(appid)
      const hintName = resolved.names[String(appid)]

      if (game) {
        steamGamesSeed.items[String(appid)] = {
          appid,
          name: game.name,
          iconUrl: game.iconUrl ?? undefined,
          logoUrl: game.logoUrl ?? undefined,
          storeUrl: game.storeUrl ?? undefined,
        }
        gamesWritten += 1
      } else if (
        catalogSet.has(appid) ||
        acByAppid.has(appid) ||
        detailsByAppid.has(appid) ||
        protonByAppid.has(appid) ||
        hltbByAppid.has(appid) ||
        hintName
      ) {
        steamGamesSeed.items[String(appid)] = {
          appid,
          name: hintName ?? `App ${appid}`,
          storeUrl: `https://store.steampowered.com/app/${appid}`,
        }
        gamesWritten += 1
      }

      const ac = acByAppid.get(appid)
      if (ac && (ac.denuvoAntiTamper != null || ac.denuvoCheckedAt != null)) {
        denuvoSeed.items[String(appid)] = {
          appid,
          hasDenuvoAntiTamper: ac.denuvoAntiTamper,
          confidence:
            (ac.denuvoConfidence as DenuvoSeed["items"][string]["confidence"]) ??
            (ac.denuvoAntiTamper === true ? "medium" : "none"),
          source:
            (ac.denuvoSource as DenuvoSeed["items"][string]["source"]) ??
            (catalogSet.has(appid) ? "curator" : "seed"),
          evidence: ac.denuvoEvidence ?? undefined,
          checkedAt: ac.denuvoCheckedAt?.toISOString() ?? generatedAt,
        }
        denuvoFromAnticheat += 1
      } else if (catalogSet.has(appid)) {
        denuvoSeed.items[String(appid)] = {
          appid,
          hasDenuvoAntiTamper: true,
          confidence: "medium",
          source: "curator",
          evidence: "Listed on Denuvo Watch curator",
          checkedAt: generatedAt,
        }
        denuvoFromCatalog += 1
      }

      const details = detailsByAppid.get(appid)
      if (details) {
        const platforms = parseSteamPlatforms(details.platforms)
        appDetailsLiteSeed.items[String(appid)] = {
          appid,
          headerImage: details.headerImage ?? undefined,
          type: details.type ?? undefined,
          developers: Array.isArray(details.developers)
            ? (details.developers as string[])
            : undefined,
          publishers: Array.isArray(details.publishers)
            ? (details.publishers as string[])
            : undefined,
          genres: Array.isArray(details.genres)
            ? (details.genres as unknown[])
            : undefined,
          categories: Array.isArray(details.categories)
            ? (details.categories as unknown[])
            : undefined,
          platforms: platforms ?? undefined,
          releaseDate: details.releaseDate ?? undefined,
          steamDeckCompatibility: details.steamDeckCompatibility ?? undefined,
          checkedAt: details.lastCheckedAt?.toISOString() ?? generatedAt,
        }
        appDetailsWritten += 1
      }

      const proton = protonByAppid.get(appid)
      if (proton?.lastCheckedAt) {
        protondbSeed.items[String(appid)] = {
          appid,
          tier: (proton.tier as ProtonDbSeed["items"][string]["tier"]) ?? null,
          confidence: proton.confidence ?? null,
          totalReports: proton.totalReports ?? null,
          latestReportedAt: proton.latestReportedAt?.toISOString() ?? null,
          sourceUrl: proton.sourceUrl ?? null,
          checkedAt: proton.lastCheckedAt.toISOString(),
        }
        protonWritten += 1
      }

      const hltb = hltbByAppid.get(appid)
      if (hltb?.lastCheckedAt) {
        hltbSeed.items[String(appid)] = {
          appid,
          hltbId: hltb.hltbId ?? null,
          matchedName: hltb.matchedName ?? null,
          matchConfidence: hltb.matchConfidence ?? null,
          mainStoryMinutes: hltb.mainStoryMinutes ?? null,
          mainExtraMinutes: hltb.mainExtraMinutes ?? null,
          completionistMinutes: hltb.completionistMinutes ?? null,
          allStylesMinutes: hltb.allStylesMinutes ?? null,
          imageUrl: hltb.imageUrl ?? null,
          platforms: hltb.platforms ?? null,
          reviewScore: hltb.reviewScore ?? null,
          sourceUrl: hltb.sourceUrl ?? null,
          checkedAt: hltb.lastCheckedAt.toISOString(),
        }
        hltbWritten += 1
      }

      if (verbose && (processed % PROGRESS_EVERY === 0 || processed === targetAppids.length)) {
        console.log(
          `[seed:generate] progress ${processed}/${targetAppids.length} — games=${gamesWritten} denuvo=${Object.keys(denuvoSeed.items).length} appDetails=${appDetailsWritten} proton=${protonWritten} hltb=${hltbWritten}`
        )
      }
    }
  }

  const cleanMacRating = (value: string | null): string | undefined =>
    value && value !== "unknown" ? value : undefined

  const macosCatalogRows = await db.select().from(macosCompatCatalog)
  const macosCompatSeed: MacosCompatSeed = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    items: {},
  }
  for (const row of macosCatalogRows) {
    const native = cleanMacRating(row.native)
    const rosetta2 = cleanMacRating(row.rosetta2)
    const crossover = cleanMacRating(row.crossover)
    const parallels = cleanMacRating(row.parallels)
    if (!native && !rosetta2 && !crossover && !parallels) continue
    macosCompatSeed.items[row.normalizedName] = {
      pageName: row.pageName,
      ...(native ? { native } : {}),
      ...(rosetta2 ? { rosetta2 } : {}),
      ...(crossover ? { crossover } : {}),
      ...(parallels ? { parallels } : {}),
    }
  }

  const manifest: MetadataManifest = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    sources: {
      denuvo: { generatedAt, count: Object.keys(denuvoSeed.items).length },
      steamGames: {
        generatedAt,
        count: Object.keys(steamGamesSeed.items).length,
      },
      appDetailsLite: {
        generatedAt,
        count: Object.keys(appDetailsLiteSeed.items).length,
      },
      protondb: {
        generatedAt,
        count: Object.keys(protondbSeed.items).length,
      },
      hltb: {
        generatedAt,
        count: Object.keys(hltbSeed.items).length,
      },
      macosCompat: {
        generatedAt,
        count: Object.keys(macosCompatSeed.items).length,
      },
    },
  }

  await mkdir(DEFAULT_SEED_DIR, { recursive: true })
  await writeFile(
    path.join(DEFAULT_SEED_DIR, "metadata-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  )
  await writeFile(
    path.join(DEFAULT_SEED_DIR, "steam-games.seed.json"),
    `${JSON.stringify(steamGamesSeed, null, 2)}\n`
  )
  await writeFile(
    path.join(DEFAULT_SEED_DIR, "denuvo.seed.json"),
    `${JSON.stringify(denuvoSeed, null, 2)}\n`
  )
  await writeFile(
    path.join(DEFAULT_SEED_DIR, "app-details-lite.seed.json"),
    `${JSON.stringify(appDetailsLiteSeed, null, 2)}\n`
  )
  await writeFile(
    path.join(DEFAULT_SEED_DIR, "protondb.seed.json"),
    `${JSON.stringify(protondbSeed, null, 2)}\n`
  )
  await writeFile(
    path.join(DEFAULT_SEED_DIR, "hltb.seed.json"),
    `${JSON.stringify(hltbSeed, null, 2)}\n`
  )
  await writeFile(
    path.join(DEFAULT_SEED_DIR, "macos-compat.seed.json"),
    `${JSON.stringify(macosCompatSeed, null, 2)}\n`
  )

  console.log("[seed:generate] done")
  console.log(`  steamGames: ${Object.keys(steamGamesSeed.items).length}`)
  console.log(
    `  denuvo: ${Object.keys(denuvoSeed.items).length} (anticheat=${denuvoFromAnticheat} curator-only=${denuvoFromCatalog})`
  )
  console.log(`  appDetailsLite: ${Object.keys(appDetailsLiteSeed.items).length}`)
  console.log(`  protondb: ${Object.keys(protondbSeed.items).length}`)
  console.log(`  hltb: ${Object.keys(hltbSeed.items).length}`)
  console.log(`  macosCompat: ${Object.keys(macosCompatSeed.items).length}`)
  console.log(`  output: ${DEFAULT_SEED_DIR}`)

  await closeDb()
}

main().catch(async (err) => {
  console.error(err)
  await closeDb()
  process.exit(1)
})
