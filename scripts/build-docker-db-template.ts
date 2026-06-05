#!/usr/bin/env tsx
/**
 * Build a pre-hydrated SQLite template for Docker first-run (migrate + seed hydrate only).
 * Usage: pnpm docker:build-db-template
 */
import { copyFile, mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { closeDb } from "@/lib/db/client"
import { hydrateSeedData } from "@/lib/seed/hydrate-seed-data"
import { runMigrations } from "@/lib/db/migrate"

const TEMPLATE_DIR = path.join(process.cwd(), "docker", "db")
const TEMP_DB = path.join(TEMPLATE_DIR, ".build-matrix.db")
const TEMPLATE_OUT = path.join(TEMPLATE_DIR, "matrix.db.template")

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

  await closeDb()
  await copyFile(TEMP_DB, TEMPLATE_OUT)
  await rm(TEMP_DB, { force: true })
  await rm(`${TEMP_DB}-wal`, { force: true })
  await rm(`${TEMP_DB}-shm`, { force: true })

  console.log(`[docker:build-db-template] wrote ${TEMPLATE_OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
