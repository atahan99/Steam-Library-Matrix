import { enrichSingleAppDetails } from "@/lib/enrichment/app-details-core"
import { enrichLogBatch, enrichLogResult } from "@/lib/jobs/enrich-logger"

export const runAppDetailsBatch = async (
  _steamid: string,
  appids: number[],
  cursor: number,
  batchSize: number,
  deadlineMs: number,
  force = false
) => {
  let checked = 0
  let updated = 0
  let failed = 0
  let processed = 0

  const end = Math.min(cursor + batchSize, appids.length)
  enrichLogBatch("app_details", {
    cursor,
    total: appids.length,
    batchSize: end - cursor,
  })

  for (let i = cursor; i < end; i += 1) {
    if (Date.now() >= deadlineMs) break
    const appid = appids[i]
    if (appid == null) continue
    const result = await enrichSingleAppDetails(appid, force)
    enrichLogResult("app_details", appid, result)
    checked += result.checked
    updated += result.updated
    failed += result.failed
    processed += 1
  }

  return { checked, updated, failed, processed }
}
