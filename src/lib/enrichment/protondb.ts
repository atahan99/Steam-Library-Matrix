import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { nextFetchInit, prepareServerEnv } from "@/lib/env/runtime-env"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"
import { protondbEntries, steamAppDetails } from "@/lib/db/schema"
import { PROTONDB_TTL_HOURS } from "@/lib/enrichment/resolve-enrichment-appids"
import { isCacheFresh } from "@/lib/utils/cache"
import { parseReleaseDate, isUnreleasedGame } from "@/lib/utils/parse-release-date"
import type { ProtonDbTier } from "@/types/dashboard"
import { delay } from "@/lib/utils/delay"

const PROTONDB_API = "https://www.protondb.com/api/v1/reports/summaries"
const PROTON_DELAY_MS = 200

const normalizeTier = (tier: string | undefined): ProtonDbTier => {
  const t = (tier ?? "").toLowerCase()
  if (
    t === "platinum" ||
    t === "gold" ||
    t === "silver" ||
    t === "bronze" ||
    t === "borked" ||
    t === "native"
  ) {
    return t
  }
  return "unknown"
}

type ProtonDbSummary = {
  tier: ProtonDbTier
  confidence: string | undefined
  totalReports: number | undefined
  latestReportedAt: string | undefined
  sourceUrl: string
}

type ProtonDbFetchResult =
  | { status: "ok"; summary: ProtonDbSummary }
  | { status: "not-found" }
  | { status: "error" }

export const fetchProtonDbSummary = async (
  appid: number
): Promise<ProtonDbFetchResult> => {
  await prepareServerEnv()
  const res = await fetchWithTimeout(
    `${PROTONDB_API}/${appid}.json`,
    nextFetchInit(0)
  )
  // 404 is a real answer: ProtonDB has no reports for this game — cache it so we
  // stop refetching. Other non-OK responses are transient, so let them retry.
  if (res.status === 404) return { status: "not-found" }
  if (!res.ok) return { status: "error" }
  const data = (await res.json()) as {
    tier?: string
    confidence?: string
    trends?: { testHour?: string }[]
    total?: number
  }
  return {
    status: "ok",
    summary: {
      tier: normalizeTier(data.tier),
      confidence: data.confidence,
      totalReports: data.total,
      latestReportedAt: data.trends?.[0]?.testHour,
      sourceUrl: `https://www.protondb.com/app/${appid}`,
    },
  }
}

/** Write a "checked, no tier" row — used for unreleased games and games with no ProtonDB reports. */
const upsertProtonDbSentinel = async (appid: number): Promise<boolean> => {
  const db = getDb()
  const now = new Date()
  try {
    await db
      .insert(protondbEntries)
      .values({
        appid,
        tier: null,
        confidence: null,
        totalReports: null,
        latestReportedAt: null,
        sourceUrl: null,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: protondbEntries.appid,
        set: {
          tier: null,
          confidence: null,
          totalReports: null,
          latestReportedAt: null,
          sourceUrl: null,
          lastCheckedAt: now,
          updatedAt: now,
        },
      })
    return true
  } catch (error) {
    console.error(`[protondb] unreleased sentinel upsert failed for ${appid}`, error)
    return false
  }
}

/** Single-app ProtonDB enrich for background job steps and full refresh. */
export const enrichSingleProtonDb = async (
  appid: number,
  force = false,
  options?: { applyDelay?: boolean }
): Promise<{ checked: number; updated: number; failed: number; skipped: number }> => {
  const db = getDb()

  if (!force) {
    const existingRows = await db
      .select({ lastCheckedAt: protondbEntries.lastCheckedAt })
      .from(protondbEntries)
      .where(eq(protondbEntries.appid, appid))
      .limit(1)
    if (isCacheFresh(existingRows[0]?.lastCheckedAt?.toISOString(), PROTONDB_TTL_HOURS)) {
      return { checked: 1, updated: 0, failed: 0, skipped: 1 }
    }
  }

  try {
    const appDetailRows = await db
      .select({ releaseDate: steamAppDetails.releaseDate })
      .from(steamAppDetails)
      .where(eq(steamAppDetails.appid, appid))
      .limit(1)

    const releaseDate = parseReleaseDate(appDetailRows[0]?.releaseDate)
    if (isUnreleasedGame(releaseDate)) {
      if (await upsertProtonDbSentinel(appid)) {
        return { checked: 1, updated: 1, failed: 0, skipped: 0 }
      }
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }

    const result = await fetchProtonDbSummary(appid)
    const now = new Date()
    if (result.status === "error") {
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }
    if (result.status === "not-found") {
      // No ProtonDB reports — record the check so we don't refetch every pass.
      if (await upsertProtonDbSentinel(appid)) {
        return { checked: 1, updated: 1, failed: 0, skipped: 0 }
      }
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }
    const summary = result.summary
    try {
      await db
        .insert(protondbEntries)
        .values({
          appid,
          tier: summary.tier,
          confidence: summary.confidence,
          totalReports: summary.totalReports,
          latestReportedAt: summary.latestReportedAt
            ? new Date(summary.latestReportedAt)
            : null,
          sourceUrl: summary.sourceUrl,
          lastCheckedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: protondbEntries.appid,
          set: {
            tier: summary.tier,
            confidence: summary.confidence,
            totalReports: summary.totalReports,
            latestReportedAt: summary.latestReportedAt
              ? new Date(summary.latestReportedAt)
              : null,
            sourceUrl: summary.sourceUrl,
            lastCheckedAt: now,
            updatedAt: now,
          },
        })
      if (options?.applyDelay !== false) {
        await delay(PROTON_DELAY_MS)
      }
      return { checked: 1, updated: 1, failed: 0, skipped: 0 }
    } catch (error) {
      console.error(`[protondb] upsert failed for ${appid}`, error)
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }
  } catch (error) {
    console.error(`[protondb] enrich failed for ${appid}`, error)
    return { checked: 1, updated: 0, failed: 1, skipped: 0 }
  }
}
