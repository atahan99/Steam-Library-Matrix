import { enrichSingleAchievement } from "@/lib/enrichment/achievements"
import { enrichLogBatch, enrichLogResult } from "@/lib/jobs/enrich-logger"
import { runConcurrentBatch } from "@/lib/jobs/run-concurrent-batch"

export const runAchievementsBatch = async (
  steamid: string,
  appids: number[],
  cursor: number,
  batchSize: number,
  deadlineMs: number,
  force = false,
  concurrency = 1
) => {
  enrichLogBatch("achievements", {
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
    staggerMs: concurrency > 1 ? 50 : 0,
    runOne: async (appid) => {
      const result = await enrichSingleAchievement(steamid, appid, force, {
        applyDelay: concurrency <= 1,
      })
      enrichLogResult("achievements", appid, result)
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
