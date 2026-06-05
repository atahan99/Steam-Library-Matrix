#!/usr/bin/env tsx
/**
 * Manual seed hydration CLI.
 * Usage: pnpm seed:hydrate
 */
import { closeDb } from "@/lib/db/client"
import { runMigrations } from "@/lib/db/migrate"
import { hydrateSeedDataIfNeeded } from "@/lib/seed/hydrate-seed-data"

const main = async () => {
  await runMigrations()
  const result = await hydrateSeedDataIfNeeded()

  console.log(`Seed version: ${result.version}`)
  console.log(`Generated at: ${result.generatedAt ?? "—"}`)
  console.log(
    `Inserted: ${result.inserted}  Updated: ${result.updated}  Skipped: ${result.skipped}`
  )

  if (result.warnings.length > 0) {
    console.log("Warnings:")
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`)
    }
  }

  await closeDb()
}

main().catch(async (err) => {
  console.error(err)
  await closeDb()
  process.exit(1)
})
