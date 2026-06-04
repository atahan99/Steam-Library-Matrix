import type {
  AwacyNormalizedEntry,
  LevvvelNormalizedRow,
} from "@/lib/anticheat/anticheatTypes"

export type AwacyIndexes = {
  bySteamAppId: Map<string, AwacyNormalizedEntry>
  byName: Map<string, AwacyNormalizedEntry>
  entries: AwacyNormalizedEntry[]
}

export type LevvvelIndexes = {
  byName: Map<string, LevvvelNormalizedRow>
  rows: LevvvelNormalizedRow[]
  complete: boolean
  error?: string
}

export const indexAwacyEntries = (
  entries: AwacyNormalizedEntry[]
): AwacyIndexes => {
  const bySteamAppId = new Map<string, AwacyNormalizedEntry>()
  const byName = new Map<string, AwacyNormalizedEntry>()
  for (const entry of entries) {
    if (entry.steamAppId) bySteamAppId.set(entry.steamAppId, entry)
    byName.set(entry.normalizedName, entry)
  }
  return { bySteamAppId, byName, entries }
}

export const indexLevvvelRows = (
  rows: LevvvelNormalizedRow[],
  complete: boolean,
  error?: string
): LevvvelIndexes => ({
  byName: new Map(rows.map((r) => [r.normalizedName, r])),
  rows,
  complete,
  error,
})
