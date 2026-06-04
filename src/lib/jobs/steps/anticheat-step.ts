import {
  enrichSingleAnticheat,
  type AnticheatEnrichContext,
  type AnticheatEnrichPhase,
} from "@/lib/enrichment/anticheat"
import { enrichLog, enrichLogBatch, enrichLogResult } from "@/lib/jobs/enrich-logger"

export const runAnticheatBatch = async (
  rows: { appid: number; name: string }[],
  cursor: number,
  batchSize: number,
  deadlineMs: number,
  context: AnticheatEnrichContext,
  force = false,
  storePageFetchPending = false,
  phase: AnticheatEnrichPhase = "catalog"
) => {
  let checked = 0
  let updated = 0
  let failed = 0
  let processed = 0
  let schemaError: string | undefined
  let delayBeforeStoreFetch =
    phase === "denuvo" ? storePageFetchPending : false

  const end = Math.min(cursor + batchSize, rows.length)
  enrichLogBatch(`anticheat:${phase}`, {
    cursor,
    total: rows.length,
    batchSize: end - cursor,
  })

  for (let i = cursor; i < end; i += 1) {
    if (Date.now() >= deadlineMs) break
    const row = rows[i]
    if (!row) continue
    const result = await enrichSingleAnticheat(row, {
      force,
      context,
      delayBeforeStoreFetch,
      phase,
    })
    enrichLogResult(`anticheat:${phase}`, row.appid, result)
    checked += result.checked
    updated += result.updated
    failed += result.failed
    processed += 1
    if (phase === "denuvo") {
      delayBeforeStoreFetch = true
    }
    if (result.schemaError) {
      enrichLog(`anticheat schema error appid=${row.appid} — ${result.schemaError}`)
      schemaError = result.schemaError
      break
    }
  }

  return {
    checked,
    updated,
    failed,
    processed,
    schemaError,
    storePageFetchPending: phase === "denuvo" ? delayBeforeStoreFetch : false,
  }
}
