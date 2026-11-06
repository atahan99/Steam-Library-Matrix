import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import type { EnrichmentSource } from "@/lib/enrichment/sources/types"
import {
  getAchievementsBatch,
  getAchievementsConcurrency,
} from "@/lib/jobs/batch-config"
import { runAchievementsBatch } from "@/lib/jobs/steps/achievements-step"

export const achievementsSource: EnrichmentSource = {
  kind: "achievements",
  label: "Achievements",
  resolveTargets: async ({ steamid, payload, force, missingOnly }) => {
    const appids = await resolveAppidsForSource("achievements", {
      steamid,
      appids: payload.appids,
      scopeAppids: payload.scopeAppids,
      force,
      missingOnly,
    })
    return { appids }
  },
  runBatch: async ({ steamid, appids, cursor, deadlineMs, force }) =>
    runAchievementsBatch(
      steamid,
      appids,
      cursor,
      getAchievementsBatch(),
      deadlineMs,
      force,
      getAchievementsConcurrency()
    ),
}
