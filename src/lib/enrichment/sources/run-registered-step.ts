import type { EnrichmentSource, RegisteredStepResult } from "@/lib/enrichment/sources/types"
import type { JobPayload, JobProgress } from "@/lib/jobs/types"

export const runRegisteredSourceStep = async (
  source: EnrichmentSource,
  input: {
    steamid: string
    payload: JobPayload
    deadlineMs: number
  }
): Promise<RegisteredStepResult> => {
  const force = input.payload.force ?? false
  const missingOnly = input.payload.missingOnly ?? false
  const stats: JobProgress = { ...input.payload.stats }

  let appids = input.payload.appids
  let gameNames = input.payload.gameNames

  if (!appids?.length) {
    const resolved = await source.resolveTargets({
      steamid: input.steamid,
      payload: input.payload,
      force,
      missingOnly,
    })
    appids = resolved.appids
    if (resolved.gameNames) gameNames = resolved.gameNames
  }

  const cursor = input.payload.cursor ?? 0
  const total = appids.length
  if (total === 0) {
    return {
      done: true,
      payload: { ...input.payload, appids, gameNames, cursor: 0, stats },
      progress: { ...stats, total: 0, message: "Nothing to refresh" },
    }
  }

  const batch = await source.runBatch({
    appids,
    gameNames,
    cursor,
    deadlineMs: input.deadlineMs,
    force,
  })

  const nextCursor = cursor + batch.processed
  const nextStats: JobProgress = {
    checked: (stats.checked ?? 0) + batch.checked,
    updated: (stats.updated ?? 0) + batch.updated,
    failed: (stats.failed ?? 0) + batch.failed,
    skippedLowConfidence:
      (stats.skippedLowConfidence ?? 0) + (batch.skippedLowConfidence ?? 0),
    total,
    message: stats.message,
  }
  const done = nextCursor >= total

  return {
    done,
    payload: {
      ...input.payload,
      appids,
      gameNames,
      cursor: nextCursor,
      stats: nextStats,
    },
    progress: {
      ...nextStats,
      message: done
        ? `${source.label} refresh completed`
        : `${source.label} ${nextCursor}/${total}`,
    },
  }
}
