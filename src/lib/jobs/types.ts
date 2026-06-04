export const ENRICHMENT_JOB_KINDS = [
  "hltb",
  "app_details",
  "protondb",
  "achievements",
  "anticheat",
  "wishlist",
  "anticheat_catalog",
  "denuvo_catalog",
] as const

export type EnrichmentJobKind = (typeof ENRICHMENT_JOB_KINDS)[number]

export type JobProgress = {
  checked?: number
  total?: number
  updated?: number
  failed?: number
  skippedLowConfidence?: number
  message?: string
}

export type JobPayload = {
  force?: boolean
  missingOnly?: boolean
  countryCode?: string
  appids?: number[]
  scopeAppids?: number[]
  gameNames?: Record<string, string>
  cursor?: number
  stats?: JobProgress
  /** Anti-cheat job: catalog match first, then optional Denuvo store pass. */
  anticheatPhase?: "catalog" | "denuvo"
}

export type JobRecord = {
  id: string
  steamid: string
  kind: EnrichmentJobKind
  status: string
  payload: JobPayload
  progress: JobProgress
  error: string | null
  attempts: number
  createdAt: string | null
  startedAt: string | null
  finishedAt: string | null
}
