import { mkdirSync } from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { getRuntimeEnv, prepareServerEnv } from "@/lib/env/runtime-env"
import { schema, type AppDatabase } from "@/lib/db/schema"

const SQLITE_GLOBAL_KEY = "__slm_sqlite_client__"
const DRIZZLE_GLOBAL_KEY = "__slm_drizzle_db__"

type SqliteGlobalState = typeof globalThis & {
  [SQLITE_GLOBAL_KEY]?: Database.Database
  [DRIZZLE_GLOBAL_KEY]?: BetterSQLite3Database<AppDatabase>
}

const getGlobalState = (): SqliteGlobalState => globalThis as SqliteGlobalState

const getDatabaseUrl = (): string | undefined => getRuntimeEnv("DATABASE_URL")

const resolveAppRoot = (): string => {
  const appRoot = process.env.APP_ROOT?.trim()
  return appRoot && path.isAbsolute(appRoot) ? appRoot : process.cwd()
}

export const resolveSqliteFilePath = (databaseUrl: string): string => {
  const trimmed = databaseUrl.trim()
  const withoutScheme = trimmed.startsWith("file:")
    ? trimmed.slice("file:".length)
    : trimmed

  if (!withoutScheme) {
    throw new Error(
      "DATABASE_URL must be a SQLite file path (for example file:./data/matrix.db)."
    )
  }

  if (path.isAbsolute(withoutScheme)) return withoutScheme
  return path.join(resolveAppRoot(), withoutScheme)
}

/** Ensures server env is read at request time (required for Docker / standalone). */
export const prepareDbEnv = prepareServerEnv

export const isDbConfigured = (): boolean => Boolean(getDatabaseUrl())

export const isDbConfiguredAtRuntime = async (): Promise<boolean> => {
  await prepareDbEnv()
  return isDbConfigured()
}

export const getRawSqlite = (): Database.Database => {
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Set file:./data/matrix.db in .env, then run pnpm db:migrate."
    )
  }

  const state = getGlobalState()
  if (!state[SQLITE_GLOBAL_KEY]) {
    const filePath = resolveSqliteFilePath(url)
    mkdirSync(path.dirname(filePath), { recursive: true })
    const sqliteClient = new Database(filePath)
    sqliteClient.pragma("journal_mode = WAL")
    sqliteClient.pragma("foreign_keys = ON")
    sqliteClient.pragma("busy_timeout = 5000")
    state[SQLITE_GLOBAL_KEY] = sqliteClient
  }

  return state[SQLITE_GLOBAL_KEY]
}

export const getDb = (): BetterSQLite3Database<AppDatabase> => {
  const state = getGlobalState()
  if (!state[DRIZZLE_GLOBAL_KEY]) {
    state[DRIZZLE_GLOBAL_KEY] = drizzle(getRawSqlite(), { schema })
  }
  return state[DRIZZLE_GLOBAL_KEY]
}

export const closeDb = async () => {
  const state = getGlobalState()
  if (state[SQLITE_GLOBAL_KEY]) {
    state[SQLITE_GLOBAL_KEY].close()
    delete state[SQLITE_GLOBAL_KEY]
    delete state[DRIZZLE_GLOBAL_KEY]
  }
}
