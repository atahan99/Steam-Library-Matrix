import { readFileSync } from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

export const createSteamStoreThrottleTestDb = (): Database.Database => {
  const sqlite = new Database(":memory:")
  const migrationPath = path.join(
    process.cwd(),
    "db",
    "migrations",
    "003_steam_store_throttle.sql"
  )
  sqlite.exec(readFileSync(migrationPath, "utf8"))
  return sqlite
}
