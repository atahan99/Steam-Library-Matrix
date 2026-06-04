import {
  getAnticheatCatalogStats,
  isAnticheatCatalogReady,
  loadAnticheatCatalogIndexes,
  type AnticheatCatalogStats,
} from "@/lib/db/anticheat-catalog"
import {
  ANTICHEAT_CATALOG_MIGRATION_HINT,
  formatDbError,
  isMissingCatalogTableError,
} from "@/lib/db/catalog-table-error"
import type {
  AwacyIndexes,
  LevvvelIndexes,
} from "@/lib/anticheat/anticheat-indexes"
import { indexAwacyEntries, indexLevvvelRows } from "@/lib/anticheat/anticheat-indexes"

export type AnticheatCatalogStatsSafe = AnticheatCatalogStats & {
  setupError?: string
}

const emptyStats = (setupError?: string): AnticheatCatalogStatsSafe => ({
  awacy: { source: "awacy", rowCount: 0, complete: false },
  levvvel: { source: "levvvel", rowCount: 0, complete: false },
  setupError,
})

const emptyIndexes = (): { awacy: AwacyIndexes; levvvel: LevvvelIndexes } => ({
  awacy: indexAwacyEntries([]),
  levvvel: indexLevvvelRows([], false),
})

export const getAnticheatCatalogStatsSafe =
  async (): Promise<AnticheatCatalogStatsSafe> => {
    try {
      return await getAnticheatCatalogStats()
    } catch (error) {
      if (isMissingCatalogTableError(error)) {
        return emptyStats(ANTICHEAT_CATALOG_MIGRATION_HINT)
      }
      console.error(
        "[anticheat-catalog] load stats failed",
        formatDbError(error)
      )
      return emptyStats()
    }
  }

export const isAnticheatCatalogReadySafe = async (): Promise<{
  ready: boolean
  awacyCount: number
  levvvelCount: number
  error?: string
}> => {
  try {
    return await isAnticheatCatalogReady()
  } catch (error) {
    if (isMissingCatalogTableError(error)) {
      return {
        ready: false,
        awacyCount: 0,
        levvvelCount: 0,
        error: ANTICHEAT_CATALOG_MIGRATION_HINT,
      }
    }
    console.error(
      "[anticheat-catalog] readiness check failed",
      formatDbError(error)
    )
    return {
      ready: false,
      awacyCount: 0,
      levvvelCount: 0,
      error: "Anti-cheat catalog could not be loaded",
    }
  }
}

export const loadAnticheatCatalogIndexesSafe = async (): Promise<{
  awacy: AwacyIndexes
  levvvel: LevvvelIndexes
}> => {
  try {
    return await loadAnticheatCatalogIndexes()
  } catch (error) {
    if (!isMissingCatalogTableError(error)) {
      console.error(
        "[anticheat-catalog] load indexes failed",
        formatDbError(error)
      )
    }
    return emptyIndexes()
  }
}
