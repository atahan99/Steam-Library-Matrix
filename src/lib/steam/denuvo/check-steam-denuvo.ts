import { fetchSteamStorePage } from "@/lib/steam/fetch-steam-store-page"
import { parseStoreDrmNoticesFromHtml } from "@/lib/steam/denuvo/parse-store-drm-notices"
import { scoreDenuvoStatus } from "@/lib/steam/denuvo/score-denuvo-status"
import type {
  CheckSteamDenuvoOptions,
  DenuvoStatus,
} from "@/lib/steam/denuvo/types"

export const checkSteamDenuvo = async (
  appid: number,
  options: CheckSteamDenuvoOptions = {}
): Promise<DenuvoStatus> => {
  const curatorAppids = options.curatorAppids ?? new Set<number>()
  const curatorComplete = options.curatorComplete ?? false
  const fetchStorePage = options.fetchStorePage ?? fetchSteamStorePage
  const checkedAt = new Date().toISOString()

  let html: string | null = null
  let fetchError: string | undefined

  try {
    html = await fetchStorePage(appid)
    if (html === null) {
      fetchError = "Store page fetch failed"
    }
  } catch (err) {
    fetchError =
      err instanceof Error ? err.message : "Store page fetch failed"
  }

  const parsed = html ? parseStoreDrmNoticesFromHtml(html) : undefined

  return scoreDenuvoStatus({
    appid,
    storePage: {
      fetched: true,
      error: fetchError,
      parsed,
    },
    curatorListed: curatorAppids.has(appid),
    curatorComplete,
    checkedAt,
  })
}
