import type { EnrichmentCoverage, SourceCoverage } from "@/lib/enrichment/coverage-for-appids"
import type { JobProgress } from "@/lib/jobs/types"

export const SYNC_PROGRESS_SOURCES = [
  "app_details",
  "protondb",
  "anticheat",
  "hltb",
] as const

export type SyncProgressSourceKey = (typeof SYNC_PROGRESS_SOURCES)[number]

export const SYNC_PROGRESS_SOURCE_LABELS: Record<SyncProgressSourceKey, string> = {
  app_details: "App details",
  protondb: "ProtonDB",
  anticheat: "Anti-cheat",
  hltb: "HowLongToBeat",
}

const ENRICHMENT_JOB_KINDS = new Set([
  "app_details",
  "protondb",
  "anticheat",
  "hltb",
  "achievements",
  "wishlist",
  "anticheat_catalog",
  "denuvo_catalog",
])

export type SyncStatusSourceRow = {
  key: string
  label: string
  total: number
  withData: number
  processed: number
  missing: number
  percent: number
}

/** @deprecated Use SyncStatusSourceRow */
export type SyncProgressSource = SyncStatusSourceRow & {
  key: SyncProgressSourceKey | string
}

export type SyncProgressSnapshot = {
  enrichTotal: number
  percent: number
  processedUnits: number
  totalUnits: number
  isComplete: boolean
  isActive: boolean
  activeJobCount: number
  /** Queue empty but one or more sources still below 100%. */
  idleIncomplete?: boolean
  incompleteSourceCount?: number
  sources: SyncStatusSourceRow[]
}

export type ActiveJobSummary = {
  kind: string
  status: string
  progress?: JobProgress
}

export const processedCountForSource = (source: SourceCoverage): number => {
  if (source.confirmedAbsent !== undefined) {
    return source.withData + source.confirmedAbsent
  }
  return source.withData + source.stale
}

export const computeSyncProgressFromSources = (input: {
  sources: SyncStatusSourceRow[]
  enrichTotal: number
  activeJobs: ActiveJobSummary[]
}): SyncProgressSnapshot => {
  const totalUnits = input.sources.reduce((sum, source) => sum + source.total, 0)
  const processedUnits = input.sources.reduce(
    (sum, source) => sum + source.processed,
    0
  )
  const percent =
    totalUnits > 0 ? Math.round((processedUnits / totalUnits) * 100) : 100

  const activeEnrichmentJobs = input.activeJobs.filter((job) =>
    ENRICHMENT_JOB_KINDS.has(job.kind)
  )

  const allMissingDone = input.sources.every((source) => source.missing === 0)
  const isComplete = allMissingDone && activeEnrichmentJobs.length === 0
  const isActive =
    input.enrichTotal > 0 &&
    (activeEnrichmentJobs.length > 0 || !allMissingDone)
  const incompleteSourceCount = input.sources.filter(
    (source) => source.percent < 100
  ).length
  const idleIncomplete =
    activeEnrichmentJobs.length === 0 &&
    incompleteSourceCount > 0 &&
    !isComplete

  return {
    enrichTotal: input.enrichTotal,
    percent: isComplete ? 100 : percent,
    processedUnits,
    totalUnits,
    isComplete,
    isActive,
    activeJobCount: activeEnrichmentJobs.length,
    idleIncomplete,
    incompleteSourceCount,
    sources: input.sources,
  }
}

export const computeSyncProgress = (input: {
  coverage: EnrichmentCoverage
  activeJobs: ActiveJobSummary[]
  enrichTotal: number
}): SyncProgressSnapshot => {
  const sources: SyncStatusSourceRow[] = SYNC_PROGRESS_SOURCES.map((key) => {
    const row = input.coverage[key]
    const processed = processedCountForSource(row)
    const percent =
      row.total > 0 ? Math.round((processed / row.total) * 100) : 100

    return {
      key,
      label: SYNC_PROGRESS_SOURCE_LABELS[key],
      total: row.total,
      withData: row.withData,
      processed,
      missing: row.missing,
      percent,
    }
  })

  return computeSyncProgressFromSources({
    sources,
    enrichTotal: input.enrichTotal,
    activeJobs: input.activeJobs,
  })
}

export const formatEtaSeconds = (seconds: number | null | undefined): string | null => {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  if (seconds < 60) return "< 1 min"

  const totalMinutes = Math.ceil(seconds / 60)
  if (totalMinutes < 60) return `~${totalMinutes} min`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) return `~${hours}h`
  return `~${hours}h ${minutes}m`
}

export const estimateSecondsRemaining = (
  previous: { processedUnits: number; atMs: number } | null,
  current: { processedUnits: number; totalUnits: number; atMs: number }
): number | null => {
  if (!previous) return null

  const deltaUnits = current.processedUnits - previous.processedUnits
  const deltaMs = current.atMs - previous.atMs
  if (deltaUnits <= 0 || deltaMs <= 0) return null

  const remaining = current.totalUnits - current.processedUnits
  if (remaining <= 0) return 0

  const unitsPerMs = deltaUnits / deltaMs
  return remaining / unitsPerMs / 1000
}

export const resolveEtaSeconds = (input: {
  rateEtaSeconds: number | null
  jobEtaSeconds: number | null
  isActive: boolean
  isComplete: boolean
}): number | null => {
  if (input.isComplete || !input.isActive) return null
  if (input.rateEtaSeconds != null && input.rateEtaSeconds > 0) {
    return input.rateEtaSeconds
  }
  if (input.jobEtaSeconds != null && input.jobEtaSeconds > 0) {
    return input.jobEtaSeconds
  }
  return null
}

export const estimateEtaFromActiveJobs = (
  activeJobs: Array<{
    kind: string
    progress?: JobProgress
    payload?: { cursor?: number; appids?: number[]; stats?: JobProgress }
  }>
): number | null => {
  let totalRemaining = 0
  let hasProgress = false

  for (const job of activeJobs) {
    const stats = job.payload?.stats
    const progress = job.progress
    const checked =
      progress?.checked ?? stats?.checked ?? job.payload?.cursor
    const total =
      progress?.total ?? stats?.total ?? job.payload?.appids?.length

    if (checked == null || total == null || total <= checked) continue

    hasProgress = true
    totalRemaining += total - checked
  }

  if (!hasProgress || totalRemaining <= 0) return null

  const secondsPerItem = 0.35
  return totalRemaining * secondsPerItem
}
