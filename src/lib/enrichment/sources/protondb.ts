import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import type { EnrichmentSource } from "@/lib/enrichment/sources/types"
import {
  getProtonDbBatch,
  getProtonDbConcurrency,
} from "@/lib/jobs/batch-config"
import { runProtonDbBatch } from "@/lib/jobs/steps/protondb-step"

export const protondbSource: EnrichmentSource = {
  kind: "protondb",
  label: "ProtonDB",
  priority: 4,
  resolveTargets: async ({ steamid, payload, force, missingOnly }) => {
    const appids = await resolveAppidsForSource("protondb", {
      steamid,
      appids: payload.appids,
      scopeAppids: payload.scopeAppids,
      force,
      missingOnly,
    })
    return { appids }
  },
  runBatch: async ({ appids, cursor, deadlineMs, force }) =>
    runProtonDbBatch(
      appids,
      cursor,
      getProtonDbBatch(),
      deadlineMs,
      force,
      getProtonDbConcurrency()
    ),
}
