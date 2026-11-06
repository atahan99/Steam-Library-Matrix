import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { steamspyEntries } from "@/lib/db/schema"
import { STEAMSPY_TTL_HOURS } from "@/lib/enrichment/enrichment-ttl"
import { isCacheFresh } from "@/lib/utils/cache"
import { delay } from "@/lib/utils/delay"
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout"

const STEAMSPY_API = "https://steamspy.com/api.php?request=appdetails&appid="
// SteamSpy asks clients to stay at or below 1 request per second for appdetails.
const STEAMSPY_DELAY_MS = 1000
// SteamSpy returns up to ~20 user tags; keep them all (the top few mostly repeat store genres).
const MAX_TAGS = 20

export type SteamSpySummary = {
  positive: number
  negative: number
  owners: string | null
  ccu: number
  tags: string[]
}

const toCount = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

/** Parse an appdetails response; null when SteamSpy doesn't know the app (it answers name: null). */
export const parseSteamSpyAppDetails = (json: unknown): SteamSpySummary | null => {
  if (!json || typeof json !== "object") return null
  const data = json as Record<string, unknown>
  if (data.name == null) return null

  // Tags arrive as { "Open World": 6081, ... } or [] when there are none.
  const rawTags = data.tags && !Array.isArray(data.tags) ? (data.tags as Record<string, unknown>) : {}
  const tags = Object.entries(rawTags)
    .sort(([, a], [, b]) => toCount(b) - toCount(a))
    .slice(0, MAX_TAGS)
    .map(([tag]) => tag)

  return {
    positive: toCount(data.positive),
    negative: toCount(data.negative),
    owners: typeof data.owners === "string" && data.owners.trim() ? data.owners.trim() : null,
    ccu: toCount(data.ccu),
    tags,
  }
}

type SteamSpyFetchResult =
  | { status: "ok"; summary: SteamSpySummary }
  | { status: "not-found" }
  | { status: "error" }

export const fetchSteamSpySummary = async (appid: number): Promise<SteamSpyFetchResult> => {
  try {
    const res = await fetchWithTimeout(`${STEAMSPY_API}${appid}`, { cache: "no-store" })
    if (!res.ok) return { status: "error" }
    const summary = parseSteamSpyAppDetails(await res.json())
    return summary ? { status: "ok", summary } : { status: "not-found" }
  } catch {
    return { status: "error" }
  }
}

const upsertSteamSpyRow = async (appid: number, summary: SteamSpySummary | null) => {
  const now = new Date()
  const values = {
    positive: summary?.positive ?? null,
    negative: summary?.negative ?? null,
    owners: summary?.owners ?? null,
    ccu: summary?.ccu ?? null,
    tags: summary?.tags ?? null,
    lastCheckedAt: now,
    updatedAt: now,
  }
  await getDb()
    .insert(steamspyEntries)
    .values({ appid, ...values })
    .onConflictDoUpdate({ target: steamspyEntries.appid, set: values })
}

/** Single-app SteamSpy enrich for the registry step. Not-found is cached; errors retry next pass. */
export const enrichSingleSteamSpy = async (
  appid: number,
  force = false
): Promise<{ checked: number; updated: number; failed: number; skipped: number }> => {
  if (!force) {
    const existing = await getDb()
      .select({ lastCheckedAt: steamspyEntries.lastCheckedAt })
      .from(steamspyEntries)
      .where(eq(steamspyEntries.appid, appid))
      .limit(1)
    if (isCacheFresh(existing[0]?.lastCheckedAt?.toISOString(), STEAMSPY_TTL_HOURS)) {
      return { checked: 1, updated: 0, failed: 0, skipped: 1 }
    }
  }

  const result = await fetchSteamSpySummary(appid)
  await delay(STEAMSPY_DELAY_MS)
  if (result.status === "error") return { checked: 1, updated: 0, failed: 1, skipped: 0 }

  try {
    await upsertSteamSpyRow(appid, result.status === "ok" ? result.summary : null)
    return { checked: 1, updated: 1, failed: 0, skipped: 0 }
  } catch (error) {
    console.error(`[steamspy] upsert failed for ${appid}`, error)
    return { checked: 1, updated: 0, failed: 1, skipped: 0 }
  }
}
