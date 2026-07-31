import type {
  EnrichmentJobKind,
  JobPayload,
  JobProgress,
} from "@/lib/jobs/types"

export type EnrichmentBatchResult = {
  checked: number
  updated: number
  failed: number
  processed: number
  skippedLowConfidence?: number
}

export type ResolveTargetsResult = {
  appids: number[]
  gameNames?: Record<string, string>
}

export type EnrichmentSourceResolveInput = {
  steamid: string
  payload: JobPayload
  force: boolean
  missingOnly: boolean
}

export type EnrichmentSourceBatchInput = {
  appids: number[]
  gameNames?: Record<string, string>
  cursor: number
  deadlineMs: number
  force: boolean
}

/** Internal per-appid enrichment source (ProtonDB, HLTB, …). */
export type EnrichmentSource = {
  kind: EnrichmentJobKind
  label: string
  /** Lower number = higher claim priority (matches worker SQL). */
  priority: number
  resolveTargets: (
    input: EnrichmentSourceResolveInput
  ) => Promise<ResolveTargetsResult>
  runBatch: (input: EnrichmentSourceBatchInput) => Promise<EnrichmentBatchResult>
}

export type RegisteredStepResult = {
  done: boolean
  payload: JobPayload
  progress: JobProgress
  error?: string
}
