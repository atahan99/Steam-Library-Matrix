import { fetchDenuvoCuratorCatalog } from "@/lib/steam/fetch-denuvo-curator-catalog"
import { DENUVO_CATALOG_FETCH_FAILED_MESSAGE } from "@/lib/scrape/messages"

export type ScrapeDenuvoCuratorResult = {
  appids: number[]
  complete: boolean
  reportedTotal?: number
  error?: string
}

/** Loads Denuvo anti-tamper app IDs via the Steam Store curator AJAX API only. */
export const scrapeDenuvoCuratorCatalog =
  async (): Promise<ScrapeDenuvoCuratorResult> => {
    try {
      const fetched = await fetchDenuvoCuratorCatalog()
      if (fetched.appids.length > 0) {
        return fetched
      }

      return {
        appids: [],
        complete: false,
        reportedTotal: fetched.reportedTotal,
        error: fetched.error ?? DENUVO_CATALOG_FETCH_FAILED_MESSAGE,
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : DENUVO_CATALOG_FETCH_FAILED_MESSAGE
      return { appids: [], complete: false, error: message }
    }
  }
