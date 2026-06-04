import { enrichSingleAppDetails } from "@/lib/enrichment/app-details-core"
import { enrichLogBatch, enrichLogResult } from "@/lib/jobs/enrich-logger"
import { runConcurrentBatch } from "@/lib/jobs/run-concurrent-batch"

export const runAppDetailsBatch = async (
  _steamid: string,
  appids: number[],
  cursor: number,
  batchSize: number,
  deadlineMs: number,
  force = false,
  concurrency = 1
) => {
  enrichLogBatch("app_details", {
    cursor,
    total: appids.length,
    batchSize: Math.min(batchSize, appids.length - cursor),
  })

  const batch = await runConcurrentBatch({
    items: appids,
    cursor,
    batchSize,
    deadlineMs,
    concurrency,
    staggerMs: concurrency > 1 ? APP_DETAILS_STAGGER_MS : 0,
    runOne: async (appid) => {
      const result = await enrichSingleAppDetails(appid, force)
      enrichLogResult("app_details", appid, result)
      return result
    },
  })

  return {
    checked: batch.checked,
    updated: batch.updated,
    failed: batch.failed,
    processed: batch.processed,
  }
}

const APP_DETAILS_STAGGER_MS = 150
