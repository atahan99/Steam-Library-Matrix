/**
 * Re-import library, queue all enrichments, and drain the job worker until idle.
 * Usage: pnpm sync:full [steamid]
 */
import { and, eq, inArray, sql } from "drizzle-orm"
import { runFullProfileSync } from "@/lib/dashboard/full-profile-sync"
import { getDb } from "@/lib/db/client"
import {
  anticheatEntries,
  awacyCatalog,
  enrichmentJobs,
  howlongtobeatEntries,
  protondbEntries,
  steamAppDetails,
  steamProfiles,
} from "@/lib/db/schema"
import { processEnrichmentJobsTick } from "@/lib/jobs/worker"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const printCoverage = async (steamid: string) => {
  const db = getDb()
  const [awacy] = await db.select({ n: sql<number>`count(*)` }).from(awacyCatalog)
  const [details] = await db.select({ n: sql<number>`count(*)` }).from(steamAppDetails)
  const [proton] = await db.select({ n: sql<number>`count(*)` }).from(protondbEntries)
  const [hltb] = await db.select({ n: sql<number>`count(*)` }).from(howlongtobeatEntries)
  const [ac] = await db
    .select({ n: sql<number>`count(*)` })
    .from(anticheatEntries)
    .where(sql`last_checked_at is not null`)

  const pending = await db
    .select({ kind: enrichmentJobs.kind, status: enrichmentJobs.status })
    .from(enrichmentJobs)
    .where(
      and(
        eq(enrichmentJobs.steamid, steamid),
        inArray(enrichmentJobs.status, ["pending", "running"])
      )
    )

  console.log("\n--- Coverage ---")
  console.log(`AWACY catalog:     ${awacy?.n ?? 0}`)
  console.log(`App details rows:  ${details?.n ?? 0}`)
  console.log(`ProtonDB rows:     ${proton?.n ?? 0}`)
  console.log(`HLTB rows:         ${hltb?.n ?? 0}`)
  console.log(`Anti-cheat linked: ${ac?.n ?? 0}`)
  if (pending.length) {
    console.log(`Active jobs:       ${pending.map((j) => `${j.kind}(${j.status})`).join(", ")}`)
  } else {
    console.log("Active jobs:       none")
  }
}

const drainJobs = async (steamid: string, maxTicks = 5000) => {
  let idleStreak = 0
  for (let tick = 0; tick < maxTicks; tick += 1) {
    const result = await processEnrichmentJobsTick()
    const db = getDb()
    const active = await db
      .select({ id: enrichmentJobs.id })
      .from(enrichmentJobs)
      .where(
        and(
          eq(enrichmentJobs.steamid, steamid),
          inArray(enrichmentJobs.status, ["pending", "running"])
        )
      )

    if (result.processed > 0 || result.continued > 0) {
      idleStreak = 0
      console.log(
        `[worker tick ${tick + 1}] processed=${result.processed} completed=${result.completed} continued=${result.continued} failed=${result.failed} active=${active.length}`
      )
    } else if (active.length === 0) {
      idleStreak += 1
      if (idleStreak >= 3) break
    } else {
      idleStreak = 0
      await sleep(500)
    }

    await sleep(200)
  }
}

const main = async () => {
  const db = getDb()
  let steamid = process.argv[2]
  if (!steamid) {
    const rows = await db
      .select({ steamid: steamProfiles.steamid })
      .from(steamProfiles)
      .limit(1)
    steamid = rows[0]?.steamid
  }
  if (!steamid) {
    throw new Error("No steamid — import a profile first")
  }

  console.log(`\n=== Full profile sync: ${steamid} ===\n`)
  await printCoverage(steamid)

  console.log("\nRe-importing library and queueing jobs…")
  const started = await runFullProfileSync(steamid)
  console.log(`Library games: ${started.gameCount}`)
  console.log(
    "Jobs:",
    started.jobs.map((j) => `${j.kind}:${j.status}`).join(", ")
  )

  console.log("\nDraining enrichment worker (this can take a long time)…\n")
  await drainJobs(steamid)

  await printCoverage(steamid)
  console.log("\nDone.\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
