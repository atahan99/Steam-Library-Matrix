#!/usr/bin/env tsx
/**
 * Fetch Steam store top sellers and write data/seed/top-appids.json
 * Usage: pnpm seed:fetch-top-appids [--limit 5000] [--verbose]
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fetchSteamTopSellers } from "@/lib/steam/fetch-steam-top-sellers"
import { DEFAULT_SEED_DIR } from "@/lib/seed/load-seed-files"
import { buildTopAppidsFromSeedFiles } from "@/lib/seed/resolve-target-appids"
import { SEED_MANIFEST_VERSION } from "@/lib/seed/types"

const parseArgs = () => {
  const args = process.argv.slice(2)
  let limit = 5000
  let verbose = false

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10)
      i += 1
    } else if (args[i] === "--verbose") {
      verbose = true
    }
  }

  return { limit, verbose }
}

const main = async () => {
  const { limit, verbose } = parseArgs()
  const generatedAt = new Date().toISOString()

  console.log(`[seed:fetch-top-appids] fetching up to ${limit} top seller appids…`)

  const result = await fetchSteamTopSellers(limit, {
    onProgress: (loaded, target) => {
      if (verbose && (loaded % 250 === 0 || loaded >= target)) {
        console.log(`[seed:fetch-top-appids] progress ${loaded}/${target}`)
      }
    },
  })

  if (result.error) {
    console.warn(`[seed:fetch-top-appids] warning: ${result.error}`)
  }

  if (result.appids.length === 0) {
    console.warn(
      "[seed:fetch-top-appids] live Steam fetch failed — falling back to bundled seed appids"
    )
    const fallback = await buildTopAppidsFromSeedFiles(DEFAULT_SEED_DIR, limit)
    if (!fallback) {
      console.error("[seed:fetch-top-appids] failed — no appids from Steam or seed files")
      process.exit(1)
    }

    const outPath = path.join(DEFAULT_SEED_DIR, "top-appids.json")
    await mkdir(DEFAULT_SEED_DIR, { recursive: true })
    await writeFile(outPath, `${JSON.stringify(fallback, null, 2)}\n`)

    console.log("[seed:fetch-top-appids] done (seed fallback)")
    console.log(`  appids: ${fallback.appids.length}`)
    console.log(`  names: ${Object.keys(fallback.names ?? {}).length}`)
    console.log(`  complete: ${fallback.complete ?? false}`)
    console.log(`  output: ${outPath}`)
    return
  }

  const payload = {
    version: SEED_MANIFEST_VERSION,
    generatedAt,
    appids: result.appids,
    names: result.names,
    reportedTotal: result.reportedTotal,
    complete: result.complete,
  }

  await mkdir(DEFAULT_SEED_DIR, { recursive: true })
  const outPath = path.join(DEFAULT_SEED_DIR, "top-appids.json")
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`)

  console.log("[seed:fetch-top-appids] done")
  console.log(`  appids: ${result.appids.length}`)
  console.log(`  names: ${Object.keys(result.names).length}`)
  console.log(`  complete: ${result.complete}`)
  console.log(`  output: ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
