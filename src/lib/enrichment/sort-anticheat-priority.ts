import type { DenuvoFreshnessRow } from "@/lib/steam/denuvo/is-denuvo-data-fresh"
import { isDenuvoDataFresh } from "@/lib/steam/denuvo/is-denuvo-data-fresh"

export type AnticheatPriorityRow = {
  appid: number
  denuvoAntiTamper?: boolean | null
  denuvoConfidence?: string | null
  denuvoCheckedAt?: Date | string | null
}

export type SortAnticheatPriorityOptions = {
  scopeAppids?: number[]
}

const priorityScore = (
  row: AnticheatPriorityRow,
  scopeSet: Set<number>
): number => {
  if (scopeSet.has(row.appid)) return 0

  const freshness: DenuvoFreshnessRow = {
    denuvoAntiTamper: row.denuvoAntiTamper ?? null,
    denuvoConfidence: row.denuvoConfidence ?? null,
    denuvoCheckedAt: row.denuvoCheckedAt ?? null,
  }

  if (!row.denuvoCheckedAt && row.denuvoAntiTamper == null) return 1

  if (row.denuvoAntiTamper === null || row.denuvoConfidence == null) return 2

  if (
    row.denuvoConfidence === "medium" ||
    row.denuvoConfidence === "low"
  ) {
    if (!isDenuvoDataFresh(freshness)) return 3
    return 4
  }

  if (row.denuvoConfidence === "high") {
    if (!isDenuvoDataFresh(freshness)) return 5
    return 6
  }

  return 4
}

/** Lower score = higher priority for background Denuvo refresh. */
export const sortAnticheatByPriority = <T extends AnticheatPriorityRow>(
  rows: T[],
  options: SortAnticheatPriorityOptions = {}
): T[] => {
  const scopeSet = new Set(options.scopeAppids ?? [])

  return [...rows].sort((a, b) => {
    const scoreDiff = priorityScore(a, scopeSet) - priorityScore(b, scopeSet)
    if (scoreDiff !== 0) return scoreDiff
    return a.appid - b.appid
  })
}
