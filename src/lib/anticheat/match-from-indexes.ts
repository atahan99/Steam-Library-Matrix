import type {
  AntiCheatLookupResult,
  AntiCheatMatchConfidence,
  AwacyNormalizedEntry,
  LevvvelNormalizedRow,
} from "@/lib/anticheat/anticheatTypes"
import type {
  AwacyIndexes,
  LevvvelIndexes,
} from "@/lib/anticheat/anticheat-indexes"
import { AWACY_SITE } from "@/lib/anticheat/anticheatTypes"
import { calcNameSimilarity } from "@/lib/enrichment/hltb-client"
import { normalizeGameName } from "@/lib/utils/normalize-game-name"

const FUZZY_THRESHOLD = 0.85

export const findAwacyMatch = (
  indexes: AwacyIndexes,
  gameName: string,
  steamAppId?: string | number
): { entry?: AwacyNormalizedEntry; confidence: AntiCheatMatchConfidence } => {
  const appIdStr =
    steamAppId !== undefined && steamAppId !== null
      ? String(steamAppId)
      : undefined

  if (appIdStr) {
    const byId = indexes.bySteamAppId.get(appIdStr)
    if (byId) return { entry: byId, confidence: "appid" }
  }

  const normalized = normalizeGameName(gameName)
  const exact = indexes.byName.get(normalized)
  if (exact) return { entry: exact, confidence: "exact-title" }

  let best: AwacyNormalizedEntry | undefined
  let bestScore = 0
  const maxLenDiff = Math.max(1, Math.floor(gameName.length * (1 - FUZZY_THRESHOLD)))
  for (const candidate of indexes.entries) {
    if (Math.abs(candidate.name.length - gameName.length) > maxLenDiff) continue
    const score = calcNameSimilarity(candidate.name, gameName)
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  if (best && bestScore >= FUZZY_THRESHOLD) {
    return { entry: best, confidence: "fuzzy-title" }
  }

  return { confidence: "none" }
}

export const findLevvvelMatch = (
  indexes: LevvvelIndexes,
  gameName: string,
  confidence: AntiCheatMatchConfidence,
  awacyEntry?: AwacyNormalizedEntry
): LevvvelNormalizedRow | undefined => {
  const normalized = normalizeGameName(gameName)
  const exact = indexes.byName.get(normalized)
  if (exact) return exact

  if (awacyEntry) {
    const fromAwacyName = indexes.byName.get(awacyEntry.normalizedName)
    if (fromAwacyName) return fromAwacyName
  }

  if (confidence === "appid" || confidence === "exact-title") {
    return undefined
  }

  let best: LevvvelNormalizedRow | undefined
  let bestScore = 0
  const maxLenDiff = Math.max(1, Math.floor(gameName.length * (1 - FUZZY_THRESHOLD)))
  for (const candidate of indexes.rows) {
    if (Math.abs(candidate.name.length - gameName.length) > maxLenDiff) continue
    const score = calcNameSimilarity(candidate.name, gameName)
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  if (best && bestScore >= FUZZY_THRESHOLD) return best
  return undefined
}

export const buildAntiCheatLookupResult = (
  gameName: string,
  steamAppId: string | undefined,
  awacyEntry: AwacyNormalizedEntry | undefined,
  awacyConfidence: AntiCheatMatchConfidence,
  levvvelRow: LevvvelNormalizedRow | undefined,
  levvvelComplete: boolean
): AntiCheatLookupResult => {
  const result: AntiCheatLookupResult = {
    name: gameName,
    steamAppId,
    confidence: awacyConfidence,
    levvvelDatasetComplete: levvvelComplete,
  }

  if (awacyEntry) {
    result.linuxAntiCheatStatus = {
      source: "areweanticheatyet",
      status: awacyEntry.status,
      antiCheats: awacyEntry.antiCheats,
      notes: awacyEntry.notes.map((n) =>
        n.url ? `${n.text} (${n.url})` : n.text
      ),
      updates: awacyEntry.updates,
      dateChanged: awacyEntry.dateChanged,
      slug: awacyEntry.slug,
      url: awacyEntry.slug
        ? `${AWACY_SITE}/game/${awacyEntry.slug}`
        : awacyEntry.url,
      native: awacyEntry.native,
      matchedName: awacyEntry.name,
    }
  }

  if (levvvelRow) {
    result.kernelAntiCheat = {
      source: "levvvel",
      hasKernelLevelAntiCheat: true,
      antiCheats: levvvelRow.antiCheats,
      developer: levvvelRow.developer,
      publisher: levvvelRow.publisher,
      matchedName: levvvelRow.name,
    }
  } else if (levvvelComplete) {
    result.kernelAntiCheat = {
      source: "levvvel",
      hasKernelLevelAntiCheat: false,
      antiCheats: [],
    }
  }

  if (!awacyEntry && levvvelRow) {
    result.confidence = "exact-title"
  }

  return result
}

export const matchAntiCheatFromIndexes = (
  awacyIndexes: AwacyIndexes,
  levvvelIndexes: LevvvelIndexes,
  gameName: string,
  steamAppId?: string | number
): AntiCheatLookupResult => {
  const appIdStr =
    steamAppId !== undefined && steamAppId !== null
      ? String(steamAppId)
      : undefined

  const { entry: awacyEntry, confidence: awacyConfidence } = findAwacyMatch(
    awacyIndexes,
    gameName,
    steamAppId
  )

  const levvvelRow = findLevvvelMatch(
    levvvelIndexes,
    gameName,
    awacyConfidence,
    awacyEntry
  )

  return buildAntiCheatLookupResult(
    gameName,
    appIdStr,
    awacyEntry,
    awacyConfidence,
    levvvelRow,
    levvvelIndexes.complete
  )
}

export const isMeaningfulAntiCheatLookup = (
  result: AntiCheatLookupResult
): boolean => {
  const hasAwacy =
    Boolean(result.linuxAntiCheatStatus) &&
    result.linuxAntiCheatStatus?.status !== "Unknown"
  const hasSoftware =
    Boolean(result.linuxAntiCheatStatus?.antiCheats?.length) ||
    Boolean(result.kernelAntiCheat?.antiCheats?.length)
  const hasKernelDecision =
    result.kernelAntiCheat?.hasKernelLevelAntiCheat === true ||
    result.kernelAntiCheat?.hasKernelLevelAntiCheat === false

  return hasAwacy || hasSoftware || hasKernelDecision
}
