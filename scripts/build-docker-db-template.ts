#!/usr/bin/env tsx
/**
 * Build a pre-hydrated SQLite template for Docker first-run (migrate + seed hydrate only).
 * Usage: pnpm docker:build-db-template
 */
import { copyFile, mkdir, rm } from "node:fs/promises"
import path from "node:path"
import Database from "better-sqlite3"
import { closeDb, getRawSqlite } from "@/lib/db/client"
import { hydrateSeedData } from "@/lib/seed/hydrate-seed-data"
import { runMigrations } from "@/lib/db/migrate"

const TEMPLATE_DIR = path.join(process.cwd(), "docker", "db")
const TEMP_DB = path.join(TEMPLATE_DIR, ".build-matrix.db")
const TEMPLATE_OUT = path.join(TEMPLATE_DIR, "matrix.db.template")

const TEMPLATE_TABLES = [
  "steam_games",
  "steam_app_details",
  "protondb_entries",
  "howlongtobeat_entries",
  "seed_hydration_meta",
] as const

const assertTemplatePopulated = (templatePath: string): void => {
  const db = new Database(templatePath, { readonly: true })
  try {
    for (const table of TEMPLATE_TABLES) {
      const row = db.prepare(`select count(*) as c from ${table}`).get() as {
        c: number
      }
      if (!row.c || row.c <= 0) {
        console.error(
          `[docker:build-db-template] template table ${table} is empty (${row.c} rows)`
        )
        process.exit(1)
      }
      console.log(`[docker:build-db-template] verified ${table}: ${row.c} rows`)
    }
  } finally {
    db.close()
  }
}

const main = async () => {
  process.env.DATABASE_URL = `file:${TEMP_DB}`
  process.env.SLM_SKIP_CATALOG_BOOTSTRAP = "true"
  process.env.SLM_SEED_DIR = process.env.SLM_SEED_DIR ?? path.join(process.cwd(), "data", "seed")

  await mkdir(TEMPLATE_DIR, { recursive: true })
  await rm(TEMP_DB, { force: true })
  await rm(`${TEMP_DB}-wal`, { force: true })
  await rm(`${TEMP_DB}-shm`, { force: true })

  console.log("[docker:build-db-template] migrating…")
  await runMigrations()

  console.log("[docker:build-db-template] hydrating seed…")
  const result = await hydrateSeedData(process.env.SLM_SEED_DIR)
  console.log(
    `[docker:build-db-template] hydrate v${result.version} inserted=${result.inserted} updated=${result.updated}`
  )

  getRawSqlite().pragma("wal_checkpoint(TRUNCATE)")
  await closeDb()
  await copyFile(TEMP_DB, TEMPLATE_OUT)
  await rm(TEMP_DB, { force: true })
  await rm(`${TEMP_DB}-wal`, { force: true })
  await rm(`${TEMP_DB}-shm`, { force: true })

  assertTemplatePopulated(TEMPLATE_OUT)

  console.log(`[docker:build-db-template] wrote ${TEMPLATE_OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
