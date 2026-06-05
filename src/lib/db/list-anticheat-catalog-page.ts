import { count, eq, ilike, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db/client"
import {
  anticheatCatalogMeta,
  awacyCatalog,
  denuvoAntiTamperCatalog,
  levvvelKernelCatalog,
  steamGames,
} from "@/lib/db/schema"

export type AnticheatCatalogBrowseSource = "awacy" | "levvvel" | "denuvo"

export type AnticheatCatalogRow = {
  id: string
  appid?: number
  name: string
  status?: string
  anticheatNames?: string[]
  developer?: string
  publisher?: string
  lastSyncedAt?: string
}

export type ListAnticheatCatalogPageResult = {
  source: AnticheatCatalogBrowseSource
  rows: AnticheatCatalogRow[]
  total: number
  limit: number
  offset: number
}

export type ListAnticheatCatalogPageOptions = {
  source: AnticheatCatalogBrowseSource
  search?: string
  limit?: number
  offset?: number
}

const clampLimit = (limit?: number) =>
  Math.min(100, Math.max(1, limit ?? 25))

const parseAppidSearch = (search: string): number | null => {
  const trimmed = search.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  return Number.isSafeInteger(n) ? n : null
}

const attachSteamGameNames = async (
  appids: number[]
): Promise<Map<number, string>> => {
  const names = new Map<number, string>()
  if (appids.length === 0) return names

  const db = getDb()
  const chunkSize = 500
  for (let i = 0; i < appids.length; i += chunkSize) {
    const chunk = appids.slice(i, i + chunkSize)
    const data = await db
      .select({ appid: steamGames.appid, name: steamGames.name })
      .from(steamGames)
      .where(inArray(steamGames.appid, chunk))
    for (const row of data) {
      names.set(row.appid, row.name)
    }
  }

  return names
}

const resolveDenuvoCatalogAppidsByName = async (
  search: string
): Promise<number[]> => {
  const db = getDb()
  const data = await db
    .select({ appid: steamGames.appid })
    .from(steamGames)
    .where(ilike(steamGames.name, `%${search}%`))
    .limit(2000)

  return data.map((row) => row.appid)
}

const listDenuvoCatalogPage = async (options: {
  search: string
  limit: number
  offset: number
}): Promise<ListAnticheatCatalogPageResult> => {
  const db = getDb()
  const { search, limit, offset } = options
  const appid = parseAppidSearch(search)

  if (search && appid === null) {
    const matchingAppids = await resolveDenuvoCatalogAppidsByName(search)
    if (matchingAppids.length === 0) {
      return { source: "denuvo", rows: [], total: 0, limit, offset }
    }

    const countRows = await db
      .select({ value: count() })
      .from(denuvoAntiTamperCatalog)
      .where(inArray(denuvoAntiTamperCatalog.appid, matchingAppids))

    const data = await db
      .select({
        appid: denuvoAntiTamperCatalog.appid,
        lastSyncedAt: denuvoAntiTamperCatalog.lastSyncedAt,
      })
      .from(denuvoAntiTamperCatalog)
      .where(inArray(denuvoAntiTamperCatalog.appid, matchingAppids))
      .orderBy(denuvoAntiTamperCatalog.appid)
      .limit(limit)
      .offset(offset)

    const pageAppids = data.map((row) => row.appid)
    const nameByAppid = await attachSteamGameNames(pageAppids)

    const rows: AnticheatCatalogRow[] = data.map((row) => ({
      id: String(row.appid),
      appid: row.appid,
      name: nameByAppid.get(row.appid) ?? `App ${row.appid}`,
      lastSyncedAt: row.lastSyncedAt?.toISOString(),
    }))

    return {
      source: "denuvo",
      rows,
      total: countRows[0]?.value ?? rows.length,
      limit,
      offset,
    }
  }

  const denuvoWhere =
    appid !== null ? eq(denuvoAntiTamperCatalog.appid, appid) : undefined

  const countRows = await db
    .select({ value: count() })
    .from(denuvoAntiTamperCatalog)
    .where(denuvoWhere)

  const data = await db
    .select({
      appid: denuvoAntiTamperCatalog.appid,
      lastSyncedAt: denuvoAntiTamperCatalog.lastSyncedAt,
    })
    .from(denuvoAntiTamperCatalog)
    .where(denuvoWhere)
    .orderBy(denuvoAntiTamperCatalog.appid)
    .limit(limit)
    .offset(offset)

  const pageAppids = data.map((row) => row.appid)
  const nameByAppid = await attachSteamGameNames(pageAppids)

  const rows: AnticheatCatalogRow[] = data.map((row) => ({
    id: String(row.appid),
    appid: row.appid,
    name: nameByAppid.get(row.appid) ?? `App ${row.appid}`,
    lastSyncedAt: row.lastSyncedAt?.toISOString(),
  }))

  return {
    source: "denuvo",
    rows,
    total: countRows[0]?.value ?? rows.length,
    limit,
    offset,
  }
}

export const listAnticheatCatalogPage = async (
  options: ListAnticheatCatalogPageOptions
): Promise<ListAnticheatCatalogPageResult> => {
  const db = getDb()
  const limit = clampLimit(options.limit)
  const offset = Math.max(0, options.offset ?? 0)
  const search = (options.search ?? "").trim()

  if (options.source === "awacy") {
    const appid = parseAppidSearch(search)
    const whereClause =
      appid !== null
        ? eq(awacyCatalog.steamAppid, appid)
        : search
          ? ilike(awacyCatalog.name, `%${search}%`)
          : undefined

    const countRows = await db
      .select({ value: count() })
      .from(awacyCatalog)
      .where(whereClause)

    const data = await db
      .select({
        slug: awacyCatalog.slug,
        name: awacyCatalog.name,
        steamAppid: awacyCatalog.steamAppid,
        status: awacyCatalog.status,
        anticheatNames: awacyCatalog.anticheatNames,
        lastSyncedAt: awacyCatalog.lastSyncedAt,
      })
      .from(awacyCatalog)
      .where(whereClause)
      .orderBy(awacyCatalog.name)
      .limit(limit)
      .offset(offset)

    const rows: AnticheatCatalogRow[] = data.map((row) => ({
      id: row.slug,
      appid: row.steamAppid != null ? Number(row.steamAppid) : undefined,
      name: row.name,
      status: row.status,
      anticheatNames: row.anticheatNames ?? undefined,
      lastSyncedAt: row.lastSyncedAt?.toISOString(),
    }))

    return {
      source: "awacy",
      rows,
      total: countRows[0]?.value ?? rows.length,
      limit,
      offset,
    }
  }

  if (options.source === "levvvel") {
    const whereClause = search
      ? ilike(levvvelKernelCatalog.name, `%${search}%`)
      : undefined

    const countRows = await db
      .select({ value: count() })
      .from(levvvelKernelCatalog)
      .where(whereClause)

    const data = await db
      .select()
      .from(levvvelKernelCatalog)
      .where(whereClause)
      .orderBy(levvvelKernelCatalog.name)
      .limit(limit)
      .offset(offset)

    const rows: AnticheatCatalogRow[] = data.map((row) => ({
      id: row.normalizedName,
      name: row.name,
      anticheatNames: row.anticheatNames ?? undefined,
      developer: row.developer ?? undefined,
      publisher: row.publisher ?? undefined,
      lastSyncedAt: row.lastSyncedAt?.toISOString(),
    }))

    return {
      source: "levvvel",
      rows,
      total: countRows[0]?.value ?? rows.length,
      limit,
      offset,
    }
  }

  return listDenuvoCatalogPage({ search, limit, offset })
}

export const getAnticheatCatalogMetaAll = async () => {
  const db = getDb()
  const data = await db.select().from(anticheatCatalogMeta)
  return data.map((row) => ({
    source: row.source,
    row_count: row.rowCount,
    complete: row.complete,
    error_message: row.errorMessage,
    last_synced_at: row.lastSyncedAt?.toISOString() ?? null,
  }))
}
