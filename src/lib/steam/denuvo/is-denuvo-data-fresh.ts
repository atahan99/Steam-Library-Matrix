import { isCacheFresh } from "@/lib/utils/cache"
import {
  DENUVO_HIGH_CONFIDENCE_TTL_HOURS,
  DENUVO_LOW_UNKNOWN_TTL_HOURS,
  DENUVO_MEDIUM_CONFIDENCE_TTL_HOURS,
} from "@/lib/enrichment/enrichment-ttl"
import type { DenuvoConfidence } from "@/lib/steam/denuvo/types"

export type DenuvoFreshnessRow = {
  denuvoAntiTamper: boolean | null
  denuvoConfidence: string | null
  denuvoCheckedAt: Date | string | null | undefined
}

const ttlForConfidence = (confidence: string | null | undefined): number => {
  switch (confidence as DenuvoConfidence | null | undefined) {
    case "high":
      return DENUVO_HIGH_CONFIDENCE_TTL_HOURS
    case "medium":
      return DENUVO_MEDIUM_CONFIDENCE_TTL_HOURS
    case "low":
      return DENUVO_LOW_UNKNOWN_TTL_HOURS
    default:
      return DENUVO_LOW_UNKNOWN_TTL_HOURS
  }
}

export const isDenuvoDataFresh = (row: DenuvoFreshnessRow | null | undefined): boolean => {
  if (!row?.denuvoCheckedAt) return false

  if (row.denuvoAntiTamper === null && row.denuvoConfidence == null) {
    return false
  }

  const checkedAt =
    row.denuvoCheckedAt instanceof Date
      ? row.denuvoCheckedAt.toISOString()
      : String(row.denuvoCheckedAt)

  const ttl = ttlForConfidence(row.denuvoConfidence)
  return isCacheFresh(checkedAt, ttl)
}

export const isDenuvoStoreRefreshNeeded = (
  row: DenuvoFreshnessRow | null | undefined,
  force: boolean
): boolean => {
  if (force) return true
  return !isDenuvoDataFresh(row)
}
