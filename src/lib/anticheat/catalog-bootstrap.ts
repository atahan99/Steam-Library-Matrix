import { getAnticheatCatalogStatsSafe } from "@/lib/db/anticheat-catalog-safe"
import { getDenuvoCatalogStatsSafe } from "@/lib/db/denuvo-catalog-safe"
import {
  syncAnticheatCatalogs,
  type SyncAnticheatCatalogsResult,
} from "@/lib/anticheat/sync-catalogs"
import {
  syncDenuvoCatalogOnly,
  type SyncDenuvoCatalogResult,
} from "@/lib/anticheat/sync-denuvo-catalog"

/** Refresh logs for global catalog sync (not tied to a user profile). */
export const GLOBAL_CATALOG_STEAMID = "00000000000000000"

export const needsAnticheatCatalogBootstrap = (stats: {
  awacy: { rowCount: number }
  levvvel: { rowCount: number; complete: boolean }
  denuvo?: { count: number; complete: boolean }
}): boolean => {
  if (stats.awacy.rowCount === 0 || stats.levvvel.rowCount === 0) {
    return true
  }
  if (!stats.levvvel.complete) return true
  if (stats.denuvo && (stats.denuvo.count === 0 || !stats.denuvo.complete)) {
    return true
  }
  return false
}

export const shouldBootstrapAnticheatCatalogs = async (): Promise<boolean> => {
  if (process.env.SLM_SKIP_CATALOG_BOOTSTRAP === "true") return false

  const stats = await getAnticheatCatalogStatsSafe()
  if (stats.setupError) return false

  const denuvoStats = await getDenuvoCatalogStatsSafe()

  return needsAnticheatCatalogBootstrap({
    awacy: stats.awacy,
    levvvel: stats.levvvel,
    denuvo: denuvoStats,
  })
}

export type CatalogBootstrapOutcome =
  | { status: "skipped" }
  | { status: "synced"; result: SyncAnticheatCatalogsResult; denuvo?: SyncDenuvoCatalogResult }
  | { status: "already_fresh"; result: SyncAnticheatCatalogsResult; denuvo?: SyncDenuvoCatalogResult }

export const bootstrapAnticheatCatalogsIfNeeded =
  async (): Promise<CatalogBootstrapOutcome> => {
    if (!(await shouldBootstrapAnticheatCatalogs())) {
      return { status: "skipped" }
    }

    console.log(
      "[catalog-bootstrap] syncing global AWACY / Levvvel / Denuvo catalogs…"
    )

    const [result, denuvoResult] = await Promise.all([
      syncAnticheatCatalogs(GLOBAL_CATALOG_STEAMID, { force: false }),
      syncDenuvoCatalogOnly(GLOBAL_CATALOG_STEAMID, { force: false }),
    ])

    if (result.skipped && denuvoResult.skipped) {
      console.log("[catalog-bootstrap] catalogs already fresh")
      return { status: "already_fresh", result, denuvo: denuvoResult }
    }

    console.log(
      `[catalog-bootstrap] awacy=${result.awacyCount} levvvel=${result.levvvelCount} denuvo=${denuvoResult.denuvoAntiTamperCount}`
    )

    if (result.awacyError) {
      console.error("[catalog-bootstrap] AWACY error:", result.awacyError)
    }
    if (result.levvvelError) {
      console.error("[catalog-bootstrap] Levvvel error:", result.levvvelError)
    }
    if (denuvoResult.denuvoAntiTamperError) {
      console.error(
        "[catalog-bootstrap] Denuvo error:",
        denuvoResult.denuvoAntiTamperError
      )
    }

    return { status: "synced", result, denuvo: denuvoResult }
  }
