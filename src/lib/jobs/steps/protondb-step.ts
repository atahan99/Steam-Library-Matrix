import { enrichSingleProtonDb } from "@/lib/enrichment/protondb"
import { enrichLogBatch, enrichLogResult } from "@/lib/jobs/enrich-logger"
import { runConcurrentBatch } from "@/lib/jobs/run-concurrent-batch"

export const runProtonDbBatch = async (
  appids: number[],
  cursor: number,
  batchSize: number,
  deadlineMs: number,
  force = false,
  concurrency = 1
) => {
  enrichLogBatch("protondb", {
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
    staggerMs: concurrency > 1 ? PROTON_STAGGER_MS : 0,
    runOne: async (appid) => {
      const result = await enrichSingleProtonDb(appid, force, {
        applyDelay: concurrency <= 1,
      })
      enrichLogResult("protondb", appid, result)
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

const PROTON_STAGGER_MS = 200
