#!/usr/bin/env tsx
/**
 * App-details-only seed prefetch (storefront). ProtonDB/HLTB skipped.
 * Usage: SLM_STEAM_STORE_GAP_MS=5000 pnpm seed:prefetch-appdetails
 */
import { closeDb } from "@/lib/db/client"
import { prefetchSeedEnrichment } from "@/lib/seed/prefetch-seed-enrichment"
import { resolveTargetAppids } from "@/lib/seed/resolve-target-appids"

const main = async () => {
  const resolved = await resolveTargetAppids({ limit: 5000 })
  console.log(
    `[seed:prefetch-appdetails] starting — ${resolved.appids.length} appids, gap=${process.env.SLM_STEAM_STORE_GAP_MS ?? "2000"}ms`
  )

  const stats = await prefetchSeedEnrichment({
    appids: resolved.appids,
    nameHints: resolved.names,
    force: false,
    skipProtondb: true,
    skipHltb: true,
    skipAppDetails: false,
    verbose: true,
  })

  console.log("[seed:prefetch-appdetails] finished", JSON.stringify(stats, null, 2))
  await closeDb()

  if (stats.stoppedEarly) {
    process.exit(0)
  }
}

main().catch(async (error) => {
  console.error("[seed:prefetch-appdetails] failed:", error)
  await closeDb().catch(() => {})
  process.exit(1)
})
