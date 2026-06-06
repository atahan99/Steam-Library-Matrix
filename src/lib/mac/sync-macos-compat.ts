import { getDb } from "@/lib/db/client"
import {
  getMacosCompatCatalogStats,
  getMacosCompatEntryCount,
  loadMacosCompatCatalogIndex,
  replaceMacosCompatCatalog,
  replaceMacosCompatEntries,
  type MacCatalogIndex,
  type MacCatalogRow,
  type MacCompatEntryInput,
} from "@/lib/db/macos-compat"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
import { steamGames } from "@/lib/db/schema"
import { fetchAppleGamingWikiCatalog } from "@/lib/mac/fetch-applegamingwiki"
import { calcNameSimilarity } from "@/lib/enrichment/hltb-client"
import { normalizeGameName } from "@/lib/utils/normalize-game-name"
import { isPlaceholderGameName } from "@/lib/utils/placeholder-game-name"

const FUZZY_THRESHOLD = 0.85

export type MacMatchConfidence = "exact-title" | "fuzzy-title"

export type MacMatch = {
  row: MacCatalogRow
  confidence: MacMatchConfidence
}

export const matchMacosCompat = (
  index: MacCatalogIndex,
  gameName: string
): MacMatch | null => {
  const normalized = normalizeGameName(gameName)
  if (!normalized) return null

  const exact = index.byName.get(normalized)
  if (exact) return { row: exact, confidence: "exact-title" }

  let best: MacCatalogRow | undefined
  let bestScore = 0
  const maxLenDiff = Math.max(
    1,
    Math.floor(gameName.length * (1 - FUZZY_THRESHOLD))
  )
  for (const candidate of index.rows) {
    if (Math.abs(candidate.pageName.length - gameName.length) > maxLenDiff) {
      continue
    }
    const score = calcNameSimilarity(candidate.pageName, gameName)
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  if (best && bestScore >= FUZZY_THRESHOLD) {
    return { row: best, confidence: "fuzzy-title" }
  }
  return null
}

const rematchAllGames = async (index: MacCatalogIndex): Promise<number> => {
  const db = getDb()
  const games = await db
    .select({ appid: steamGames.appid, name: steamGames.name })
    .from(steamGames)

  const entries: MacCompatEntryInput[] = []
  for (const game of games) {
    if (!game.name || isPlaceholderGameName(game.name)) continue
    const match = matchMacosCompat(index, game.name)
    if (!match) continue
    entries.push({
      appid: game.appid,
      matchedName: match.row.pageName,
      matchConfidence: match.confidence,
      native: match.row.native,
      rosetta2: match.row.rosetta2,
      crossover: match.row.crossover,
      parallels: match.row.parallels,
    })
  }

  await replaceMacosCompatEntries(entries)
  return entries.length
}

/** Re-match every known game against the stored catalog — no network. */
export const rematchMacosCompatEntries = async (): Promise<number> => {
  const index = await loadMacosCompatCatalogIndex()
  return rematchAllGames(index)
}

/** Ensure the AppleGamingWiki catalog is present, fetching only if empty. */
export const ensureMacosCompatCatalog = async (): Promise<number> => {
  const stats = await getMacosCompatCatalogStats()
  if (stats.count > 0) return stats.count
  const rows = await fetchAppleGamingWikiCatalog()
  const { count } = await replaceMacosCompatCatalog(rows)
  return count
}

export type MacSyncResult = {
  catalogCount: number
  entryCount: number
}

/** Fetch the AppleGamingWiki catalog and re-match it against every known game. */
export const syncMacosCompat = async (
  steamid?: string
): Promise<MacSyncResult> => {
  const logId = steamid
    ? await startRefreshLog(steamid, "macos_compat").catch(() => null)
    : null
  try {
    const rows = await fetchAppleGamingWikiCatalog()
    const { count: catalogCount } = await replaceMacosCompatCatalog(rows)
    const index = await loadMacosCompatCatalogIndex()
    const entryCount = await rematchAllGames(index)
    if (logId != null) {
      await finishRefreshLog(
        logId,
        "success",
        `${catalogCount} games in catalog, ${entryCount} matched`
      )
    }
    return { catalogCount, entryCount }
  } catch (error) {
    if (logId != null) {
      await finishRefreshLog(
        logId,
        "failed",
        error instanceof Error ? error.message : "Mac compatibility sync failed"
      )
    }
    throw error
  }
}

let isReady = false
let inflight: Promise<void> | null = null

/**
 * Populate the Mac compatibility catalog + entries on first use.
 * Non-blocking: kicks off a background sync if empty and returns immediately,
 * so the first dashboard load is never slowed by the AppleGamingWiki fetch.
 */
export const ensureMacosCompatReady = async (): Promise<void> => {
  if (isReady) return
  const entryCount = await getMacosCompatEntryCount().catch(() => 0)
  if (entryCount > 0) {
    isReady = true
    return
  }
  if (!inflight) {
    inflight = (async () => {
      // Catalog may already be seeded — re-match without a network fetch.
      const stats = await getMacosCompatCatalogStats().catch(() => ({ count: 0 }))
      if (stats.count > 0) {
        await rematchMacosCompatEntries()
      } else {
        await syncMacosCompat()
      }
    })()
      .then(() => {
        isReady = true
      })
      .catch((error) => {
        console.warn("[macos-compat] initial population failed:", error)
      })
      .finally(() => {
        inflight = null
      })
  }
}
