import {
  getDenuvoCatalogStats,
  isDenuvoCatalogStale,
  replaceDenuvoAntiTamperCatalog,
} from "@/lib/db/denuvo-catalog"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
import { scrapeDenuvoCuratorCatalog } from "@/lib/steam/scrape-denuvo-curator"

export type SyncDenuvoCatalogResult = {
  denuvoAntiTamperCount: number
  denuvoAntiTamperLastSyncedAt?: string
  denuvoAntiTamperComplete: boolean
  skipped?: boolean
  denuvoAntiTamperError?: string
}

export const isDenuvoCatalogSyncNeeded = async (
  force: boolean
): Promise<boolean> => {
  if (force) return true

  const stats = await getDenuvoCatalogStats()
  const stale = isDenuvoCatalogStale(stats.lastSyncedAt)

  if (stats.complete && !stale) return false
  return stats.count === 0 || !stats.complete || stale
}

export const syncDenuvoCatalogOnly = async (
  steamid: string,
  options?: { force?: boolean }
): Promise<SyncDenuvoCatalogResult> => {
  const stats = await getDenuvoCatalogStats()
  const stale = isDenuvoCatalogStale(stats.lastSyncedAt)

  if (
    !options?.force &&
    stats.count > 0 &&
    stats.complete &&
    !stale
  ) {
    return {
      denuvoAntiTamperCount: stats.count,
      denuvoAntiTamperLastSyncedAt: stats.lastSyncedAt,
      denuvoAntiTamperComplete: true,
      skipped: true,
      denuvoAntiTamperError: stats.errorMessage,
    }
  }

  const logId = await startRefreshLog(steamid, "denuvo_catalog")
  let denuvoAntiTamperError: string | undefined
  let denuvoAntiTamperCount = stats.count
  let denuvoAntiTamperLastSyncedAt = stats.lastSyncedAt
  let denuvoAntiTamperComplete = stats.complete

  try {
    const denuvoScraped = await scrapeDenuvoCuratorCatalog()
    denuvoAntiTamperComplete = denuvoScraped.complete

    if (!denuvoScraped.appids.length) {
      denuvoAntiTamperError =
        denuvoScraped.error ?? "No app IDs scraped from Denuvo curator"
    } else if (!denuvoScraped.complete) {
      denuvoAntiTamperError = denuvoScraped.error
    }

    if (denuvoScraped.appids.length) {
      const denuvoSaved = await replaceDenuvoAntiTamperCatalog(
        denuvoScraped.appids,
        denuvoScraped.complete,
        denuvoAntiTamperError
      )
      denuvoAntiTamperCount = denuvoSaved.count
      denuvoAntiTamperLastSyncedAt = denuvoSaved.lastSyncedAt
    } else {
      denuvoAntiTamperComplete = false
    }

    const message = [
      `denuvo_anti_tamper=${denuvoAntiTamperCount}`,
      `denuvo_anti_tamper_complete=${denuvoAntiTamperComplete}`,
      denuvoAntiTamperError
        ? `denuvo_anti_tamper_error=${denuvoAntiTamperError}`
        : null,
    ]
      .filter(Boolean)
      .join(" | ")

    const status = denuvoAntiTamperError ? "partial" : "success"
    await finishRefreshLog(logId, status, message)

    return {
      denuvoAntiTamperCount,
      denuvoAntiTamperLastSyncedAt,
      denuvoAntiTamperComplete,
      denuvoAntiTamperError,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Denuvo catalog sync failed"
    await finishRefreshLog(logId, "failed", message)
    throw err
  }
}
