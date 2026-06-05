import type { SeedDenuvoConfidence } from "@/lib/seed/types"

export type ExistingDenuvoRow = {
  denuvoAntiTamper: boolean | null
  denuvoConfidence: string | null
  denuvoSource: string | null
  denuvoCheckedAt: Date | null
}

export type SeedDenuvoRow = {
  hasDenuvoAntiTamper: boolean | null
  confidence: SeedDenuvoConfidence
  source: string
  checkedAt: string
}

const CONFIDENCE_RANK: Record<string, number> = {
  high: 4,
  medium: 3,
  low: 2,
  none: 1,
}

const parseCheckedAtMs = (value: string | Date | null | undefined): number => {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const compareConfidence = (
  a: string | null | undefined,
  b: string | null | undefined
): number =>
  (CONFIDENCE_RANK[a ?? "none"] ?? 0) - (CONFIDENCE_RANK[b ?? "none"] ?? 0)

/** Seed is a starting point — never overwrite newer or higher-confidence live data. */
export const shouldApplySeedDenuvoRow = (
  existing: ExistingDenuvoRow | null | undefined,
  seed: SeedDenuvoRow
): boolean => {
  if (!existing?.denuvoCheckedAt && existing?.denuvoAntiTamper == null) {
    return true
  }

  const existingMs = parseCheckedAtMs(existing?.denuvoCheckedAt)
  const seedMs = parseCheckedAtMs(seed.checkedAt)

  if (existingMs > seedMs) return false

  if (existingMs === seedMs) {
    if (
      existing?.denuvoSource &&
      existing.denuvoSource !== "seed" &&
      compareConfidence(existing.denuvoConfidence, seed.confidence) >= 0
    ) {
      return false
    }
  }

  if (
    existing?.denuvoSource &&
    existing.denuvoSource !== "seed" &&
    existingMs >= seedMs &&
    compareConfidence(existing.denuvoConfidence, seed.confidence) > 0
  ) {
    return false
  }

  return true
}

export const shouldApplySeedTimestamp = (
  existingCheckedAt: Date | null | undefined,
  seedCheckedAt: string
): boolean =>
  parseCheckedAtMs(existingCheckedAt) <= parseCheckedAtMs(seedCheckedAt)

export const isPlaceholderGameName = (name: string): boolean =>
  /^App \d+$/i.test(name.trim())
