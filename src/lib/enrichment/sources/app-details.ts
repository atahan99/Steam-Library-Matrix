import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import type { EnrichmentSource } from "@/lib/enrichment/sources/types"
import {
  getAppDetailsBatch,
  getAppDetailsConcurrency,
} from "@/lib/jobs/batch-config"
import { runAppDetailsBatch } from "@/lib/jobs/steps/app-details-step"

export const appDetailsSource: EnrichmentSource = {
  kind: "app_details",
  label: "App details",
  // Matches the pre-registry call: app_details never passed missingOnly.
  resolveTargets: async ({ steamid, payload, force }) => {
    const appids = await resolveAppidsForSource("app_details", {
      steamid,
      force,
      scopeAppids: payload.scopeAppids,
    })
    return { appids }
  },
  // SteamStoreCooldownError from enrichSingleAppDetails propagates to the worker.
  runBatch: async ({ steamid, appids, cursor, deadlineMs, force }) =>
    runAppDetailsBatch(
      steamid,
      appids,
      cursor,
      getAppDetailsBatch(),
      deadlineMs,
      force,
      getAppDetailsConcurrency()
    ),
}
