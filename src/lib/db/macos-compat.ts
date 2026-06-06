import { inArray, ne, sql } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import { macosCompatCatalog, macosCompatEntries } from "@/lib/db/schema"
import type { AppleGamingWikiRow } from "@/lib/mac/fetch-applegamingwiki"
import { normalizeMacRating, type MacRating } from "@/lib/mac/macos-compat-rating"
import { normalizeGameName } from "@/lib/utils/normalize-game-name"

export type MacCatalogRow = {
  normalizedName: string
  pageName: string
  native: MacRating
  rosetta2: MacRating
  crossover: MacRating
  parallels: MacRating
}

export type MacCatalogIndex = {
  byName: Map<string, MacCatalogRow>
  rows: MacCatalogRow[]
}

export type MacCompatEntry = {
  appid: number
  matchedName: string | null
  matchConfidence: string | null
  native: MacRating
  rosetta2: MacRating
  crossover: MacRating
  parallels: MacRating
  lastCheckedAt?: string
}

export type MacCompatEntryInput = Omit<MacCompatEntry, "lastCheckedAt">

export const replaceMacosCompatCatalog = async (
  rows: AppleGamingWikiRow[]
): Promise<{ count: number }> => {
  const db = getDb()
  const now = new Date()

  // Catalog is keyed by normalized name (PK); first occurrence wins.
  const byKey = new Map<string, typeof macosCompatCatalog.$inferInsert>()
  for (const row of rows) {
    const normalizedName = normalizeGameName(row.pageName)
    if (!normalizedName || byKey.has(normalizedName)) continue
    byKey.set(normalizedName, {
      normalizedName,
      pageName: row.pageName,
      native: normalizeMacRating(row.native),
      rosetta2: normalizeMacRating(row.rosetta2),
      crossover: normalizeMacRating(row.crossover),
      parallels: normalizeMacRating(row.parallels),
      lastSyncedAt: now,
    })
  }
  const values = [...byKey.values()]

  await db
    .delete(macosCompatCatalog)
    .where(ne(macosCompatCatalog.normalizedName, ""))

  const chunkSize = 200
  for (let i = 0; i < values.length; i += chunkSize) {
    await db.insert(macosCompatCatalog).values(values.slice(i, i + chunkSize))
  }

  return { count: values.length }
}

export const loadMacosCompatCatalogIndex = async (): Promise<MacCatalogIndex> => {
  const db = getDb()
  const rows = await db.select().from(macosCompatCatalog)
  const mapped: MacCatalogRow[] = rows.map((row) => ({
    normalizedName: row.normalizedName,
    pageName: row.pageName,
    native: normalizeMacRating(row.native),
    rosetta2: normalizeMacRating(row.rosetta2),
    crossover: normalizeMacRating(row.crossover),
    parallels: normalizeMacRating(row.parallels),
  }))
  return { byName: new Map(mapped.map((r) => [r.normalizedName, r])), rows: mapped }
}

export const getMacosCompatCatalogStats = async (): Promise<{
  count: number
  lastSyncedAt?: string
}> => {
  const db = getDb()
  const rows = await db
    .select({
      count: sql<number>`count(*)`,
      lastSynced: sql<number | null>`max(${macosCompatCatalog.lastSyncedAt})`,
    })
    .from(macosCompatCatalog)
  const row = rows[0]
  return {
    count: row?.count ?? 0,
    lastSyncedAt: row?.lastSynced
      ? new Date(row.lastSynced).toISOString()
      : undefined,
  }
}

export const getMacosCompatEntryCount = async (): Promise<number> => {
  const db = getDb()
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(macosCompatEntries)
  return rows[0]?.count ?? 0
}

export const replaceMacosCompatEntries = async (
  entries: MacCompatEntryInput[]
): Promise<void> => {
  const db = getDb()
  const now = new Date()

  await db.delete(macosCompatEntries).where(ne(macosCompatEntries.appid, 0))

  const chunkSize = 200
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize).map((entry) => ({
      appid: entry.appid,
      matchedName: entry.matchedName,
      matchConfidence: entry.matchConfidence,
      native: entry.native,
      rosetta2: entry.rosetta2,
      crossover: entry.crossover,
      parallels: entry.parallels,
      lastCheckedAt: now,
    }))
    await db.insert(macosCompatEntries).values(chunk)
  }
}

export const loadMacosCompatByAppid = async (
  appids: number[]
): Promise<Map<number, MacCompatEntry>> => {
  const map = new Map<number, MacCompatEntry>()
  if (appids.length === 0) return map
  const db = getDb()

  const chunkSize = 400
  for (let i = 0; i < appids.length; i += chunkSize) {
    const rows = await db
      .select()
      .from(macosCompatEntries)
      .where(inArray(macosCompatEntries.appid, appids.slice(i, i + chunkSize)))
    for (const row of rows) {
      map.set(row.appid, {
        appid: row.appid,
        matchedName: row.matchedName ?? null,
        matchConfidence: row.matchConfidence ?? null,
        native: normalizeMacRating(row.native),
        rosetta2: normalizeMacRating(row.rosetta2),
        crossover: normalizeMacRating(row.crossover),
        parallels: normalizeMacRating(row.parallels),
        lastCheckedAt: row.lastCheckedAt?.toISOString(),
      })
    }
  }
  return map
}
