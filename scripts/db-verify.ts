/**
 * Quick schema check after db:migrate.
 * Usage: DATABASE_URL=... pnpm exec tsx scripts/db-verify.ts
 */
import { closeDb, getDb, getRawSqlite } from "@/lib/db/client"
import { steamAppDetails } from "@/lib/db/schema"

const EXPECTED_TABLES = [
  "steam_profiles",
  "steam_games",
  "profile_games",
  "steam_app_details",
  "howlongtobeat_entries",
  "anticheat_entries",
  "protondb_entries",
  "data_refresh_log",
  "profile_wishlist",
  "awacy_catalog",
  "levvvel_kernel_catalog",
  "anticheat_catalog_meta",
  "denuvo_anti_tamper_catalog",
  "profile_game_achievements",
  "enrichment_jobs",
  "seed_hydration_meta",
  "schema_migrations",
]

const main = async () => {
  const sqlite = getRawSqlite()
  const rows = sqlite
    .prepare("select name from sqlite_master where type = 'table' order by name")
    .all() as { name: string }[]
  const found = new Set(rows.map((row) => row.name))
  const missing = EXPECTED_TABLES.filter((table) => !found.has(table))
  const migrations = sqlite
    .prepare("select filename from schema_migrations order by filename")
    .all() as { filename: string }[]

  console.log(`Tables: ${rows.length}`)
  console.log(`Migrations applied: ${migrations.length}`)
  for (const migration of migrations) {
    console.log(`  - ${migration.filename}`)
  }

  if (missing.length > 0) {
    console.error("Missing tables:", missing.join(", "))
    await closeDb()
    process.exit(1)
  }

  console.log("All expected tables present.")

  const db = getDb()
  await db.select({ appid: steamAppDetails.appid }).from(steamAppDetails).limit(1)
  console.log("Drizzle column mapping OK (steam_app_details).")

  await closeDb()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
