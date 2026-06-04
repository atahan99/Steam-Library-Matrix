import { readFile } from "node:fs/promises"
import path from "node:path"
import { getRawSqlite } from "@/lib/db/client"

export const MIGRATION_FILES_ORDERED = ["001_sqlite_baseline.sql"] as const

const migrationsDir = path.join(process.cwd(), "db", "migrations")

export const runMigrations = async () => {
  const sqlite = getRawSqlite()

  sqlite.exec(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at text not null default (datetime('now'))
    )
  `)

  const applied = sqlite
    .prepare("select filename from schema_migrations")
    .all() as { filename: string }[]
  const appliedSet = new Set(applied.map((row) => row.filename))

  const insertMigration = sqlite.prepare(
    "insert into schema_migrations (filename) values (?)"
  )

  for (const filename of MIGRATION_FILES_ORDERED) {
    if (appliedSet.has(filename)) continue

    const filePath = path.join(migrationsDir, filename)
    const contents = await readFile(filePath, "utf8")
    sqlite.exec(contents)
    insertMigration.run(filename)
    console.log(`[db:migrate] applied ${filename}`)
  }

  console.log("[db:migrate] done")
}
