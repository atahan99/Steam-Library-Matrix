import { resolveAppidsForSource } from "@/lib/enrichment/resolve-enrichment-appids"
import type { EnrichmentSource } from "@/lib/enrichment/sources/types"
import {
  getHltbBatch,
  getHltbConcurrency,
} from "@/lib/jobs/batch-config"
import { runHltbBatch } from "@/lib/jobs/steps/hltb-step"

export const hltbSource: EnrichmentSource = {
  kind: "hltb",
  label: "HowLongToBeat",
  resolveTargets: async ({ steamid, payload, force, missingOnly }) => {
    const rows = await resolveAppidsForSource("hltb", {
      steamid,
      force,
      missingOnly,
      scopeAppids: payload.scopeAppids,
    })
    return {
      appids: rows.map((row) => row.appid),
      gameNames: Object.fromEntries(
        rows.map((row) => [String(row.appid), row.name])
      ),
    }
  },
  runBatch: async ({ appids, gameNames, cursor, deadlineMs }) => {
    const rows = appids.map((appid) => ({
      appid,
      name: gameNames?.[String(appid)] ?? `App ${appid}`,
    }))
    return runHltbBatch(
      rows,
      cursor,
      getHltbBatch(),
      deadlineMs,
      getHltbConcurrency()
    )
  },
}
