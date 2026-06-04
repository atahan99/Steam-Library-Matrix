const truthy = (value: string | undefined): boolean =>
  value === "true" || value === "1" || value === "yes"

const falsy = (value: string | undefined): boolean =>
  value === "false" || value === "0" || value === "no"

export const isEnrichVerbose = (): boolean => {
  const flag = process.env.SLM_ENRICH_VERBOSE?.trim().toLowerCase()
  if (truthy(flag)) return true
  if (falsy(flag)) return false
  return process.env.SLM_CLI === "1"
}

export const enrichLog = (...parts: unknown[]): void => {
  if (!isEnrichVerbose()) return
  console.log("[enrich]", ...parts)
}

export type EnrichItemOutcome = "updated" | "skipped" | "failed" | "noop"

export const classifyEnrichResult = (result: {
  updated?: number
  failed?: number
  skipped?: number
  skippedLowConfidence?: number
}): EnrichItemOutcome => {
  if ((result.skipped ?? 0) > 0 || (result.skippedLowConfidence ?? 0) > 0) {
    return "skipped"
  }
  if ((result.failed ?? 0) > 0) return "failed"
  if ((result.updated ?? 0) > 0) return "updated"
  return "noop"
}

export const enrichLogItem = (
  kind: string,
  appid: number,
  outcome: EnrichItemOutcome,
  detail?: string
): void => {
  if (!isEnrichVerbose()) return
  const suffix = detail ? ` — ${detail}` : ""
  console.log(`[enrich] ${kind} appid=${appid} ${outcome}${suffix}`)
}

export const enrichLogResult = (
  kind: string,
  appid: number,
  result: {
    updated?: number
    failed?: number
    skipped?: number
    skippedLowConfidence?: number
  },
  detail?: string
): void => {
  enrichLogItem(kind, appid, classifyEnrichResult(result), detail)
}

export const enrichLogBatch = (
  kind: string,
  input: { cursor: number; total: number; batchSize: number }
): void => {
  if (!isEnrichVerbose()) return
  const from = input.cursor + 1
  const to = Math.min(input.cursor + input.batchSize, input.total)
  enrichLog(
    `${kind} batch ${from}-${to}/${input.total} (size ${input.batchSize})`
  )
}

export const enrichLogJob = (
  phase: "start" | "continue" | "done" | "fail",
  input: {
    kind: string
    steamid: string
    jobId: string
    message?: string
    error?: string
  }
): void => {
  if (!isEnrichVerbose()) return
  const id = input.jobId.slice(0, 8)
  const msg = input.message ? ` — ${input.message}` : ""
  const err = input.error ? ` — ${input.error}` : ""
  enrichLog(`job ${phase} kind=${input.kind} steamid=${input.steamid} id=${id}${msg}${err}`)
}

export const formatWorkerTickLog = (result: {
  processed: number
  completed: number
  continued: number
  failed: number
}): string => {
  if (result.processed === 0) {
    return "[dev:jobs] idle (no pending jobs)"
  }

  return `[dev:jobs] tick processed=${result.processed} completed=${result.completed} continued=${result.continued} failed=${result.failed}`
}
