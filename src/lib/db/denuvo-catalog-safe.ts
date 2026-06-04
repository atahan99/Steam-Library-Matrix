import {
  getDenuvoCatalogStats,
  type DenuvoCatalogStats,
} from "@/lib/db/denuvo-catalog"
import {
  DENUVO_CATALOG_MIGRATION_HINT,
  formatDbError,
  isMissingCatalogTableError,
} from "@/lib/db/catalog-table-error"

const emptyStats = (errorMessage?: string): DenuvoCatalogStats => ({
  count: 0,
  complete: false,
  errorMessage,
})

export const getDenuvoCatalogStatsSafe = async (): Promise<DenuvoCatalogStats> => {
  try {
    return await getDenuvoCatalogStats()
  } catch (error) {
    if (isMissingCatalogTableError(error)) {
      return emptyStats(DENUVO_CATALOG_MIGRATION_HINT)
    }
    console.error(
      "[denuvo-catalog] load stats failed",
      formatDbError(error)
    )
    return emptyStats()
  }
}
