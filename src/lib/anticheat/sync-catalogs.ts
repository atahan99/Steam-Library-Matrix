import {
  getAnticheatCatalogStats,
  isAnticheatCatalogStale,
  replaceAwacyCatalog,
  replaceLevvvelCatalog,
} from "@/lib/db/anticheat-catalog"
import {
  getDenuvoCatalogStats,
} from "@/lib/db/denuvo-catalog"
import { finishRefreshLog, startRefreshLog } from "@/lib/db/refresh-log"
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

const isAwacyLevvvelFresh = (
  stats: Awaited<ReturnType<typeof getAnticheatCatalogStats>>,
  force?: boolean
): boolean => {
  if (force) return false

  const awacyStale = isAnticheatCatalogStale(stats.awacy.lastSyncedAt)
  const levvvelStale = isAnticheatCatalogStale(stats.levvvel.lastSyncedAt)

  return (
    stats.awacy.rowCount > 0 &&
    !awacyStale &&
    stats.levvvel.rowCount > 0 &&
    !levvvelStale &&
    stats.levvvel.complete
  )
}

const syncAwacyBranch = async (): Promise<{
  awacyCount: number
  awacyLastSyncedAt?: string
  awacyError?: string
}> => {
  const awacyResult = await fetchAwacyGamesRaw()
  if (!awacyResult.entries.length) {
    return {
      awacyCount: 0,
      awacyError:
        awacyResult.error ?? "AWACY games.json returned 0 rows",
    }
  }

  const awacySaved = await replaceAwacyCatalog(awacyResult.entries)
  return {
    awacyCount: awacySaved.count,
    awacyLastSyncedAt: awacySaved.lastSyncedAt,
  }
}

const syncLevvvelBranch = async (): Promise<{
  levvvelCount: number
  levvvelLastSyncedAt?: string
  levvvelComplete: boolean
  levvvelError?: string
}> => {
  const levvvelDataset = await fetchLevvvelKernelGames()
  const levvvelComplete = levvvelDataset.complete
  let levvvelError: string | undefined

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

  return {
    levvvelCount: levvvelSaved.count,
    levvvelLastSyncedAt: levvvelSaved.lastSyncedAt,
    levvvelComplete,
    levvvelError,
  }
}

export const syncAnticheatCatalogs = async (
  steamid: string,
  options?: { force?: boolean }
): Promise<SyncAnticheatCatalogsResult> => {
  const stats = await getAnticheatCatalogStats()
  const denuvoStats = await getDenuvoCatalogStats()

  if (isAwacyLevvvelFresh(stats, options?.force)) {
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

  const awacyStale = isAnticheatCatalogStale(stats.awacy.lastSyncedAt)
  const levvvelStale = isAnticheatCatalogStale(stats.levvvel.lastSyncedAt)
  const needsAwacy =
    Boolean(options?.force) ||
    stats.awacy.rowCount === 0 ||
    awacyStale
  const needsLevvvel =
    Boolean(options?.force) ||
    stats.levvvel.rowCount === 0 ||
    levvvelStale ||
    !stats.levvvel.complete

  let awacyError: string | undefined
  let levvvelError: string | undefined
  let awacyCount = stats.awacy.rowCount
  let levvvelCount = stats.levvvel.rowCount
  let awacyLastSyncedAt = stats.awacy.lastSyncedAt
  let levvvelLastSyncedAt = stats.levvvel.lastSyncedAt
  let levvvelComplete = stats.levvvel.complete

  try {
    const [awacyOutcome, levvvelOutcome] = await Promise.all([
      needsAwacy
        ? syncAwacyBranch()
        : Promise.resolve({
            awacyCount,
            awacyLastSyncedAt,
            awacyError: undefined as string | undefined,
          }),
      needsLevvvel
        ? syncLevvvelBranch()
        : Promise.resolve({
            levvvelCount,
            levvvelLastSyncedAt,
            levvvelComplete,
            levvvelError: stats.levvvel.errorMessage,
          }),
    ])

    awacyCount = awacyOutcome.awacyCount
    awacyLastSyncedAt = awacyOutcome.awacyLastSyncedAt
    awacyError = awacyOutcome.awacyError

    levvvelCount = levvvelOutcome.levvvelCount
    levvvelLastSyncedAt = levvvelOutcome.levvvelLastSyncedAt
    levvvelComplete = levvvelOutcome.levvvelComplete
    levvvelError = levvvelOutcome.levvvelError

    if (awacyError) {
      await finishRefreshLog(logId, "failed", buildCatalogSyncMessage({
        awacyCount: 0,
        levvvelCount: 0,
        denuvoAntiTamperCount: denuvoStats.count,
        levvvelComplete: false,
        denuvoAntiTamperComplete: denuvoStats.complete,
        awacyError,
      }))
      return {
        awacyCount: 0,
        levvvelCount: 0,
        denuvoAntiTamperCount: denuvoStats.count,
        levvvelComplete: false,
        denuvoAntiTamperComplete: denuvoStats.complete,
        awacyError,
      }
    }

    const refreshedDenuvo = await getDenuvoCatalogStats()
    const result: SyncAnticheatCatalogsResult = {
      awacyCount,
      levvvelCount,
      denuvoAntiTamperCount: refreshedDenuvo.count,
      awacyLastSyncedAt,
      levvvelLastSyncedAt,
      denuvoAntiTamperLastSyncedAt: refreshedDenuvo.lastSyncedAt,
      levvvelComplete,
      denuvoAntiTamperComplete: refreshedDenuvo.complete,
      levvvelError,
      denuvoAntiTamperError: refreshedDenuvo.errorMessage,
    }

    const status =
      awacyError || levvvelError || refreshedDenuvo.errorMessage
        ? "partial"
        : "success"
    await finishRefreshLog(logId, status, buildCatalogSyncMessage(result))
    return result
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Anti-cheat catalog sync failed"
    await finishRefreshLog(logId, "failed", message)
    throw err
  }
}
