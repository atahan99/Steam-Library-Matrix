#!/usr/bin/env tsx
/**
 * Profile ↔ bundled seed overlap vs dashboard resolved counts + job queue.
 * Usage: tsx --env-file=.env scripts/diagnose-seed-coverage.ts [--steamid STEAMID] [--all-profiles]
 */
import { eq, sql } from "drizzle-orm"
import { closeDb, getDb } from "@/lib/db/client"
import { fetchDashboardPayload } from "@/lib/db/dashboard"
import {
  enrichmentJobs,
  howlongtobeatEntries,
  profileGames,
  protondbEntries,
  seedHydrationMeta,
  steamAppDetails,
  steamProfiles,
} from "@/lib/db/schema"
import {
  countAchievementsResolvedGames,
  countAchievementsEnrichedGames,
} from "@/lib/enrichment/achievements-lookup-outcome"
import {
  countHltbEnrichedGames,
  countHltbResolvedGames,
  isHltbConfirmedAbsentMatchedName,
} from "@/lib/enrichment/hltb-lookup-outcome"
import { loadSeedFiles } from "@/lib/seed/load-seed-files"
import type { HltbSeed, ProtonDbSeed } from "@/lib/seed/types"

type HltbSeedItem = HltbSeed["items"][string]
type ProtonDbSeedItem = ProtonDbSeed["items"][string]

const parseArgs = () => {
  const args = process.argv.slice(2)
  let steamid: string | undefined
  let allProfiles = false

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--steamid" && args[i + 1]) {
      steamid = args[i + 1]
      i += 1
    } else if (args[i] === "--all-profiles") {
      allProfiles = true
    }
  }

  return { steamid, allProfiles }
}

type SeedExpectations = {
  hltbResolved: number
  protonWithTier: number
  appDetailsLite: number
}

const buildSeedExpectations = (
  profileAppids: Set<number>,
  hltbItems: Record<string, HltbSeedItem>,
  protonItems: Record<string, ProtonDbSeedItem>,
  appDetailsAppids: Set<number>
): SeedExpectations => {
  let hltbResolved = 0
  let protonWithTier = 0
  let appDetailsLite = 0

  for (const appid of profileAppids) {
    const hltb = hltbItems[String(appid)]
    if (hltb) {
      if ((hltb.mainStoryMinutes ?? 0) > 0) hltbResolved += 1
      else if (isHltbConfirmedAbsentMatchedName(hltb.matchedName)) hltbResolved += 1
    }

    const proton = protonItems[String(appid)]
    if (proton?.tier && proton.tier !== "unknown") protonWithTier += 1

    if (appDetailsAppids.has(appid)) appDetailsLite += 1
  }

  return { hltbResolved, protonWithTier, appDetailsLite }
}

const printRuntimeNote = () => {
  const dbUrl = process.env.DATABASE_URL ?? "(default file:./data/matrix.db)"
  console.log("\n=== Runtime ===")
  console.log(`DATABASE_URL: ${dbUrl}`)
  console.log(
    "Tip: local :3000 uses ./data/matrix.db; Docker :3001 uses docker/db/matrix.db — use one instance only."
  )
}

const printSeedMeta = async () => {
  const db = getDb()
  try {
    const meta = await db.select().from(seedHydrationMeta).limit(1)
    const row = meta[0]

    const [hltbCount, protonCount, appDetailsCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(howlongtobeatEntries),
      db.select({ count: sql<number>`count(*)` }).from(protondbEntries),
      db.select({ count: sql<number>`count(*)` }).from(steamAppDetails),
    ])

    console.log("\n=== Seed hydration (this DB) ===")
    if (row) {
      console.log(`manifestVersion: ${row.manifestVersion}`)
      console.log(`hydratedAt: ${row.hydratedAt?.toISOString() ?? "unknown"}`)
      console.log(
        `counts: inserted=${row.insertedCount} updated=${row.updatedCount} skipped=${row.skippedCount}`
      )
    } else {
      console.log("WARNING: seed_hydration_meta missing — run pnpm seed:hydrate")
    }
    console.log(
      `SQLite rows: hltb=${hltbCount[0]?.count ?? 0} proton=${protonCount[0]?.count ?? 0} app_details=${appDetailsCount[0]?.count ?? 0}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log("\n=== Seed hydration (this DB) ===")
    console.log(`ERROR reading DB: ${message}`)
    console.log(
      "If Docker is running, stop it or use the same DATABASE_URL as your browser instance."
    )
  }
}

const printJobSummary = async (steamid: string) => {
  const db = getDb()
  const rows = await db
    .select({
      kind: enrichmentJobs.kind,
      status: enrichmentJobs.status,
      count: sql<number>`count(*)`,
    })
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.steamid, steamid))
    .groupBy(enrichmentJobs.kind, enrichmentJobs.status)

  console.log("\n=== Enrichment jobs ===")
  if (rows.length === 0) {
    console.log("No jobs recorded for this profile.")
    return
  }

  const byKind = new Map<string, string[]>()
  for (const row of rows) {
    const lines = byKind.get(row.kind) ?? []
    lines.push(`${row.status}=${row.count}`)
    byKind.set(row.kind, lines)
  }
  for (const [kind, lines] of [...byKind.entries()].sort()) {
    console.log(`  ${kind}: ${lines.join(", ")}`)
  }
}

const diagnoseProfile = async (steamid: string) => {
  const loaded = await loadSeedFiles()
  const payload = await fetchDashboardPayload(steamid)
  if (!payload) {
    console.log(`\nProfile ${steamid}: not found in this database`)
    return
  }

  const db = getDb()
  const libraryAppids = await db
    .select({ appid: profileGames.appid })
    .from(profileGames)
    .where(eq(profileGames.steamid, steamid))

  const profileAppidSet = new Set(libraryAppids.map((r) => r.appid))
  const enrichGames = payload.games
  const enrichTotal = enrichGames.length

  const hltbItems = loaded.hltb?.items ?? {}
  const protonItems = loaded.protondb?.items ?? {}
  const appDetailsAppids = new Set(
    Object.keys(loaded.appDetailsLite?.items ?? {}).map(Number)
  )
  const seedAppidSet = new Set(Object.keys(hltbItems).map(Number))

  const overlap = [...profileAppidSet].filter((id) => seedAppidSet.has(id)).length
  const expected = buildSeedExpectations(
    profileAppidSet,
    hltbItems,
    protonItems,
    appDetailsAppids
  )

  const hltbEnriched = countHltbEnrichedGames(enrichGames)
  const hltbResolved = countHltbResolvedGames(enrichGames)
  const achievementsEnriched = countAchievementsEnrichedGames(enrichGames)
  const achievementsResolved = countAchievementsResolvedGames(enrichGames)

  const protonWithTier = enrichGames.filter(
    (g) => g.protondb?.tier && g.protondb.tier !== "unknown"
  ).length

  console.log(`\n=== Profile: ${payload.profile.personaName} (${steamid}) ===`)
  console.log(`Library: ${enrichTotal} games`)
  console.log(`Seed HLTB overlap: ${overlap}/${enrichTotal} appids in bundled hltb.seed.json`)
  console.log("\nExpected from seed overlap (immediate, before jobs):")
  console.log(`  HLTB resolved: ${expected.hltbResolved}`)
  console.log(`  ProtonDB with tier: ${expected.protonWithTier}`)
  console.log(`  App details lite: ${expected.appDetailsLite}`)
  console.log("\nActual dashboard (joined global cache + profile data):")
  console.log(`  HLTB enriched: ${hltbEnriched} · resolved: ${hltbResolved} · pending: ${enrichTotal - hltbResolved}`)
  console.log(`  ProtonDB with tier: ${protonWithTier}`)
  console.log(
    `  Achievements enriched: ${achievementsEnriched} · resolved: ${achievementsResolved} · pending: ${enrichTotal - achievementsResolved}`
  )

  const hltbGap = expected.hltbResolved - hltbResolved
  if (Math.abs(hltbGap) > 5) {
    console.log(
      `\nWARNING: HLTB resolved differs from seed expectation by ${hltbGap} — check hydration on this DB or stale rows.`
    )
  } else if (expected.hltbResolved < enrichTotal * 0.5) {
    console.log(
      `\nNote: Low seed overlap (${overlap}/${enrichTotal}) — bundled seed targets top sellers, not your full library. Background jobs fill the rest.`
    )
  } else {
    console.log("\nSeed coverage aligns with expectations for this profile.")
  }

  await printJobSummary(steamid)
}

const main = async () => {
  const { steamid, allProfiles } = parseArgs()
  printRuntimeNote()
  await printSeedMeta()

  const db = getDb()
  let steamids: string[] = []

  if (steamid) {
    steamids = [steamid]
  } else if (allProfiles) {
    const rows = await db.select({ steamid: steamProfiles.steamid }).from(steamProfiles)
    steamids = rows.map((r) => r.steamid)
  } else {
    const rows = await db
      .select({
        steamid: profileGames.steamid,
        count: sql<number>`count(*)`,
      })
      .from(profileGames)
      .groupBy(profileGames.steamid)

    steamids = rows.map((r) => r.steamid)
    if (steamids.length === 0) {
      console.log("\nNo profiles in this database. Import a library or pass --steamid.")
    }
  }

  for (const id of steamids) {
    await diagnoseProfile(id)
  }

  await closeDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
