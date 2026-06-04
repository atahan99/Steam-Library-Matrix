import { count, desc, eq, gte, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import {
  anticheatCatalogMeta,
  denuvoAntiTamperCatalog,
} from "@/lib/db/schema"

export const DENUVO_CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type DenuvoCatalogStats = {
  count: number
  complete: boolean
  lastSyncedAt?: string
  errorMessage?: string
}

export const isDenuvoCatalogStale = (lastSyncedAt?: string): boolean => {
  if (!lastSyncedAt) return true
  const age = Date.now() - new Date(lastSyncedAt).getTime()
  return age > DENUVO_CATALOG_TTL_MS
}

export const getDenuvoCatalogStats = async (): Promise<DenuvoCatalogStats> => {
  const db = getDb()

  const countRows = await db
    .select({ value: count() })
    .from(denuvoAntiTamperCatalog)

  const latest = await db
    .select({ lastSyncedAt: denuvoAntiTamperCatalog.lastSyncedAt })
    .from(denuvoAntiTamperCatalog)
    .orderBy(desc(denuvoAntiTamperCatalog.lastSyncedAt))
    .limit(1)

  const meta = await db
    .select()
    .from(anticheatCatalogMeta)
    .where(eq(anticheatCatalogMeta.source, "denuvo_anti_tamper"))
    .limit(1)

  const metaRow = meta[0]

  return {
    count: countRows[0]?.value ?? 0,
    complete: Boolean(metaRow?.complete),
    lastSyncedAt:
      metaRow?.lastSyncedAt?.toISOString() ??
      latest[0]?.lastSyncedAt?.toISOString(),
    errorMessage: metaRow?.errorMessage ?? undefined,
  }
}

export const loadDenuvoAppidsFor = async (
  appids: number[]
): Promise<Set<number>> => {
  if (!appids.length) return new Set()

  const db = getDb()
  const listed = new Set<number>()
  const chunkSize = 500

  for (let i = 0; i < appids.length; i += chunkSize) {
    const chunk = appids.slice(i, i + chunkSize)
    const data = await db
      .select({ appid: denuvoAntiTamperCatalog.appid })
      .from(denuvoAntiTamperCatalog)
      .where(inArray(denuvoAntiTamperCatalog.appid, chunk))
    for (const row of data) {
      listed.add(row.appid)
    }
  }

  return listed
}

export const loadAllDenuvoCatalogAppids = async (): Promise<Set<number>> => {
  const db = getDb()
  const listed = new Set<number>()
  const pageSize = 1000
  let offset = 0

  for (;;) {
    const data = await db
      .select({ appid: denuvoAntiTamperCatalog.appid })
      .from(denuvoAntiTamperCatalog)
      .limit(pageSize)
      .offset(offset)
    if (!data.length) break
    for (const row of data) {
      listed.add(row.appid)
    }
    if (data.length < pageSize) break
    offset += pageSize
  }

  return listed
}

const upsertDenuvoMeta = async (
  rowCount: number,
  complete: boolean,
  errorMessage: string | undefined,
  syncedAt: string
) => {
  const db = getDb()
  await db
    .insert(anticheatCatalogMeta)
    .values({
      source: "denuvo_anti_tamper",
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

export const replaceDenuvoAntiTamperCatalog = async (
  appids: number[],
  complete: boolean,
  errorMessage?: string
): Promise<{ count: number; lastSyncedAt: string }> => {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  await db.delete(denuvoAntiTamperCatalog).where(gte(denuvoAntiTamperCatalog.appid, 0))

  const chunkSize = 500
  for (let i = 0; i < appids.length; i += chunkSize) {
    const chunk = appids.slice(i, i + chunkSize).map((appid) => ({
      appid,
      lastSyncedAt: new Date(syncedAt),
    }))
    await db.insert(denuvoAntiTamperCatalog).values(chunk)
  }

  await upsertDenuvoMeta(appids.length, complete, errorMessage, syncedAt)
  return { count: appids.length, lastSyncedAt: syncedAt }
}
