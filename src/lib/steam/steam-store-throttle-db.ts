import type Database from "better-sqlite3"
import { getRawSqlite } from "@/lib/db/client"

export const STEAM_STORE_THROTTLE_ROW_ID = "default"

const COOLDOWN_BACKOFF_MS = [
  30 * 60 * 1000,
  60 * 60 * 1000,
  120 * 60 * 1000,
] as const

export class SteamStoreCooldownError extends Error {
  readonly cooldownUntil: number

  constructor(cooldownUntil: number) {
    super(
      `Steam store cooldown active until ${new Date(cooldownUntil).toISOString()}`
    )
    this.name = "SteamStoreCooldownError"
    this.cooldownUntil = cooldownUntil
  }
}

type ThrottleRow = {
  last_request_at: number
  cooldown_until: number | null
  consecutive_blocks: number
}

const readThrottleRow = (sqlite: Database.Database): ThrottleRow => {
  const row = sqlite
    .prepare(
      `select last_request_at, cooldown_until, consecutive_blocks
       from steam_store_throttle
       where id = ?`
    )
    .get(STEAM_STORE_THROTTLE_ROW_ID) as ThrottleRow | undefined

  if (!row) {
    throw new Error(
      "steam_store_throttle row missing — run pnpm db:migrate"
    )
  }

  return row
}

const cooldownBackoffMs = (consecutiveBlocks: number): number => {
  const index = Math.min(
    Math.max(consecutiveBlocks - 1, 0),
    COOLDOWN_BACKOFF_MS.length - 1
  )
  return COOLDOWN_BACKOFF_MS[index]
}

const runImmediateTransaction = <T>(
  sqlite: Database.Database,
  fn: () => T
): T => {
  sqlite.prepare("BEGIN IMMEDIATE").run()
  try {
    const result = fn()
    sqlite.prepare("COMMIT").run()
    return result
  } catch (error) {
    sqlite.prepare("ROLLBACK").run()
    throw error
  }
}

/** Atomically reserve the next storefront slot; returns ms to sleep before fetching. */
export const reserveSteamStoreRequestSlot = (
  gapMs: number,
  sqlite: Database.Database = getRawSqlite()
): number => {
  return runImmediateTransaction(sqlite, () => {
    const now = Date.now()
    const row = readThrottleRow(sqlite)

    if (row.cooldown_until != null && now < row.cooldown_until) {
      throw new SteamStoreCooldownError(row.cooldown_until)
    }

    const scheduledAt = Math.max(now, row.last_request_at + gapMs)
    const waitMs = scheduledAt - now

    sqlite
      .prepare(
        `update steam_store_throttle
         set last_request_at = ?, updated_at = ?
         where id = ?`
      )
      .run(scheduledAt, now, STEAM_STORE_THROTTLE_ROW_ID)

    return waitMs
  })
}

export const tripSteamStoreCooldown = (
  reason: string,
  status: number,
  sqlite: Database.Database = getRawSqlite()
): number => {
  return runImmediateTransaction(sqlite, () => {
    const now = Date.now()
    const row = readThrottleRow(sqlite)
    const consecutiveBlocks = row.consecutive_blocks + 1
    const backoffMs = cooldownBackoffMs(consecutiveBlocks)
    const cooldownUntil = now + backoffMs

    sqlite
      .prepare(
        `update steam_store_throttle
         set cooldown_until = ?,
             consecutive_blocks = ?,
             updated_at = ?
         where id = ?`
      )
      .run(cooldownUntil, consecutiveBlocks, now, STEAM_STORE_THROTTLE_ROW_ID)

    console.warn(
      `[steam-store] cooldown tripped (${reason}, HTTP ${status}) — blocks=${consecutiveBlocks}, until=${new Date(cooldownUntil).toISOString()}`
    )

    return cooldownUntil
  })
}

export const clearSteamStoreCooldown = (
  sqlite: Database.Database = getRawSqlite()
): void => {
  runImmediateTransaction(sqlite, () => {
    const now = Date.now()
    sqlite
      .prepare(
        `update steam_store_throttle
         set cooldown_until = null,
             consecutive_blocks = 0,
             updated_at = ?
         where id = ?`
      )
      .run(now, STEAM_STORE_THROTTLE_ROW_ID)
  })
}

export const getSteamStoreCooldownUntil = (
  sqlite: Database.Database = getRawSqlite()
): number | null => {
  const row = readThrottleRow(sqlite)
  if (row.cooldown_until == null) return null
  return row.cooldown_until > Date.now() ? row.cooldown_until : null
}

/** Reset throttle row (tests only). */
export const resetSteamStoreThrottleForTests = (
  sqlite: Database.Database = getRawSqlite()
): void => {
  const now = Date.now()
  sqlite
    .prepare(
      `update steam_store_throttle
       set last_request_at = 0,
           cooldown_until = null,
           consecutive_blocks = 0,
           updated_at = ?
       where id = ?`
    )
    .run(now, STEAM_STORE_THROTTLE_ROW_ID)
}
