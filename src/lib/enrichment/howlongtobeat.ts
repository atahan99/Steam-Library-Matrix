/**
 * HowLongToBeat is an unofficial enrichment source.
 * The lookup API may break without notice — failures must not block the dashboard.
 */
import { inArray } from "drizzle-orm"
import { getProfileGamesForEnrichment } from "@/lib/db/profile-appids"
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
import { isCacheFresh } from "@/lib/utils/cache"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"

const TTL_HOURS = 720
const CONCURRENCY = 4
const DELAY_MS = 400

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

type EnrichResult = {
  checked: number
  updated: number
  failed: number
  skippedLowConfidence: number
}

const enrichOneGame = async (
  appid: number,
  gameName: string
): Promise<
  | { status: "updated"; row: Record<string, unknown> }
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

  const now = new Date().toISOString()

  return {
    status: "updated",
    row: {
      appid,
      hltb_id: match.hit.gameId,
      matched_name: detail.gameName,
      match_confidence: matchConfidence,
      main_story_minutes: mainStoryMinutes,
      main_extra_minutes: mainExtraMinutes,
      completionist_minutes: completionistMinutes,
      all_styles_minutes: allStylesMinutes,
      image_url: detail.imageUrl ?? match.hit.imageUrl ?? null,
      platforms: detail.platforms.length ? detail.platforms : match.hit.platforms ?? null,
      review_score: detail.reviewScore ?? match.hit.reviewScore ?? null,
      source_url: `https://howlongtobeat.com/game/${match.hit.gameId}`,
      last_checked_at: now,
      updated_at: now,
    },
  }
}

export const enrichHowLongToBeat = async (
  steamid: string,
  force = false,
  missingOnly = false
): Promise<EnrichResult> => {
  const logId = await startRefreshLog(steamid, "howlongtobeat")
  const db = getDb()

  let rows: { appid: number; name: string }[]
  try {
    rows = await getProfileGamesForEnrichment(steamid)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load games"
    await finishRefreshLog(logId, "failed", message)
    throw error
  }

  if (missingOnly && rows.length > 0) {
    const appids = rows.map((row) => row.appid)
    const existing = await db
      .select({
        appid: howlongtobeatEntries.appid,
        mainStoryMinutes: howlongtobeatEntries.mainStoryMinutes,
      })
      .from(howlongtobeatEntries)
      .where(inArray(howlongtobeatEntries.appid, appids))

    const enriched = new Set(
      existing
        .filter((entry) => entry.mainStoryMinutes)
        .map((entry) => entry.appid)
    )
    rows = rows.filter((row) => !enriched.has(row.appid))
  }

  const shouldForce = force

  if (!shouldForce && rows.length > 0) {
    const appids = rows.map((row) => row.appid)
    const existingFresh = await db
      .select({
        appid: howlongtobeatEntries.appid,
        lastCheckedAt: howlongtobeatEntries.lastCheckedAt,
      })
      .from(howlongtobeatEntries)
      .where(inArray(howlongtobeatEntries.appid, appids))

    const freshAppids = new Set(
      existingFresh
        .filter((entry) =>
          isCacheFresh(entry.lastCheckedAt?.toISOString(), TTL_HOURS)
        )
        .map((entry) => entry.appid)
    )
    rows = rows.filter((row) => !freshAppids.has(row.appid))
  }

  type RowStats = {
    checked: number
    updated: number
    failed: number
    skippedLowConfidence: number
  }

  const emptyStats = (): RowStats => ({
    checked: 0,
    updated: 0,
    failed: 0,
    skippedLowConfidence: 0,
  })

  const queue = [...rows]

  const processRow = async (row: { appid: number; name: string }): Promise<RowStats> => {
    const stats = emptyStats()
    const appid = row.appid
    const gameName = row.name

    stats.checked = 1

    const result = await enrichOneGame(appid, gameName)

    if (result.status === "updated") {
      const row = result.row
      try {
        await db
          .insert(howlongtobeatEntries)
          .values({
            appid: row.appid as number,
            hltbId: row.hltb_id as string,
            matchedName: row.matched_name as string,
            matchConfidence: (row.match_confidence as number) ?? null,
            mainStoryMinutes: row.main_story_minutes as number | null,
            mainExtraMinutes: row.main_extra_minutes as number | null,
            completionistMinutes: row.completionist_minutes as number | null,
            allStylesMinutes: row.all_styles_minutes as number | null,
            imageUrl: row.image_url as string | null,
            platforms: row.platforms as string[] | null,
            reviewScore: row.review_score as number | null,
            sourceUrl: row.source_url as string,
            lastCheckedAt: new Date(row.last_checked_at as string),
            updatedAt: new Date(row.updated_at as string),
          })
          .onConflictDoUpdate({
            target: howlongtobeatEntries.appid,
            set: {
              hltbId: row.hltb_id as string,
              matchedName: row.matched_name as string,
              matchConfidence: (row.match_confidence as number) ?? null,
              mainStoryMinutes: row.main_story_minutes as number | null,
              mainExtraMinutes: row.main_extra_minutes as number | null,
              completionistMinutes: row.completionist_minutes as number | null,
              allStylesMinutes: row.all_styles_minutes as number | null,
              imageUrl: row.image_url as string | null,
              platforms: row.platforms as string[] | null,
              reviewScore: row.review_score as number | null,
              sourceUrl: row.source_url as string,
              lastCheckedAt: new Date(row.last_checked_at as string),
              updatedAt: new Date(row.updated_at as string),
            },
          })
        stats.updated = 1
      } catch (upsertError) {
        stats.failed = 1
        const message =
          upsertError instanceof Error ? upsertError.message : "upsert failed"
        console.warn(`[hltb] upsert failed appid=${appid}`, message)
      }
    } else if (result.status === "skipped") {
      stats.skippedLowConfidence = 1
      console.warn(`[hltb] skipped appid=${appid} (${gameName}): ${result.reason}`)
      try {
        await upsertHltbNegativeCache(appid, `skipped: ${result.reason}`)
      } catch (cacheError) {
        const message =
          cacheError instanceof Error ? cacheError.message : "negative cache upsert failed"
        console.warn(`[hltb] negative cache failed appid=${appid}`, message)
      }
    } else {
      stats.failed = 1
      console.warn(`[hltb] failed appid=${appid} (${gameName}): ${result.reason}`)
      try {
        await upsertHltbNegativeCache(appid, `failed: ${result.reason}`)
      } catch (cacheError) {
        const message =
          cacheError instanceof Error ? cacheError.message : "negative cache upsert failed"
        console.warn(`[hltb] negative cache failed appid=${appid}`, message)
      }
    }

    await sleep(DELAY_MS)
    return stats
  }

  const mergeStats = (a: RowStats, b: RowStats): RowStats => ({
    checked: a.checked + b.checked,
    updated: a.updated + b.updated,
    failed: a.failed + b.failed,
    skippedLowConfidence: a.skippedLowConfidence + b.skippedLowConfidence,
  })

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    let workerStats = emptyStats()
    while (queue.length > 0) {
      const row = queue.shift()
      if (!row) break
      workerStats = mergeStats(workerStats, await processRow(row))
    }
    return workerStats
  })

  const workerResults = await Promise.all(workers)
  const totals = workerResults.reduce(mergeStats, emptyStats())
  const { checked, updated, failed, skippedLowConfidence } = totals

  const summary = `checked=${checked} updated=${updated} failed=${failed} skippedLowConfidence=${skippedLowConfidence}`
  await finishRefreshLog(
    logId,
    failed > 0 || skippedLowConfidence > 0 ? "partial" : "success",
    summary
  )

  return { checked, updated, failed, skippedLowConfidence }
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
  const db = getDb()
  const result = await enrichOneGame(appid, gameName)

  if (result.status === "updated") {
    const row = result.row
    try {
      await db
        .insert(howlongtobeatEntries)
        .values({
          appid: row.appid as number,
          hltbId: row.hltb_id as string,
          matchedName: row.matched_name as string,
          matchConfidence: (row.match_confidence as number) ?? null,
          mainStoryMinutes: row.main_story_minutes as number | null,
          mainExtraMinutes: row.main_extra_minutes as number | null,
          completionistMinutes: row.completionist_minutes as number | null,
          allStylesMinutes: row.all_styles_minutes as number | null,
          imageUrl: row.image_url as string | null,
          platforms: row.platforms as string[] | null,
          reviewScore: row.review_score as number | null,
          sourceUrl: row.source_url as string,
          lastCheckedAt: new Date(row.last_checked_at as string),
          updatedAt: new Date(row.updated_at as string),
        })
        .onConflictDoUpdate({
          target: howlongtobeatEntries.appid,
          set: {
            hltbId: row.hltb_id as string,
            matchedName: row.matched_name as string,
            matchConfidence: (row.match_confidence as number) ?? null,
            mainStoryMinutes: row.main_story_minutes as number | null,
            mainExtraMinutes: row.main_extra_minutes as number | null,
            completionistMinutes: row.completionist_minutes as number | null,
            allStylesMinutes: row.all_styles_minutes as number | null,
            imageUrl: row.image_url as string | null,
            platforms: row.platforms as string[] | null,
            reviewScore: row.review_score as number | null,
            sourceUrl: row.source_url as string,
            lastCheckedAt: new Date(row.last_checked_at as string),
            updatedAt: new Date(row.updated_at as string),
          },
        })
      await maybeDelay()
      return { checked: 1, updated: 1, failed: 0, skippedLowConfidence: 0 }
    } catch {
      await maybeDelay()
      return { checked: 1, updated: 0, failed: 1, skippedLowConfidence: 0 }
    }
  }

  if (result.status === "skipped") {
    try {
      await upsertHltbNegativeCache(appid, `skipped: ${result.reason}`)
    } catch {
      /* ignore */
    }
    await maybeDelay()
    return { checked: 1, updated: 0, failed: 0, skippedLowConfidence: 1 }
  }

  try {
    await upsertHltbNegativeCache(appid, `failed: ${result.reason}`)
  } catch {
    /* ignore */
  }
  await maybeDelay()
  return { checked: 1, updated: 0, failed: 1, skippedLowConfidence: 0 }
}
