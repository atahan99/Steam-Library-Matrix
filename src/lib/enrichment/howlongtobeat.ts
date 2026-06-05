/**
 * HowLongToBeat is an unofficial enrichment source.
 * The lookup API may break without notice — failures must not block the dashboard.
 */
import { getDb } from "@/lib/db/client"
import { howlongtobeatEntries } from "@/lib/db/schema"
import {
  computeAllStylesMinutes,
  fetchHltbDetail,
  hoursToMinutes,
  searchHltbGames,
} from "@/lib/enrichment/hltb-client"
import {
  buildSearchQuery,
  evaluateHltbDetailAcceptance,
  pickBestHltbHit,
  resolveHltbSearchQueries,
} from "@/lib/enrichment/hltb-match"
const DELAY_MS = 400

type HltbUpsertRow = {
  appid: number
  hltbId: string
  matchedName: string
  matchConfidence: number
  mainStoryMinutes: number | null
  mainExtraMinutes: number | null
  completionistMinutes: number | null
  allStylesMinutes: number | null
  imageUrl: string | null
  platforms: string[] | null
  reviewScore: number | null
  sourceUrl: string
  lastCheckedAt: Date
  updatedAt: Date
}

const upsertHltbSuccessRow = async (row: HltbUpsertRow) => {
  const db = getDb()
  await db
    .insert(howlongtobeatEntries)
    .values({
      appid: row.appid,
      hltbId: row.hltbId,
      matchedName: row.matchedName,
      matchConfidence: row.matchConfidence,
      mainStoryMinutes: row.mainStoryMinutes,
      mainExtraMinutes: row.mainExtraMinutes,
      completionistMinutes: row.completionistMinutes,
      allStylesMinutes: row.allStylesMinutes,
      imageUrl: row.imageUrl,
      platforms: row.platforms,
      reviewScore: row.reviewScore,
      sourceUrl: row.sourceUrl,
      lastCheckedAt: row.lastCheckedAt,
      updatedAt: row.updatedAt,
    })
    .onConflictDoUpdate({
      target: howlongtobeatEntries.appid,
      set: {
        hltbId: row.hltbId,
        matchedName: row.matchedName,
        matchConfidence: row.matchConfidence,
        mainStoryMinutes: row.mainStoryMinutes,
        mainExtraMinutes: row.mainExtraMinutes,
        completionistMinutes: row.completionistMinutes,
        allStylesMinutes: row.allStylesMinutes,
        imageUrl: row.imageUrl,
        platforms: row.platforms,
        reviewScore: row.reviewScore,
        sourceUrl: row.sourceUrl,
        lastCheckedAt: row.lastCheckedAt,
        updatedAt: row.updatedAt,
      },
    })
}

const upsertHltbNegativeCache = async (
  appid: number,
  reason: string,
  partial?: {
    hltbId?: string | null
    matchedName?: string | null
    matchConfidence?: number | null
  }
) => {
  const db = getDb()
  const now = new Date()
  const matchedName = partial?.matchedName ?? `[${reason}]`

  await db
    .insert(howlongtobeatEntries)
    .values({
      appid,
      hltbId: partial?.hltbId ?? null,
      matchedName,
      matchConfidence: partial?.matchConfidence ?? null,
      mainStoryMinutes: null,
      mainExtraMinutes: null,
      completionistMinutes: null,
      allStylesMinutes: null,
      lastCheckedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: howlongtobeatEntries.appid,
      set: {
        hltbId: partial?.hltbId ?? null,
        matchedName,
        matchConfidence: partial?.matchConfidence ?? null,
        lastCheckedAt: now,
        updatedAt: now,
      },
    })
}

const enrichOneGame = async (
  appid: number,
  gameName: string
): Promise<
  | { status: "updated"; row: HltbUpsertRow }
  | { status: "failed" | "skipped"; reason: string }
> => {
  const query = buildSearchQuery(gameName)
  if (!query) {
    return { status: "failed", reason: "empty name" }
  }

  let hits
  let match
  try {
    for (const query of resolveHltbSearchQueries(gameName)) {
      hits = await searchHltbGames(query)
      match = pickBestHltbHit(hits, appid, gameName)
      if (match.ok) break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "search failed"
    return { status: "failed", reason: message }
  }

  if (!match?.ok) {
    if (match?.reason === "low_confidence") {
      return {
        status: "skipped",
        reason: `low confidence (${((match.bestConfidence ?? 0) * 100).toFixed(0)}%)`,
      }
    }
    return { status: "failed", reason: "no results" }
  }

  let detail
  try {
    detail = await fetchHltbDetail(match.hit.gameId)
  } catch (err) {
    const message = err instanceof Error ? err.message : "detail failed"
    return { status: "failed", reason: message }
  }

  const mainStoryMinutes = hoursToMinutes(detail.mainStoryHours)
  const mainExtraMinutes = hoursToMinutes(detail.mainExtraHours)
  const completionistMinutes = hoursToMinutes(detail.completionistHours)
  const allStylesMinutes = computeAllStylesMinutes(
    mainStoryMinutes,
    mainExtraMinutes,
    completionistMinutes,
    hoursToMinutes(detail.allStylesHours)
  )

  if (!mainStoryMinutes && !mainExtraMinutes && !completionistMinutes) {
    return { status: "failed", reason: "no durations on detail page" }
  }

  const acceptance = evaluateHltbDetailAcceptance(appid, gameName, match, detail)
  if (!acceptance.ok) {
    return { status: "failed", reason: acceptance.reason }
  }

  if (acceptance.via === "edition_variant") {
    console.info(
      `[hltb] accepted name fallback appid=${appid} hltb=${match.hit.gameId} (HLTB steam ${detail.profileSteam ?? "none"})`
    )
  }

  const matchConfidence = acceptance.confidence

  const now = new Date()

  return {
    status: "updated",
    row: {
      appid,
      hltbId: match.hit.gameId,
      matchedName: detail.gameName,
      matchConfidence,
      mainStoryMinutes,
      mainExtraMinutes,
      completionistMinutes,
      allStylesMinutes,
      imageUrl: detail.imageUrl ?? match.hit.imageUrl ?? null,
      platforms: detail.platforms.length ? detail.platforms : match.hit.platforms ?? null,
      reviewScore: detail.reviewScore ?? match.hit.reviewScore ?? null,
      sourceUrl: `https://howlongtobeat.com/game/${match.hit.gameId}`,
      lastCheckedAt: now,
      updatedAt: now,
    },
  }
}

const sleepBetween = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Single-game HLTB enrich for background job steps. */
export const enrichSingleHowLongToBeatGame = async (
  appid: number,
  gameName: string,
  options?: { applyDelay?: boolean }
): Promise<{
  checked: number
  updated: number
  failed: number
  skippedLowConfidence: number
}> => {
  const applyDelay = options?.applyDelay ?? true
  const maybeDelay = async () => {
    if (applyDelay) {
      await sleepBetween(DELAY_MS)
    }
  }
  const result = await enrichOneGame(appid, gameName)

  if (result.status === "updated") {
    try {
      await upsertHltbSuccessRow(result.row)
      await maybeDelay()
      return { checked: 1, updated: 1, failed: 0, skippedLowConfidence: 0 }
    } catch (error) {
      console.warn(`[hltb] upsert failed appid=${appid}`, error)
      await maybeDelay()
      return { checked: 1, updated: 0, failed: 1, skippedLowConfidence: 0 }
    }
  }

  if (result.status === "skipped") {
    try {
      await upsertHltbNegativeCache(appid, `skipped: ${result.reason}`)
    } catch (error) {
      console.warn(`[hltb] Negative cache upsert failed for appid ${appid}:`, error)
    }
    await maybeDelay()
    return { checked: 1, updated: 0, failed: 0, skippedLowConfidence: 1 }
  }

  try {
    await upsertHltbNegativeCache(appid, `failed: ${result.reason}`)
  } catch (error) {
    console.warn(`[hltb] Negative cache upsert failed for appid ${appid}:`, error)
  }
  await maybeDelay()
  return { checked: 1, updated: 0, failed: 1, skippedLowConfidence: 0 }
}
