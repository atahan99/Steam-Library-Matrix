#!/usr/bin/env tsx
/**
 * Export profile library appids into data/seed/profile-appids.json for merged seed generation.
 * Usage: tsx --env-file=.env scripts/export-profile-appids-for-seed.ts
 *        DATABASE_URL=file:./docker/db/matrix.db tsx --env-file=.env scripts/export-profile-appids-for-seed.ts
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"
import { closeDb, getDb } from "@/lib/db/client"
import { profileGames, steamProfiles } from "@/lib/db/schema"
import { resolveSeedDir } from "@/lib/seed/load-seed-files"
import { PROFILE_APPIDS_FILENAME } from "@/lib/seed/resolve-target-appids"
import { SEED_MANIFEST_VERSION, type ProfileAppidsFile } from "@/lib/seed/types"

const main = async () => {
  const db = getDb()
  const profiles = await db.select().from(steamProfiles)

  if (profiles.length === 0) {
    console.error("No profiles in database — import libraries first.")
    process.exit(1)
  }

  const appidSet = new Set<number>()
  const names: Record<string, string> = {}
  const profileSummaries: ProfileAppidsFile["profiles"] = []

  for (const profile of profiles) {
    const rows = await db
      .select({ appid: profileGames.appid })
      .from(profileGames)
      .where(eq(profileGames.steamid, profile.steamid))

    const appids = rows.map((row) => row.appid)
    for (const appid of appids) appidSet.add(appid)

    profileSummaries.push({
      steamid: profile.steamid,
      personaName: profile.personaName ?? undefined,
      appids,
    })
  }

  const seedDir = resolveSeedDir()
  await mkdir(seedDir, { recursive: true })

  const payload: ProfileAppidsFile = {
    version: SEED_MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    appids: [...appidSet].sort((a, b) => a - b),
    names,
    profiles: profileSummaries,
  }

  const outPath = path.join(seedDir, PROFILE_APPIDS_FILENAME)
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")

  console.log(`Wrote ${payload.appids.length} unique appids from ${profiles.length} profile(s)`)
  console.log(`  path: ${outPath}`)
  for (const summary of profileSummaries) {
    console.log(
      `  - ${summary.personaName ?? summary.steamid}: ${summary.appids.length} games`
    )
  }

  await closeDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
