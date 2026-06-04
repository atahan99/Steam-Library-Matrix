import { ne } from "drizzle-orm"
import {
  indexAwacyEntries,
  indexLevvvelRows,
  type AwacyIndexes,
  type LevvvelIndexes,
} from "@/lib/anticheat/anticheat-indexes"
import { formatAwacyNotesForStorage } from "@/lib/anticheat/anticheatClient"
import type {
  AwacyNormalizedEntry,
  LevvvelNormalizedRow,
} from "@/lib/anticheat/anticheatTypes"
import { getDb } from "@/lib/db/client"
import {
  anticheatCatalogMeta,
  awacyCatalog,
  levvvelKernelCatalog,
} from "@/lib/db/schema"

export const ANTICHEAT_CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type AnticheatCatalogSource = "awacy" | "levvvel"

export type AnticheatCatalogMetaRow = {
  source: AnticheatCatalogSource
  rowCount: number
  complete: boolean
  errorMessage?: string
  lastSyncedAt?: string
}

export type AnticheatCatalogStats = {
  awacy: AnticheatCatalogMetaRow
  levvvel: AnticheatCatalogMetaRow
}

const emptyMeta = (source: AnticheatCatalogSource): AnticheatCatalogMetaRow => ({
  source,
  rowCount: 0,
  complete: false,
})

const mapMetaRow = (row: {
  source: string
  rowCount: number
  complete: boolean
  errorMessage: string | null
  lastSyncedAt: Date | null
}): AnticheatCatalogMetaRow => ({
  source: row.source as AnticheatCatalogSource,
  rowCount: row.rowCount ?? 0,
  complete: Boolean(row.complete),
  errorMessage: row.errorMessage ?? undefined,
  lastSyncedAt: row.lastSyncedAt?.toISOString(),
})

export const isAnticheatCatalogStale = (lastSyncedAt?: string): boolean => {
  if (!lastSyncedAt) return true
  const age = Date.now() - new Date(lastSyncedAt).getTime()
  return age > ANTICHEAT_CATALOG_TTL_MS
}

export const getAnticheatCatalogMeta = async (): Promise<
  AnticheatCatalogMetaRow[]
> => {
  const db = getDb()
  const data = await db.select().from(anticheatCatalogMeta)
  return data.map(mapMetaRow)
}

export const getAnticheatCatalogStats =
  async (): Promise<AnticheatCatalogStats> => {
    const rows = await getAnticheatCatalogMeta()
    const bySource = new Map(rows.map((r) => [r.source, r]))
    return {
      awacy: bySource.get("awacy") ?? emptyMeta("awacy"),
      levvvel: bySource.get("levvvel") ?? emptyMeta("levvvel"),
    }
  }

export const isAnticheatCatalogReady = async (): Promise<{
  ready: boolean
  awacyCount: number
  levvvelCount: number
  error?: string
}> => {
  const stats = await getAnticheatCatalogStats()
  if (stats.awacy.rowCount === 0) {
    return {
      ready: false,
      awacyCount: 0,
      levvvelCount: stats.levvvel.rowCount,
      error: "AWACY catalog is empty — sync anti-cheat catalogs first",
    }
  }
  return {
    ready: true,
    awacyCount: stats.awacy.rowCount,
    levvvelCount: stats.levvvel.rowCount,
  }
}

const upsertCatalogMeta = async (
  source: string,
  rowCount: number,
  complete: boolean,
  errorMessage: string | undefined,
  syncedAt: string
) => {
  const db = getDb()
  await db
    .insert(anticheatCatalogMeta)
    .values({
      source,
      rowCount,
      complete,
      errorMessage: errorMessage ?? null,
      lastSyncedAt: new Date(syncedAt),
    })
    .onConflictDoUpdate({
      target: anticheatCatalogMeta.source,
      set: {
        rowCount,
        complete,
        errorMessage: errorMessage ?? null,
        lastSyncedAt: new Date(syncedAt),
      },
    })
}

export const replaceAwacyCatalog = async (
  entries: AwacyNormalizedEntry[]
): Promise<{ count: number; lastSyncedAt: string }> => {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  await db.delete(awacyCatalog).where(ne(awacyCatalog.slug, ""))

  const chunkSize = 200
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize).map((entry) => ({
      slug: entry.slug ?? entry.normalizedName,
      name: entry.name,
      normalizedName: entry.normalizedName,
      steamAppid: entry.steamAppId ? Number(entry.steamAppId) : null,
      status: entry.status,
      anticheatNames: entry.antiCheats.length ? entry.antiCheats : null,
      notes: formatAwacyNotesForStorage(entry.notes),
      nativeLinux: entry.native ?? null,
      dateChanged: entry.dateChanged ? new Date(entry.dateChanged) : null,
      sourceUrl: entry.slug
        ? `https://areweanticheatyet.com/game/${entry.slug}`
        : entry.url ?? "https://areweanticheatyet.com/",
      lastSyncedAt: new Date(syncedAt),
    }))
    await db.insert(awacyCatalog).values(chunk)
  }

  await upsertCatalogMeta("awacy", entries.length, true, undefined, syncedAt)
  return { count: entries.length, lastSyncedAt: syncedAt }
}

export const replaceLevvvelCatalog = async (
  rows: LevvvelNormalizedRow[],
  complete: boolean,
  errorMessage?: string
): Promise<{ count: number; lastSyncedAt: string }> => {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  await db.delete(levvvelKernelCatalog).where(ne(levvvelKernelCatalog.normalizedName, ""))

  const chunkSize = 200
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((row) => ({
      normalizedName: row.normalizedName,
      name: row.name,
      anticheatNames: row.antiCheats.length ? row.antiCheats : null,
      developer: row.developer ?? null,
      publisher: row.publisher ?? null,
      lastSyncedAt: new Date(syncedAt),
    }))
    await db.insert(levvvelKernelCatalog).values(chunk)
  }

  await upsertCatalogMeta(
    "levvvel",
    rows.length,
    complete,
    errorMessage,
    syncedAt
  )
  return { count: rows.length, lastSyncedAt: syncedAt }
}

const rowToAwacyEntry = (row: typeof awacyCatalog.$inferSelect): AwacyNormalizedEntry => ({
  source: "areweanticheatyet",
  name: row.name,
  normalizedName: row.normalizedName,
  steamAppId: row.steamAppid != null ? String(row.steamAppid) : undefined,
  status: row.status as AwacyNormalizedEntry["status"],
  antiCheats: row.anticheatNames ?? [],
  notes: [],
  updates: [],
  slug: row.slug,
  dateChanged: row.dateChanged?.toISOString(),
  native: row.nativeLinux ?? undefined,
  url: row.sourceUrl ?? undefined,
})

const rowToLevvvelRow = (
  row: typeof levvvelKernelCatalog.$inferSelect
): LevvvelNormalizedRow => ({
  source: "levvvel",
  name: row.name,
  normalizedName: row.normalizedName,
  kernelLevel: true,
  antiCheats: row.anticheatNames ?? [],
  developer: row.developer ?? undefined,
  publisher: row.publisher ?? undefined,
})

export const loadAnticheatCatalogIndexes = async (): Promise<{
  awacy: AwacyIndexes
  levvvel: LevvvelIndexes
}> => {
  const db = getDb()
  const stats = await getAnticheatCatalogStats()

  const awacyRows = await db.select().from(awacyCatalog)
  const levvvelRows = await db.select().from(levvvelKernelCatalog)

  const awacyEntries = awacyRows.map(rowToAwacyEntry)
  const levvvelEntries = levvvelRows.map(rowToLevvvelRow)

  return {
    awacy: indexAwacyEntries(awacyEntries),
    levvvel: indexLevvvelRows(
      levvvelEntries,
      stats.levvvel.complete,
      stats.levvvel.errorMessage
    ),
  }
}
