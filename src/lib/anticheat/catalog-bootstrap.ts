import { getAnticheatCatalogStatsSafe } from "@/lib/db/anticheat-catalog-safe"
import {
  syncAnticheatCatalogs,
  type SyncAnticheatCatalogsResult,
} from "@/lib/anticheat/sync-catalogs"

/** Refresh logs for global catalog sync (not tied to a user profile). */
export const GLOBAL_CATALOG_STEAMID = "00000000000000000"

export const needsAnticheatCatalogBootstrap = (stats: {
  awacy: { rowCount: number }
  levvvel: { rowCount: number }
}): boolean => stats.awacy.rowCount === 0 || stats.levvvel.rowCount === 0

export const shouldBootstrapAnticheatCatalogs = async (): Promise<boolean> => {
  if (process.env.SLM_SKIP_CATALOG_BOOTSTRAP === "true") return false

  const stats = await getAnticheatCatalogStatsSafe()
  if (stats.setupError) return false

  return needsAnticheatCatalogBootstrap(stats)
}

export type CatalogBootstrapOutcome =
  | { status: "skipped" }
  | { status: "synced"; result: SyncAnticheatCatalogsResult }
  | { status: "already_fresh"; result: SyncAnticheatCatalogsResult }

export const bootstrapAnticheatCatalogsIfNeeded =
  async (): Promise<CatalogBootstrapOutcome> => {
    if (!(await shouldBootstrapAnticheatCatalogs())) {
      return { status: "skipped" }
    }

    console.log(
      "[catalog-bootstrap] syncing global AWACY / Levvvel / Denuvo catalogs…"
    )

    const result = await syncAnticheatCatalogs(GLOBAL_CATALOG_STEAMID, {
      force: false,
    })

    if (result.skipped) {
      console.log("[catalog-bootstrap] catalogs already fresh")
      return { status: "already_fresh", result }
    }

    console.log(
      `[catalog-bootstrap] awacy=${result.awacyCount} levvvel=${result.levvvelCount} denuvo=${result.denuvoAntiTamperCount}`
    )

    if (result.awacyError) {
      console.error("[catalog-bootstrap] AWACY error:", result.awacyError)
    }
    if (result.levvvelError) {
      console.error("[catalog-bootstrap] Levvvel error:", result.levvvelError)
    }
    if (result.denuvoAntiTamperError) {
      console.error(
        "[catalog-bootstrap] Denuvo error:",
        result.denuvoAntiTamperError
      )
    }

    return { status: "synced", result }
  }
