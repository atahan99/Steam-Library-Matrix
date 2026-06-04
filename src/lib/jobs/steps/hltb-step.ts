import { enrichSingleHowLongToBeatGame } from "@/lib/enrichment/howlongtobeat"
import { enrichLogBatch, enrichLogResult } from "@/lib/jobs/enrich-logger"
import { runConcurrentBatch } from "@/lib/jobs/run-concurrent-batch"

export const runHltbBatch = async (
  rows: { appid: number; name: string }[],
  cursor: number,
  batchSize: number,
  deadlineMs: number,
  concurrency = 1
) => {
  enrichLogBatch("hltb", {
    cursor,
    total: rows.length,
    batchSize: Math.min(batchSize, rows.length - cursor),
  })

  const batch = await runConcurrentBatch({
    items: rows,
    cursor,
    batchSize,
    deadlineMs,
    concurrency,
    staggerMs: concurrency > 1 ? HLTB_STAGGER_MS : 0,
    runOne: async (row) => {
      const result = await enrichSingleHowLongToBeatGame(row.appid, row.name, {
        applyDelay: concurrency <= 1,
      })
      enrichLogResult("hltb", row.appid, result)
      return result
    },
  })

  return {
    checked: batch.checked,
    updated: batch.updated,
    failed: batch.failed,
    skippedLowConfidence: batch.skippedLowConfidence ?? 0,
    processed: batch.processed,
  }
}

const HLTB_STAGGER_MS = 400
