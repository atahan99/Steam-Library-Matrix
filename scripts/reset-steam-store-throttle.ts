#!/usr/bin/env tsx
/**
 * Inspect or reset the SQLite storefront throttle (steam_store_throttle).
 *
 * After switching to a new IP (phone hotspot), reset so local cooldown from a
 * prior ban does not block scans on the fresh IP:
 *
 *   pnpm store:reset-throttle
 *   SLM_STEAM_STORE_GAP_MS=2500 pnpm seed:generate --verbose
 *
 * Usage:
 *   pnpm store:throttle          # show status (default)
 *   pnpm store:reset-throttle    # clear cooldown + counters
 */
import { closeDb } from "@/lib/db/client"
import {
  getSteamStoreThrottleStatus,
  resetSteamStoreThrottle,
} from "@/lib/steam/steam-store-throttle-db"
import { getSteamStoreRequestGapMs } from "@/lib/steam/steam-store-fetch"

const shouldReset = process.argv.includes("--reset")

const formatMs = (ms: number | null): string => {
  if (ms == null || ms <= 0) return "(none)"
  return new Date(ms).toISOString()
}

const main = async () => {
  const status = getSteamStoreThrottleStatus()

  if (shouldReset) {
    resetSteamStoreThrottle()
    const after = getSteamStoreThrottleStatus()
    console.log("[store:throttle] reset complete — cooldown cleared, counters zeroed")
    console.log(`  last_request_at: ${formatMs(after.lastRequestAt)}`)
    console.log(`  consecutive_blocks: ${after.consecutiveBlocks}`)
    await closeDb()
    return
  }

  console.log("[store:throttle] status")
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ?? "(default)"}`)
  console.log(`  SLM_STEAM_STORE_GAP_MS: ${getSteamStoreRequestGapMs()}`)
  console.log(`  last_request_at: ${formatMs(status.lastRequestAt)}`)
  console.log(`  cooldown_until: ${formatMs(status.cooldownUntil)}`)
  console.log(`  cooldown_active: ${status.isCooldownActive}`)
  console.log(`  consecutive_blocks: ${status.consecutiveBlocks}`)

  if (status.isCooldownActive && status.cooldownUntil != null) {
    const remainingMin = Math.ceil((status.cooldownUntil - Date.now()) / 60_000)
    console.log(`  remaining: ~${remainingMin} min (or run pnpm store:reset-throttle after switching IP)`)
  }

  await closeDb()
}

main().catch(async (error) => {
  console.error("[store:throttle] failed:", error)
  await closeDb().catch(() => {})
  process.exit(1)
})
