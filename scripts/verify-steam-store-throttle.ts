#!/usr/bin/env tsx
/**
 * Integration verification for SQLite-backed Steam storefront throttle.
 * Usage: pnpm tsx --env-file=.env scripts/verify-steam-store-throttle.ts [--live] [--cross-process]
 */
import { spawn } from "node:child_process"
import path from "node:path"
import { closeDb, getRawSqlite } from "@/lib/db/client"
import {
  getSteamStoreCooldownUntil,
  resetSteamStoreThrottleForTests,
  reserveSteamStoreRequestSlot,
  tripSteamStoreCooldown,
  SteamStoreCooldownError,
} from "@/lib/steam/steam-store-throttle-db"
import {
  getSteamStoreRequestGapMs,
  resetSteamStoreRequestThrottleForTests,
  waitForSteamStoreRequestSlot,
} from "@/lib/steam/steam-store-fetch"
import { fetchSteamAppDetails } from "@/lib/steam/steam-store"

const parseArgs = () => {
  const args = process.argv.slice(2)
  return {
    live: args.includes("--live"),
    crossProcess: args.includes("--cross-process"),
  }
}

const assert = (cond: boolean, message: string) => {
  if (!cond) throw new Error(message)
  console.log(`  ✓ ${message}`)
}

const testCooldownBlocks = () => {
  console.log("\n[1] Cooldown blocks slot reservation")
  resetSteamStoreThrottleForTests()
  const until = tripSteamStoreCooldown("test-403", 403)
  const active = getSteamStoreCooldownUntil()
  assert(active != null && active >= until - 100, "cooldown is active after trip")
  let threw = false
  try {
    reserveSteamStoreRequestSlot(50)
  } catch {
    threw = true
  }
  assert(threw, "reserve throws while cooldown active")
  resetSteamStoreThrottleForTests()
}

const testSequentialSpacing = async () => {
  console.log("\n[2] Sequential slot spacing (same process)")
  resetSteamStoreRequestThrottleForTests()
  process.env.SLM_STEAM_STORE_GAP_MS = "300"

  const stamps: number[] = []
  for (let i = 0; i < 3; i += 1) {
    await waitForSteamStoreRequestSlot()
    stamps.push(Date.now())
  }

  const gap1 = stamps[1] - stamps[0]
  const gap2 = stamps[2] - stamps[1]
  assert(gap1 >= 250, `gap 1 = ${gap1}ms (expected ≥250)`)
  assert(gap2 >= 250, `gap 2 = ${gap2}ms (expected ≥250)`)
  resetSteamStoreThrottleForTests()
}

const runCrossProcessWorkers = (): Promise<{ worker: string; waits: number[] }[]> => {
  return new Promise((resolve, reject) => {
    const tsx = path.join(process.cwd(), "node_modules", ".bin", "tsx")
    const workerScript = path.join(
      process.cwd(),
      "scripts",
      "verify-steam-store-throttle-worker.ts"
    )
    const env = {
      ...process.env,
      SLM_STEAM_STORE_GAP_MS: "400",
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./data/matrix.db",
    }
    resetSteamStoreRequestThrottleForTests()

    const results: { worker: string; waits: number[] }[] = []
    let done = 0
    const spawnWorker = (id: string) => {
      const child = spawn(
        tsx,
        ["--env-file=.env", workerScript, id, "4"],
        { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] }
      )
      let stdout = ""
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk)
      })
      child.stderr.on("data", (chunk) => {
        console.error(`worker ${id} stderr:`, String(chunk))
      })
      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`worker ${id} exited ${code}: ${stdout}`))
          return
        }
        try {
          const parsed = JSON.parse(stdout.trim()) as {
            worker: string
            waits: number[]
          }
          results.push(parsed)
        } catch (error) {
          reject(error)
          return
        }
        done += 1
        if (done === 2) resolve(results)
      })
    }

    spawnWorker("A")
    spawnWorker("B")
  })
}

const testCrossProcess = async () => {
  console.log("\n[3] Cross-process gating (two workers, shared SQLite)")
  const results = await runCrossProcessWorkers()
  console.log("  workers:", JSON.stringify(results))
  assert(results.length === 2, "both workers completed")

  const allWaits = results.flatMap((r) => r.waits)
  const maxWait = Math.max(...allWaits)
  assert(maxWait >= 350, `max inter-slot wait = ${maxWait}ms (expected ≥350 for 400ms gap)`)

  const sqlite = getRawSqlite()
  const row = sqlite
    .prepare("select last_request_at from steam_store_throttle where id = 'default'")
    .get() as { last_request_at: number }
  assert(row.last_request_at > 0, "last_request_at persisted in SQLite")
  resetSteamStoreThrottleForTests()
}

const testLiveFetch = async () => {
  console.log("\n[4] Live storefront fetch (2 appids, respects gate)")
  resetSteamStoreRequestThrottleForTests()
  process.env.SLM_STEAM_STORE_GAP_MS = "1500"

  const t0 = Date.now()
  let a = null
  try {
    a = await fetchSteamAppDetails(570)
  } catch (error) {
    if (error instanceof SteamStoreCooldownError) {
      console.log("  ⚠ storefront already in cooldown before first fetch — IP may be banned")
      resetSteamStoreThrottleForTests()
      return
    }
    throw error
  }

  if (!a?.name) {
    const cooldown = getSteamStoreCooldownUntil()
    if (cooldown != null) {
      console.log(
        `  ⚠ first fetch returned null + cooldown active until ${new Date(cooldown).toISOString()} — 403 handling works (IP likely banned)`
      )
      resetSteamStoreThrottleForTests()
      return
    }
    throw new Error("first fetch returned null without tripping cooldown")
  }

  const mid = Date.now()
  const b = await fetchSteamAppDetails(730)
  const elapsed = Date.now() - t0
  const between = Date.now() - mid

  assert(Boolean(b?.name), `appid 730 → ${b?.name ?? "null"}`)
  assert(elapsed >= 1400, `total elapsed ${elapsed}ms (expected ≥1400 for 2×1500ms gap)`)
  assert(between >= 1400, `second fetch waited ${between}ms after first`)
  console.log(`  ✓ live names: ${a.name}, ${b?.name}`)
}

const main = async () => {
  const { live, crossProcess } = parseArgs()
  console.log("[verify:steam-store-throttle] starting")
  console.log(`  DATABASE_URL=${process.env.DATABASE_URL ?? "(unset)"}`)
  console.log(`  SLM_STEAM_STORE_GAP_MS=${getSteamStoreRequestGapMs()}`)

  testCooldownBlocks()
  await testSequentialSpacing()

  if (crossProcess) {
    await testCrossProcess()
  } else {
    console.log("\n[3] Cross-process — skipped (pass --cross-process)")
  }

  if (live) {
    await testLiveFetch()
  } else {
    console.log("\n[4] Live fetch — skipped (pass --live)")
  }

  console.log("\n[verify:steam-store-throttle] all checks passed")
  await closeDb()
}

main().catch(async (error) => {
  console.error("[verify:steam-store-throttle] FAILED:", error)
  await closeDb().catch(() => {})
  process.exit(1)
})
