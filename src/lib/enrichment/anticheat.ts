import { loadAnticheatCatalogIndexes } from "@/lib/db/anticheat-catalog"
import { isAnticheatCatalogReadySafe } from "@/lib/db/anticheat-catalog-safe"
import {
  getDenuvoCatalogStats,
  loadAllDenuvoCatalogAppids,
} from "@/lib/db/denuvo-catalog"
import { eq } from "drizzle-orm"
import { getProfileGamesForEnrichment } from "@/lib/db/profile-appids"
import { getDb } from "@/lib/db/client"
import { formatDbError } from "@/lib/db/catalog-table-error"
import { anticheatEntries } from "@/lib/db/schema"
import { ANTICHEAT_TTL_HOURS } from "@/lib/enrichment/resolve-enrichment-appids"
import { isCacheFresh } from "@/lib/utils/cache"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
import { awacyGameUrl } from "@/lib/anticheat/anticheatClient"
import {
  detectDenuvoAntiCheatFromNames,
  resolveDenuvoAntiTamper,
  resolveDenuvoAntiTamperFromStatus,
} from "@/lib/anticheat/denuvo"
import {
  findAwacyMatch,
  findLevvvelMatch,
  isMeaningfulAntiCheatLookup,
  matchAntiCheatFromIndexes,
} from "@/lib/anticheat/match-from-indexes"
import { buildAnticheatRefreshMessage } from "@/lib/anticheat/refresh-message"
import { syncAnticheatCatalogs } from "@/lib/anticheat/sync-catalogs"
import { LEVVVEL_KERNEL_URL } from "@/lib/anticheat/anticheatTypes"
import { checkSteamDenuvo } from "@/lib/steam/denuvo"
import { isDenuvoStoreRefreshNeeded } from "@/lib/steam/denuvo/is-denuvo-data-fresh"
import type { DenuvoSourceKind } from "@/lib/steam/denuvo/types"

const STORE_PAGE_FETCH_DELAY_MS = 250

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const SCHEMA_MIGRATION_HINT =
  "Anti-cheat database columns are missing. Run pnpm db:migrate against your DATABASE_URL."

const isAnticheatSchemaMismatch = (message?: string | null): boolean =>
  Boolean(
    message?.includes("schema cache") ||
      message?.includes("anticheat") ||
      message?.includes("does not exist")
  )

type AnticheatUpsertValues = typeof anticheatEntries.$inferInsert

type DenuvoPersistFields = {
  denuvoAntiTamper: boolean | null
  denuvoConfidence?: string | null
  denuvoSource?: string | null
  denuvoEvidence?: string | null
  denuvoCheckedAt?: Date | null
}

const upsertAnticheatEntry = async (values: AnticheatUpsertValues) => {
  const db = getDb()
  const now = new Date()
  const row = { ...values, updatedAt: now, lastCheckedAt: now }
  await db.insert(anticheatEntries).values(row).onConflictDoUpdate({
    target: anticheatEntries.appid,
    set: row,
  })
}

const mergeAntiCheatNames = (
  awacy: string[],
  levvvel: string[]
): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [...awacy, ...levvvel]) {
    const key = name.toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export type AnticheatEnrichContext = {
  indexes: Awaited<ReturnType<typeof loadAnticheatCatalogIndexes>>
  denuvoCatalogAppids: Set<number>
  denuvoCatalogComplete: boolean
}

export const loadAnticheatEnrichContext = async (): Promise<AnticheatEnrichContext> => {
  const indexes = await loadAnticheatCatalogIndexes()
  const denuvoCatalogAppids = await loadAllDenuvoCatalogAppids()
  const denuvoStats = await getDenuvoCatalogStats()
  return {
    indexes,
    denuvoCatalogAppids,
    denuvoCatalogComplete: denuvoStats.complete,
  }
}

export const ensureAnticheatCatalogsReady = async (
  steamid: string
): Promise<{ ready: true } | { ready: false; catalogError: string }> => {
  const catalogReady = await isAnticheatCatalogReadySafe()
  if (catalogReady.ready) return { ready: true }

  await syncAnticheatCatalogs(steamid, { force: false })
  const afterSync = await isAnticheatCatalogReadySafe()
  if (afterSync.ready) return { ready: true }

  return {
    ready: false,
    catalogError:
      afterSync.error ?? "Anti-cheat catalogs are empty — sync catalogs first",
  }
}

export type AnticheatEnrichPhase = "catalog" | "denuvo"

/** Single-game anti-cheat enrich for background job steps and full refresh. */
export const enrichSingleAnticheat = async (
  row: { appid: number; name: string },
  options: {
    force: boolean
    context: AnticheatEnrichContext
    delayBeforeStoreFetch: boolean
    phase?: AnticheatEnrichPhase
  }
): Promise<{
  checked: number
  updated: number
  failed: number
  schemaError?: string
}> => {
  const { appid, name: gameName } = row
  const { force, context, delayBeforeStoreFetch, phase = "denuvo" } = options
  const db = getDb()

  if (!force) {
    const existingRows = await db
      .select({
        lastCheckedAt: anticheatEntries.lastCheckedAt,
        denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
        denuvoAntiCheat: anticheatEntries.denuvoAntiCheat,
        denuvoConfidence: anticheatEntries.denuvoConfidence,
        denuvoSource: anticheatEntries.denuvoSource,
        denuvoEvidence: anticheatEntries.denuvoEvidence,
        denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
      })
      .from(anticheatEntries)
      .where(eq(anticheatEntries.appid, appid))
      .limit(1)
    const existing = existingRows[0]

    if (phase === "denuvo") {
      if (existing && !isDenuvoStoreRefreshNeeded(existing, force)) {
        return { checked: 1, updated: 0, failed: 0 }
      }
    } else if (
      isCacheFresh(existing?.lastCheckedAt?.toISOString(), ANTICHEAT_TTL_HOURS)
    ) {
      return { checked: 1, updated: 0, failed: 0 }
    }
  }

  let denuvoFields: DenuvoPersistFields = {
    denuvoAntiTamper: null,
  }

  const loadExistingDenuvo = async () => {
    const rows = await db
      .select({
        denuvoAntiTamper: anticheatEntries.denuvoAntiTamper,
        denuvoConfidence: anticheatEntries.denuvoConfidence,
        denuvoSource: anticheatEntries.denuvoSource,
        denuvoEvidence: anticheatEntries.denuvoEvidence,
        denuvoCheckedAt: anticheatEntries.denuvoCheckedAt,
      })
      .from(anticheatEntries)
      .where(eq(anticheatEntries.appid, appid))
      .limit(1)
    return rows[0]
  }

  if (phase === "catalog") {
    const catalogTamper = resolveDenuvoAntiTamper(
      appid,
      context.denuvoCatalogAppids
    )
    if (catalogTamper === true) {
      denuvoFields = {
        denuvoAntiTamper: true,
        denuvoConfidence: "medium",
        denuvoSource: "curator",
        denuvoEvidence: "Listed on Denuvo Watch curator",
        denuvoCheckedAt: new Date(),
      }
    } else {
      const existingDenuvo = await loadExistingDenuvo()
      denuvoFields = {
        denuvoAntiTamper: existingDenuvo?.denuvoAntiTamper ?? null,
        denuvoConfidence: existingDenuvo?.denuvoConfidence ?? null,
        denuvoSource: existingDenuvo?.denuvoSource ?? null,
        denuvoEvidence: existingDenuvo?.denuvoEvidence ?? null,
        denuvoCheckedAt: existingDenuvo?.denuvoCheckedAt ?? null,
      }
    }
  } else {
    if (delayBeforeStoreFetch) {
      await sleep(STORE_PAGE_FETCH_DELAY_MS)
    }

    try {
      const denuvoStatus = await checkSteamDenuvo(appid, {
        curatorAppids: context.denuvoCatalogAppids,
        curatorComplete: context.denuvoCatalogComplete,
      })
      let tamper = resolveDenuvoAntiTamperFromStatus(denuvoStatus)
      const catalogTamper = resolveDenuvoAntiTamper(
        appid,
        context.denuvoCatalogAppids
      )
      if (tamper !== true && catalogTamper === true) {
        tamper = true
      }

      const primarySource: DenuvoSourceKind =
        denuvoStatus.primarySource ??
        (catalogTamper === true ? "curator" : "store_page")

      denuvoFields = {
        denuvoAntiTamper: tamper,
        denuvoConfidence: denuvoStatus.confidence,
        denuvoSource: primarySource,
        denuvoEvidence:
          denuvoStatus.evidence ??
          denuvoStatus.drmNotices.find((n) => /denuvo/i.test(n)) ??
          null,
        denuvoCheckedAt: new Date(denuvoStatus.checkedAt),
      }
    } catch (error) {
      console.error(`Denuvo check failed for ${gameName} (${appid})`, error)
      return { checked: 1, updated: 0, failed: 1 }
    }
  }

  let info
  try {
    info = matchAntiCheatFromIndexes(
      context.indexes.awacy,
      context.indexes.levvvel,
      gameName,
      appid
    )
  } catch (error) {
    console.error(`Anti-cheat lookup failed for ${gameName} (${appid})`, error)
    return { checked: 1, updated: 0, failed: 1 }
  }

  const { entry: awacyEntry } = findAwacyMatch(context.indexes.awacy, gameName, appid)
  const levvvelRow = findLevvvelMatch(
    context.indexes.levvvel,
    gameName,
    info.confidence,
    awacyEntry
  )

  const awacyNames = info.linuxAntiCheatStatus?.antiCheats ?? []
  const levvvelNames =
    info.kernelAntiCheat?.hasKernelLevelAntiCheat === true
      ? (info.kernelAntiCheat.antiCheats ?? [])
      : []

  const denuvoAntiCheat = detectDenuvoAntiCheatFromNames(
    awacyNames,
    levvvelNames,
    Boolean(awacyEntry),
    Boolean(levvvelRow)
  )

  const { denuvoAntiTamper, denuvoConfidence, denuvoSource, denuvoEvidence, denuvoCheckedAt } =
    denuvoFields

  if (
    !isMeaningfulAntiCheatLookup(info) &&
    denuvoAntiTamper == null &&
    denuvoAntiCheat == null
  ) {
    try {
      await upsertAnticheatEntry({
        appid,
        status: "Unknown",
        denuvoAntiTamper,
        denuvoAntiCheat,
        denuvoConfidence: denuvoConfidence ?? null,
        denuvoSource: denuvoSource ?? null,
        denuvoEvidence: denuvoEvidence ?? null,
        denuvoCheckedAt: denuvoCheckedAt ?? null,
        notes:
          "No AWACY/Levvvel match and Denuvo Anti-Tamper could not be determined from store or curator catalog.",
        sourceUrl: "https://areweanticheatyet.com/",
        matchConfidence: info.confidence,
        levvvelSourceUrl: LEVVVEL_KERNEL_URL,
      })
      return { checked: 1, updated: 1, failed: 0 }
    } catch (inconclusiveError) {
      const message = formatDbError(inconclusiveError)
      console.error(`Anti-cheat inconclusive upsert failed for ${appid}`, message)
      if (isAnticheatSchemaMismatch(message)) {
        return { checked: 1, updated: 0, failed: 1, schemaError: SCHEMA_MIGRATION_HINT }
      }
      return { checked: 1, updated: 0, failed: 1 }
    }
  }

  const linux = info.linuxAntiCheatStatus
  const kernel = info.kernelAntiCheat
  const anticheatNames = mergeAntiCheatNames(awacyNames, levvvelNames)

  const kernelLevel =
    kernel?.hasKernelLevelAntiCheat === true
      ? true
      : kernel?.hasKernelLevelAntiCheat === false
        ? false
        : null

  const matchedName = linux?.matchedName ?? kernel?.matchedName ?? null

  const notes = linux?.notes?.length ? linux.notes.join("\n") : null

  const slug = linux?.slug
  const sourceUrl = slug
    ? awacyGameUrl(slug)
    : linux?.url ?? "https://areweanticheatyet.com/"

  const awacyDateChanged = linux?.dateChanged
    ? new Date(linux.dateChanged).toISOString()
    : null

  try {
    await upsertAnticheatEntry({
      appid,
      matchedName,
      anticheatNames: anticheatNames.length ? anticheatNames : null,
      status: linux?.status ?? "Unknown",
      kernelLevel,
      denuvoAntiTamper,
      denuvoAntiCheat,
      denuvoConfidence: denuvoConfidence ?? null,
      denuvoSource: denuvoSource ?? null,
      denuvoEvidence: denuvoEvidence ?? null,
      denuvoCheckedAt: denuvoCheckedAt ?? null,
      notes,
      sourceUrl,
      awacySlug: slug ?? null,
      nativeLinux: linux?.native ?? null,
      levvvelMatchedName: kernel?.matchedName ?? null,
      levvvelAnticheatNames: levvvelNames.length ? levvvelNames : null,
      levvvelDeveloper: kernel?.developer ?? null,
      levvvelPublisher: kernel?.publisher ?? null,
      awacyDateChanged: awacyDateChanged ? new Date(awacyDateChanged) : null,
      matchConfidence: info.confidence,
      levvvelSourceUrl: LEVVVEL_KERNEL_URL,
    })
    return { checked: 1, updated: 1, failed: 0 }
  } catch (upsertError) {
    const message = formatDbError(upsertError)
    console.error(`Anti-cheat upsert failed for ${appid}`, message)
    if (isAnticheatSchemaMismatch(message)) {
      return { checked: 1, updated: 0, failed: 1, schemaError: SCHEMA_MIGRATION_HINT }
    }
    return { checked: 1, updated: 0, failed: 1 }
  }
}

export const enrichAntiCheat = async (
  steamid: string,
  force = false
): Promise<{
  checked: number
  updated: number
  failed: number
  skipped: number
  schemaError?: string
  catalogError?: string
}> => {
  const catalog = await ensureAnticheatCatalogsReady(steamid)
  if (!catalog.ready) {
    return {
      checked: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      catalogError: catalog.catalogError,
    }
  }

  const logId = await startRefreshLog(steamid, "anticheat")

  let context: AnticheatEnrichContext
  try {
    context = await loadAnticheatEnrichContext()
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load anti-cheat catalogs from database"
    await finishRefreshLog(logId, "failed", message)
    throw error
  }

  let rows: { appid: number; name: string }[]
  try {
    rows = await getProfileGamesForEnrichment(steamid)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load games"
    await finishRefreshLog(logId, "failed", message)
    throw error
  }

  let checked = 0
  let updated = 0
  let failed = 0
  const skipped = 0
  let schemaError: string | undefined
  let storePageFetchPending = false

  for (const row of rows) {
    const result = await enrichSingleAnticheat(row, {
      force,
      context,
      delayBeforeStoreFetch: false,
      phase: "catalog",
    })
    checked += result.checked
    updated += result.updated
    failed += result.failed
    if (result.schemaError) {
      schemaError = result.schemaError
      break
    }
  }

  if (!schemaError) {
    for (const row of rows) {
      const result = await enrichSingleAnticheat(row, {
        force,
        context,
        delayBeforeStoreFetch: storePageFetchPending,
        phase: "denuvo",
      })
      checked += result.checked
      updated += result.updated
      failed += result.failed
      if (result.schemaError) {
        schemaError = result.schemaError
        break
      }
      storePageFetchPending = true
    }
  }

  await finishRefreshLog(
    logId,
    failed > 0 || schemaError ? "partial" : "success",
    buildAnticheatRefreshMessage({
      checked,
      updated,
      failed,
      skipped,
      schemaError,
    })
  )
  return { checked, updated, failed, skipped, schemaError }
}
