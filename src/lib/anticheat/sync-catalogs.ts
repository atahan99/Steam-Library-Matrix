import {
  getAnticheatCatalogStats,
  isAnticheatCatalogStale,
  replaceAwacyCatalog,
  replaceLevvvelCatalog,
} from "@/lib/db/anticheat-catalog"
import {
  getDenuvoCatalogStats,
  isDenuvoCatalogStale,
  replaceDenuvoAntiTamperCatalog,
} from "@/lib/db/denuvo-catalog"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
import { scrapeDenuvoCuratorCatalog } from "@/lib/steam/scrape-denuvo-curator"
import {
  fetchAwacyGamesRaw,
  fetchLevvvelKernelGames,
  refreshAntiCheatCaches,
} from "@/lib/anticheat/anticheatClient"

export type SyncAnticheatCatalogsResult = {
  awacyCount: number
  levvvelCount: number
  denuvoAntiTamperCount: number
  awacyLastSyncedAt?: string
  levvvelLastSyncedAt?: string
  denuvoAntiTamperLastSyncedAt?: string
  levvvelComplete: boolean
  denuvoAntiTamperComplete: boolean
  skipped?: boolean
  awacyError?: string
  levvvelError?: string
  denuvoAntiTamperError?: string
}

const buildCatalogSyncMessage = (result: SyncAnticheatCatalogsResult): string => {
  const parts = [
    `awacy=${result.awacyCount}`,
    `levvvel=${result.levvvelCount}`,
    `levvvel_complete=${result.levvvelComplete}`,
    `denuvo_anti_tamper=${result.denuvoAntiTamperCount}`,
    `denuvo_anti_tamper_complete=${result.denuvoAntiTamperComplete}`,
  ]
  if (result.awacyError) parts.push(`awacy_error=${result.awacyError}`)
  if (result.levvvelError) parts.push(`levvvel_error=${result.levvvelError}`)
  if (result.denuvoAntiTamperError) {
    parts.push(`denuvo_anti_tamper_error=${result.denuvoAntiTamperError}`)
  }
  return parts.join(" | ")
}

export const syncAnticheatCatalogs = async (
  steamid: string,
  options?: { force?: boolean }
): Promise<SyncAnticheatCatalogsResult> => {
  const stats = await getAnticheatCatalogStats()
  const denuvoStats = await getDenuvoCatalogStats()
  const awacyStale = isAnticheatCatalogStale(stats.awacy.lastSyncedAt)
  const levvvelStale = isAnticheatCatalogStale(stats.levvvel.lastSyncedAt)
  const denuvoStale = isDenuvoCatalogStale(denuvoStats.lastSyncedAt)

  if (
    !options?.force &&
    stats.awacy.rowCount > 0 &&
    !awacyStale &&
    stats.levvvel.rowCount > 0 &&
    !levvvelStale &&
    denuvoStats.count > 0 &&
    !denuvoStale
  ) {
    return {
      awacyCount: stats.awacy.rowCount,
      levvvelCount: stats.levvvel.rowCount,
      denuvoAntiTamperCount: denuvoStats.count,
      awacyLastSyncedAt: stats.awacy.lastSyncedAt,
      levvvelLastSyncedAt: stats.levvvel.lastSyncedAt,
      denuvoAntiTamperLastSyncedAt: denuvoStats.lastSyncedAt,
      levvvelComplete: stats.levvvel.complete,
      denuvoAntiTamperComplete: denuvoStats.complete,
      skipped: true,
      levvvelError: stats.levvvel.errorMessage,
      denuvoAntiTamperError: denuvoStats.errorMessage,
    }
  }

  const logId = await startRefreshLog(steamid, "anticheat_catalog")
  refreshAntiCheatCaches()

  let awacyError: string | undefined
  let levvvelError: string | undefined
  let denuvoAntiTamperError: string | undefined
  let awacyCount = stats.awacy.rowCount
  let levvvelCount = stats.levvvel.rowCount
  let denuvoAntiTamperCount = denuvoStats.count
  let awacyLastSyncedAt = stats.awacy.lastSyncedAt
  let levvvelLastSyncedAt = stats.levvvel.lastSyncedAt
  let denuvoAntiTamperLastSyncedAt = denuvoStats.lastSyncedAt
  let levvvelComplete = stats.levvvel.complete
  let denuvoAntiTamperComplete = denuvoStats.complete

  try {
    const awacyResult = await fetchAwacyGamesRaw()
    if (!awacyResult.entries.length) {
      awacyError =
        awacyResult.error ?? "AWACY games.json returned 0 rows"
      await finishRefreshLog(logId, "failed", buildCatalogSyncMessage({
        awacyCount: 0,
        levvvelCount: 0,
        denuvoAntiTamperCount: 0,
        levvvelComplete: false,
        denuvoAntiTamperComplete: false,
        awacyError,
      }))
      return {
        awacyCount: 0,
        levvvelCount: 0,
        denuvoAntiTamperCount: 0,
        levvvelComplete: false,
        denuvoAntiTamperComplete: false,
        awacyError,
      }
    }

    const awacySaved = await replaceAwacyCatalog(awacyResult.entries)
    awacyCount = awacySaved.count
    awacyLastSyncedAt = awacySaved.lastSyncedAt

    const levvvelDataset = await fetchLevvvelKernelGames()
    levvvelComplete = levvvelDataset.complete
    if (!levvvelDataset.complete) {
      levvvelError =
        levvvelDataset.error ??
        `Levvvel kernel list incomplete (${levvvelDataset.rows.length} rows)`
    }

    const levvvelSaved = await replaceLevvvelCatalog(
      levvvelDataset.rows,
      levvvelDataset.complete,
      levvvelError
    )
    levvvelCount = levvvelSaved.count
    levvvelLastSyncedAt = levvvelSaved.lastSyncedAt

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
      }
    } catch (denuvoErr) {
      denuvoAntiTamperError =
        denuvoErr instanceof Error
          ? denuvoErr.message
          : "Denuvo curator sync failed"
    }

    const result: SyncAnticheatCatalogsResult = {
      awacyCount,
      levvvelCount,
      denuvoAntiTamperCount,
      awacyLastSyncedAt,
      levvvelLastSyncedAt,
      denuvoAntiTamperLastSyncedAt,
      levvvelComplete,
      denuvoAntiTamperComplete,
      levvvelError,
      denuvoAntiTamperError,
    }

    const status =
      awacyError || levvvelError || denuvoAntiTamperError ? "partial" : "success"
    await finishRefreshLog(logId, status, buildCatalogSyncMessage(result))
    return result
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Anti-cheat catalog sync failed"
    await finishRefreshLog(logId, "failed", message)
    throw err
  }
}
