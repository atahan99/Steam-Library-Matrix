import { eq } from "drizzle-orm"
import { getProfileAppids } from "@/lib/db/profile-appids"
import { getDb } from "@/lib/db/client"
import { nextFetchInit, prepareServerEnv } from "@/lib/env/runtime-env"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"
import { protondbEntries, steamAppDetails } from "@/lib/db/schema"
import { PROTONDB_TTL_HOURS } from "@/lib/enrichment/resolve-enrichment-appids"
import { isCacheFresh } from "@/lib/utils/cache"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
import { parseReleaseDate, isUnreleasedGame } from "@/lib/utils/parse-release-date"
import type { ProtonDbTier } from "@/types/dashboard"

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

export const fetchProtonDbSummary = async (appid: number) => {
  await prepareServerEnv()
  const res = await fetchWithTimeout(
    `${PROTONDB_API}/${appid}.json`,
    nextFetchInit(0)
  )
  if (!res.ok) return null
  const data = (await res.json()) as {
    tier?: string
    confidence?: string
    trends?: { testHour?: string }[]
    total?: number
  }
  return {
    tier: normalizeTier(data.tier),
    confidence: data.confidence,
    totalReports: data.total,
    latestReportedAt: data.trends?.[0]?.testHour,
    sourceUrl: `https://www.protondb.com/app/${appid}`,
  }
}

const upsertUnreleasedSentinel = async (appid: number): Promise<boolean> => {
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
  } catch {
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
      if (await upsertUnreleasedSentinel(appid)) {
        return { checked: 1, updated: 1, failed: 0, skipped: 0 }
      }
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }

    const summary = await fetchProtonDbSummary(appid)
    const now = new Date()
    if (!summary) {
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }
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
        await new Promise((r) => setTimeout(r, PROTON_DELAY_MS))
      }
      return { checked: 1, updated: 1, failed: 0, skipped: 0 }
    } catch {
      return { checked: 1, updated: 0, failed: 1, skipped: 0 }
    }
  } catch {
    return { checked: 1, updated: 0, failed: 1, skipped: 0 }
  }
}

export const enrichProtonDb = async (
  steamid: string,
  force = false
): Promise<{ checked: number; updated: number; failed: number }> => {
  const logId = await startRefreshLog(steamid, "protondb")

  let appids: number[]
  try {
    appids = await getProfileAppids(steamid)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load appids"
    await finishRefreshLog(logId, "failed", message)
    throw error
  }

  let checked = 0
  let updated = 0
  let failed = 0

  for (const appid of appids) {
    const result = await enrichSingleProtonDb(appid, force)
    checked += result.checked
    updated += result.updated
    failed += result.failed
  }

  await finishRefreshLog(
    logId,
    failed > 0 ? "partial" : "success",
    `checked=${checked} updated=${updated} failed=${failed}`
  )
  return { checked, updated, failed }
}
