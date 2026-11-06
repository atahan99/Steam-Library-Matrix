import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import { enrichSingleSteamSpy } from "@/lib/enrichment/steamspy"
import type { EnrichmentSource } from "@/lib/enrichment/sources/types"
import { getSteamSpyBatch } from "@/lib/jobs/batch-config"
import { enrichLogResult } from "@/lib/jobs/enrich-logger"
import { runConcurrentBatch } from "@/lib/jobs/run-concurrent-batch"

export const steamspySource: EnrichmentSource = {
  kind: "steamspy",
  label: "SteamSpy",
  resolveTargets: async ({ steamid, payload, force, missingOnly }) => {
    const appids = await resolveAppidsForSource("steamspy", {
      steamid,
      appids: payload.appids,
      scopeAppids: payload.scopeAppids,
      force,
      missingOnly,
    })
    return { appids }
  },
  // One request at a time: SteamSpy's limit is ~1 request/s, enforced in enrichSingleSteamSpy.
  runBatch: async ({ appids, cursor, deadlineMs, force }) => {
    const batch = await runConcurrentBatch({
      items: appids,
      cursor,
      batchSize: getSteamSpyBatch(),
      deadlineMs,
      concurrency: 1,
      runOne: async (appid) => {
        const result = await enrichSingleSteamSpy(appid, force)
        enrichLogResult("steamspy", appid, result)
        return result
      },
    })
    return {
      checked: batch.checked,
      updated: batch.updated,
      failed: batch.failed,
      processed: batch.processed,
    }
  },
}
