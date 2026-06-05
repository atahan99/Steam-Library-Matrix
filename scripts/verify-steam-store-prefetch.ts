#!/usr/bin/env tsx
import { closeDb } from "@/lib/db/client"
import { getAllSteamAppNames } from "@/lib/steam/steam-api"
import { resetSteamStoreThrottleForTests, tripSteamStoreCooldown } from "@/lib/steam/steam-store-throttle-db"
import { prefetchSeedEnrichment } from "@/lib/seed/prefetch-seed-enrichment"

const main = async () => {
  const names = await getAllSteamAppNames()
  console.log("[test:getapplist] map size:", names.size)
  console.log("[test:getapplist] 570 =>", names.get(570))
  console.log("[test:getapplist] 730 =>", names.get(730))

  resetSteamStoreThrottleForTests()
  tripSteamStoreCooldown("test", 403)

  const stats = await prefetchSeedEnrichment({
    appids: [999999991, 999999992],
    force: false,
    skipProtondb: true,
    skipHltb: true,
    skipAppDetails: false,
    verbose: true,
  })

  console.log("[test:prefetch-cooldown]", JSON.stringify(stats, null, 2))
  if (!stats.stoppedEarly) {
    throw new Error("expected prefetch to stop early on cooldown")
  }
  console.log("[test:prefetch-cooldown] passed")
  await closeDb()
}

main().catch(async (error) => {
  console.error(error)
  await closeDb().catch(() => {})
  process.exit(1)
})
